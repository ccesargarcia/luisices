import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { SharedAccess, SharedResourceType } from '../app/types';

class FirebaseSharedAccessService {
  private collectionName = 'sharedAccess';

  /**
   * Compartilha recursos com outro usuário
   */
  async shareAccess(
    grantedToEmail: string,
    resources: SharedResourceType[],
    expiresAt?: string
  ): Promise<SharedAccess> {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    // Buscar dados do usuário que receberá o acesso pelo email
    const usersRef = collection(db, 'userProfiles');
    const q = query(usersRef, where('email', '==', grantedToEmail.toLowerCase().trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Usuário não encontrado com este email');
    }

    const grantedToUser = snapshot.docs[0];
    const grantedToUserId = grantedToUser.id;

    // Não pode compartilhar consigo mesmo
    if (grantedToUserId === user.uid) {
      throw new Error('Você não pode compartilhar acesso consigo mesmo');
    }

    // Buscar nome do usuário logado
    const currentUserProfile = await getDoc(doc(db, 'userProfiles', user.uid));
    const ownerName = currentUserProfile.data()?.displayName || user.email || 'Usuário';

    const sharedAccessData = {
      ownerId: user.uid,
      ownerEmail: user.email || '',
      ownerName,
      grantedToUserId,
      grantedToEmail: grantedToEmail.toLowerCase().trim(),
      resources,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      active: true,
      userId: user.uid, // Para as regras do Firestore
    };

    const docRef = await addDoc(
      collection(db, this.collectionName),
      sharedAccessData
    );

    return {
      id: docRef.id,
      ...sharedAccessData,
    } as SharedAccess;
  }

  /**
   * Lista todos os compartilhamentos que o usuário atual criou
   */
  async getMySharedAccess(): Promise<SharedAccess[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const q = query(
      collection(db, this.collectionName),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SharedAccess[];
  }

  /**
   * Lista todos os compartilhamentos que outros usuários fizeram com o usuário atual
   */
  async getSharedWithMe(): Promise<SharedAccess[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const q = query(
      collection(db, this.collectionName),
      where('grantedToUserId', '==', user.uid),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const now = new Date();

    // Filtrar compartilhamentos expirados
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }) as SharedAccess)
      .filter(access => {
        if (!access.expiresAt) return true;
        return new Date(access.expiresAt) > now;
      });
  }

  /**
   * Obtém lista de userIds que compartilharam recursos comigo
   * Útil para queries que precisam buscar dados de múltiplos usuários
   */
  async getUsersWhoSharedWithMe(resourceType: SharedResourceType): Promise<string[]> {
    const sharedWithMe = await this.getSharedWithMe();
    
    return sharedWithMe
      .filter(access => access.resources.includes(resourceType))
      .map(access => access.ownerId);
  }

  /**
   * Atualiza um compartilhamento existente
   */
  async updateSharedAccess(
    id: string,
    updates: {
      resources?: SharedResourceType[];
      expiresAt?: string | null;
      active?: boolean;
    }
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se o usuário é o dono do compartilhamento
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Compartilhamento não encontrado');
    }

    if (docSnap.data().ownerId !== user.uid) {
      throw new Error('Você não tem permissão para modificar este compartilhamento');
    }

    await updateDoc(docRef, updates);
  }

  /**
   * Remove um compartilhamento
   */
  async revokeSharedAccess(id: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se o usuário é o dono do compartilhamento
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Compartilhamento não encontrado');
    }

    if (docSnap.data().ownerId !== user.uid) {
      throw new Error('Você não tem permissão para remover este compartilhamento');
    }

    await deleteDoc(docRef);
  }

  /**
   * Verifica se o usuário atual tem acesso a um recurso de outro usuário
   */
  async hasAccessToResource(ownerId: string, resourceType: SharedResourceType): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    // Se é o próprio usuário, sempre tem acesso
    if (ownerId === user.uid) return true;

    const q = query(
      collection(db, this.collectionName),
      where('ownerId', '==', ownerId),
      where('grantedToUserId', '==', user.uid),
      where('active', '==', true)
    );

    const snapshot = await getDocs(q);
    const now = new Date();

    return snapshot.docs.some(doc => {
      const data = doc.data() as SharedAccess;
      
      // Verificar se não expirou
      if (data.expiresAt && new Date(data.expiresAt) <= now) {
        return false;
      }

      // Verificar se tem acesso ao recurso específico
      return data.resources.includes(resourceType);
    });
  }
}

export const firebaseSharedAccessService = new FirebaseSharedAccessService();
