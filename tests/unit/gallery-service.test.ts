import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firebaseGalleryService } from '../../src/services/firebaseGalleryService';
import {
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth } from '../../src/lib/firebase';
import { firebaseStorageService } from '../../src/services/firebaseStorageService';
import { resolveGalleryImageUrl } from '../../src/services/firebaseGalleryImageService';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ path: name })),
  doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id })),
  addDoc: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((...args) => ({ args })),
  where: vi.fn((field, op, val) => ({ field, op, val })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  limit: vi.fn((count) => ({ count })),
  startAfter: vi.fn((cursor) => ({ cursor })),
  Timestamp: {
    now: vi.fn(() => ({
      toDate: () => new Date('2026-10-01T12:00:00Z'),
    })),
  },
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  storage: {},
  functions: {},
  auth: {
    currentUser: null,
  },
}));

vi.mock('../../src/services/firebaseStorageService', () => ({
  firebaseStorageService: {
    uploadGalleryImage: vi.fn().mockResolvedValue('https://storage.googleapis.com/art.png'),
    deleteImage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/services/firebaseGalleryImageService', () => ({
  resolveGalleryImageUrl: vi.fn(async (url: string) => `https://cdn.luisices.com.br/${url}`),
}));

describe('Funcionalidade: Galeria de Mídias e Portfólio (firebaseGalleryService)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).currentUser = { uid: 'user-owner' };
  });

  describe('1. Listagem de Itens (getItems)', () => {
    it('deve listar apenas itens do próprio usuário quando não for admin e ignorar excluídos', async () => {
      const mockDocs = [
        {
          id: 'item-1',
          data: () => ({
            userId: 'user-owner',
            title: 'Topo de Bolo Shaker',
            imageUrl: 'art1.png',
            createdAt: { toDate: () => new Date('2026-10-01T10:00:00Z') },
            tags: ['Topo de Bolo', 'Shaker'],
          }),
        },
        {
          id: 'item-2',
          data: () => ({
            userId: 'user-owner',
            title: 'Item Excluído',
            imageUrl: 'art2.png',
            createdAt: { toDate: () => new Date('2026-10-01T09:00:00Z') },
            deletedAt: { toDate: () => new Date('2026-10-01T11:00:00Z') },
          }),
        },
      ];

      (getDocs as any).mockResolvedValueOnce({ docs: mockDocs });

      const items = await firebaseGalleryService.getItems('user-owner', false);

      expect(where).toHaveBeenCalledWith('userId', '==', 'user-owner');
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-1');
      expect(items[0].title).toBe('Topo de Bolo Shaker');
      expect(items[0].imageUrl).toBe('https://cdn.luisices.com.br/art1.png');
    });

    it('deve consultar toda a coleção sem filtro de userId quando for admin', async () => {
      (getDocs as any).mockResolvedValueOnce({
        docs: [
          {
            id: 'item-admin-view',
            data: () => ({
              userId: 'other-user',
              title: 'Lembrancinha Maternidade',
              imageUrl: 'art3.png',
              createdAt: { toDate: () => new Date('2026-10-01T10:00:00Z') },
            }),
          },
        ],
      });

      const items = await firebaseGalleryService.getItems('user-owner', true);

      expect(where).not.toHaveBeenCalled();
      expect(items).toHaveLength(1);
      expect(items[0].userId).toBe('other-user');
    });
  });

  describe('Paginação da galeria por cliente', () => {
    it('usa o último documento como cursor e resolve somente os itens ativos', async () => {
      const active = { id: 'active', data: () => ({ userId: 'user-owner', customerId: 'cust', imageUrl: 'active.png', createdAt: { toDate: () => new Date() } }) };
      const deleted = { id: 'deleted', data: () => ({ deletedAt: true }) };
      (getDocs as any).mockResolvedValueOnce({ docs: [active, deleted] });
      const page = await firebaseGalleryService.getCustomerPage('user-owner', 'cust', 2);
      expect(page.cursor).toBe(deleted);
      expect(page.hasMore).toBe(true);
      expect(page.items).toHaveLength(1);
      expect(resolveGalleryImageUrl).toHaveBeenCalledTimes(1);
      (getDocs as any).mockResolvedValueOnce({ docs: [] });
      const next = await firebaseGalleryService.getCustomerPage('user-owner', 'cust', 2, page.cursor);
      expect(startAfter).toHaveBeenCalledWith(deleted);
      expect(next.hasMore).toBe(false);
    });
    it('continua páginas compostas apenas por itens excluídos', async () => {
      const deleted = { id: 'deleted', data: () => ({ deletedAt: true }) };
      (getDocs as any).mockResolvedValueOnce({ docs: [deleted] });
      const page = await firebaseGalleryService.getCustomerPage('user-owner', 'cust', 1);
      expect(page.items).toEqual([]);
      expect(page.hasMore).toBe(true);
      expect(page.cursor).toBe(deleted);
      expect(resolveGalleryImageUrl).not.toHaveBeenCalled();
    });
    it.each([0, -1, 101, 1.5])('rejeita tamanho inválido %s sem consultar', async (size) => {
      await expect(firebaseGalleryService.getCustomerPage('user-owner', 'cust', size)).rejects.toThrow('tamanho da página');
      expect(getDocs).not.toHaveBeenCalled();
    });
  });

  describe('1.1. Listagem Direcionada por Cliente (getItemsByCustomer)', () => {
    it('deve buscar apenas artes associadas ao customerId especificado e ignorar itens excluídos logicamente', async () => {
      const mockDocs = [
        {
          id: 'item-cust-1',
          data: () => ({
            userId: 'user-owner',
            customerId: 'cust-123',
            title: 'Convite Personalizado Jardim',
            imageUrl: 'art1.png',
            deletedAt: null,
            createdAt: { toDate: () => new Date('2026-10-02T10:00:00Z') },
          }),
        },
        {
          id: 'item-cust-del',
          data: () => ({
            userId: 'user-owner',
            customerId: 'cust-123',
            title: 'Arte Deletada',
            imageUrl: 'art2.png',
            deletedAt: { toDate: () => new Date('2026-10-02T11:00:00Z') },
            createdAt: { toDate: () => new Date('2026-10-01T10:00:00Z') },
          }),
        },
      ];

      (getDocs as any).mockResolvedValueOnce({ docs: mockDocs });

      const items = await firebaseGalleryService.getItemsByCustomer('user-owner', 'cust-123');

      expect(where).toHaveBeenCalledWith('userId', '==', 'user-owner');
      expect(where).toHaveBeenCalledWith('customerId', '==', 'cust-123');
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-cust-1');
      expect(items[0].title).toBe('Convite Personalizado Jardim');
    });

    it('deve retornar array vazio se userId ou customerId forem vazios', async () => {
      const res1 = await firebaseGalleryService.getItemsByCustomer('', 'cust-123');
      const res2 = await firebaseGalleryService.getItemsByCustomer('user-owner', '');
      expect(res1).toEqual([]);
      expect(res2).toEqual([]);
      expect(getDocs).not.toHaveBeenCalled();
    });

    it('deve ordenar os itens por data decrescente e respeitar limitCount', async () => {
      const mockDocs = [
        {
          id: 'item-old',
          data: () => ({
            userId: 'user-owner',
            customerId: 'cust-123',
            title: 'Arte Antiga',
            imageUrl: 'art-old.png',
            createdAt: { toDate: () => new Date('2026-09-01T10:00:00Z') },
          }),
        },
        {
          id: 'item-new',
          data: () => ({
            userId: 'user-owner',
            customerId: 'cust-123',
            title: 'Arte Nova',
            imageUrl: 'art-new.png',
            createdAt: { toDate: () => new Date('2026-10-05T10:00:00Z') },
          }),
        },
      ];

      // O Firestore aplica ordenação e limite antes de devolver a página.
      (getDocs as any).mockResolvedValueOnce({ docs: [mockDocs[1]] });

      const items = await firebaseGalleryService.getItemsByCustomer('user-owner', 'cust-123', 1);
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(limit).toHaveBeenCalledWith(1);

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('item-new');
      expect(items[0].title).toBe('Arte Nova');
    });
  });

  describe('2. Criação de Itens (createItem)', () => {
    it('deve cadastrar um novo item na galeria com timestamp e deletedAt nulo', async () => {
      (addDoc as any).mockResolvedValueOnce({ id: 'generated-gallery-id' });

      const newItem = await firebaseGalleryService.createItem('user-owner', {
        title: 'Caixa Milk Batizado',
        description: 'Papel Offset 240g com laço de cetim',
        imageUrl: 'https://cdn.luisices.com.br/art4.png',
        customerName: 'Mariana Silva',
        tags: ['Batizado', 'Caixa Milk'],
      });

      expect(addDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'gallery' }),
        expect.objectContaining({
          userId: 'user-owner',
          title: 'Caixa Milk Batizado',
          deletedAt: null,
          tags: ['Batizado', 'Caixa Milk'],
        })
      );
      expect(newItem.id).toBe('generated-gallery-id');
      expect(newItem.title).toBe('Caixa Milk Batizado');
    });
  });

  describe('3. Edição e Exclusão com Controle de Acesso RBAC (canModifyItem)', () => {
    it('deve permitir que o próprio proprietário atualize o item', async () => {
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'user-owner' }),
      });

      await firebaseGalleryService.updateItem('item-1', {
        title: 'Título Atualizado',
      });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'gallery/item-1' }),
        { title: 'Título Atualizado' }
      );
    });

    it('deve permitir que um administrador modifique item pertencente a outro usuário', async () => {
      (auth as any).currentUser = { uid: 'admin-user' };

      // 1º getDoc: busca o item da galeria
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'other-user' }),
      });
      // 2º getDoc: busca o perfil do usuário atual no userProfiles
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'admin' }),
      });

      await firebaseGalleryService.updateItem('item-1', {
        title: 'Admin Editou',
      });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'gallery/item-1' }),
        { title: 'Admin Editou' }
      );
    });

    it('deve impedir que outro usuário comum edite o item alheio', async () => {
      (auth as any).currentUser = { uid: 'unauthorized-user' };

      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'other-user' }),
      });
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'user' }),
      });

      await expect(
        firebaseGalleryService.updateItem('item-1', { title: 'Tentativa Hacker' })
      ).rejects.toThrow('Você não tem permissão para editar este item');
    });

    it('deleteItem deve realizar exclusão lógica (soft delete) adicionando deletedAt', async () => {
      (auth as any).currentUser = { uid: 'user-owner' };

      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'user-owner' }),
      });

      await firebaseGalleryService.deleteItem('item-1');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'gallery/item-1' }),
        expect.objectContaining({
          deletedAt: expect.anything(),
        })
      );
    });

    it('deve disparar erro se o usuário não estiver autenticado', async () => {
      (auth as any).currentUser = null;

      await expect(
        firebaseGalleryService.deleteItem('item-1')
      ).rejects.toThrow('É necessário estar autenticado para realizar esta operação');
    });
  });

  describe('4. Integração com IA Vision (enrichItemWithAi)', () => {
    it('deve chamar a Cloud Function enrichGalleryItemWithAi e retornar descrição e tags sugeridas', async () => {
      const mockCallable = vi.fn().mockResolvedValueOnce({
        data: {
          success: true,
          aiDescription: 'Arte personalizada de aniversário no tema Safari aquarelado',
          productType: 'Convite Digital',
          colors: ['#2D5A27', '#E5A65E'],
          suggestedTags: ['Safari', 'Aquarela', 'Convite'],
        },
      });

      (httpsCallable as any).mockReturnValueOnce(mockCallable);

      const result = await firebaseGalleryService.enrichItemWithAi('item-safari');

      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'enrichGalleryItemWithAi');
      expect(mockCallable).toHaveBeenCalledWith({ itemId: 'item-safari' });
      expect(result.productType).toBe('Convite Digital');
      expect(result.suggestedTags).toContain('Safari');
    });
  });
});
