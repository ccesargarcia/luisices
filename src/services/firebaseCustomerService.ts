import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer } from '../app/types';

export const firebaseCustomerService = {
  /**
   * Criar novo cliente
   */
  async createCustomer(userId: string, customerData: Omit<Customer, 'id' | 'createdAt' | 'userId' | 'totalOrders' | 'totalSpent'>): Promise<string> {
    const customersRef = collection(db, 'customers');

    // Remover campos undefined (Firestore não aceita undefined)
    const cleanData: any = {
      name: customerData.name,
      phone: customerData.phone,
      userId,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      totalSpent: 0,
    };

    // Adicionar campos opcionais apenas se tiverem valor
    if (customerData.email) cleanData.email = customerData.email;
    if (customerData.street) cleanData.street = customerData.street;
    if (customerData.city) cleanData.city = customerData.city;
    if (customerData.state) cleanData.state = customerData.state;
    if (customerData.zipCode) cleanData.zipCode = customerData.zipCode;
    if (customerData.country) cleanData.country = customerData.country;
    if (customerData.notes) cleanData.notes = customerData.notes;

    const docRef = await addDoc(customersRef, cleanData);
    return docRef.id;
  },

  /**
   * Buscar todos os clientes do usuário
   */
  async getCustomers(userId: string): Promise<Customer[]> {
    const customersRef = collection(db, 'customers');
    const q = query(
      customersRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Customer));
  },

  /**
   * Buscar cliente por ID
   */
  async getCustomerById(customerId: string): Promise<Customer | null> {
    const customerRef = doc(db, 'customers', customerId);
    const customerDoc = await getDocs(query(collection(db, 'customers'), where('__name__', '==', customerId)));

    if (customerDoc.empty) return null;

    const data = customerDoc.docs[0].data();
    return {
      id: customerDoc.docs[0].id,
      ...data,
    } as Customer;
  },

  /**
   * Atualizar dados do cliente
   */
  async updateCustomer(customerId: string, updates: Partial<Omit<Customer, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    const customerRef = doc(db, 'customers', customerId);

    // Remover campos undefined antes de atualizar
    const cleanUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });

    if (Object.keys(cleanUpdates).length > 0) {
      await updateDoc(customerRef, cleanUpdates);
    }
  },

  /**
   * Deletar cliente
   */
  async deleteCustomer(customerId: string): Promise<void> {
    const customerRef = doc(db, 'customers', customerId);
    await deleteDoc(customerRef);
  },

  /**
   * Incrementar estatísticas do cliente (ao criar pedido)
   */
  async incrementCustomerStats(customerId: string, orderValue: number = 0): Promise<void> {
    const customerRef = doc(db, 'customers', customerId);
    await updateDoc(customerRef, {
      totalOrders: increment(1),
      totalSpent: increment(orderValue),
    });
  },

  /**
   * Decrementar estatísticas do cliente (ao deletar pedido)
   */
  async decrementCustomerStats(customerId: string, orderValue: number = 0): Promise<void> {
    const customerRef = doc(db, 'customers', customerId);
    await updateDoc(customerRef, {
      totalOrders: increment(-1),
      totalSpent: increment(-orderValue),
    });
  },

  /**
   * Buscar clientes com mais pedidos (top clientes)
   */
  async getTopCustomers(userId: string, limit: number = 10): Promise<Customer[]> {
    const customersRef = collection(db, 'customers');
    const q = query(
      customersRef,
      where('userId', '==', userId),
      orderBy('totalSpent', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Customer));
  },

  /**
   * Buscar cliente por telefone
   */
  async findCustomerByPhone(userId: string, phone: string): Promise<Customer | null> {
    const customersRef = collection(db, 'customers');
    const q = query(
      customersRef,
      where('userId', '==', userId),
      where('phone', '==', phone)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Customer;
  },
};
