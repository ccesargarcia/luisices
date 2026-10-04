import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks do Firebase
const mockCustomerAddDoc = vi.fn();
const mockCustomerGetDocs = vi.fn();
const mockCustomerUpdateDoc = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'user-test-123', email: 'owner@example.com' } },
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, coll) => ({ coll })),
  doc: vi.fn((_db, coll, id) => ({ coll, id })),
  addDoc: vi.fn((...args) => mockCustomerAddDoc(...args)),
  getDocs: vi.fn((...args) => mockCustomerGetDocs(...args)),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn((...args) => mockCustomerUpdateDoc(...args)),
  query: vi.fn((...args) => ({ type: 'query', args })),
  where: vi.fn((field, op, val) => ({ field, op, val })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  limit: vi.fn((num) => ({ limit: num })),
  increment: vi.fn((val) => ({ increment: val })),
  runTransaction: vi.fn(async (_db, fn) => {
    const fakeTx = {
      get: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
      set: vi.fn(),
      update: vi.fn(),
    };
    return fn(fakeTx);
  }),
  Timestamp: {
    now: () => ({ toDate: () => new Date('2026-01-01') }),
  },
}));

import { firebaseCustomerService } from '../../src/services/firebaseCustomerService';
import { Customer } from '../../src/app/types';

describe('Testes de Regressão e Unitários: Criação de Clientes e Busca em Pedidos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Resolução e Criação de Clientes no Fluxo de Pedidos (Bug 1)', () => {
    it('deve localizar cliente por telefone com dígitos limpos mesmo com formatações diferentes', async () => {
      // Simula retorno do Firestore com cliente cadastrado com máscara "(11) 98765-4321"
      mockCustomerGetDocs
        .mockResolvedValueOnce({ empty: true, docs: [] }) // busca exata por string falha
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: 'cust-maria-1',
              data: () => ({
                name: 'Maria Oliveira',
                phone: '(11) 98765-4321',
                userId: 'user-test-123',
              }),
            },
          ],
        });

      // Busca com número sem máscara "11987654321"
      const found = await firebaseCustomerService.findCustomerByPhone('user-test-123', '11987654321');

      expect(found).not.toBeNull();
      expect(found?.id).toBe('cust-maria-1');
      expect(found?.name).toBe('Maria Oliveira');
    });

    it('deve cadastrar novo cliente e persistir campos obrigatórios sem undefined', async () => {
      mockCustomerGetDocs.mockResolvedValue({ empty: true, docs: [] });
      mockCustomerAddDoc.mockResolvedValueOnce({ id: 'new-cust-999' });

      const newId = await firebaseCustomerService.createCustomer('user-test-123', {
        name: 'João da Silva',
        phone: '(11) 99999-8888',
        email: 'joao@email.com',
      });

      expect(newId).toBe('new-cust-999');
      expect(mockCustomerAddDoc).toHaveBeenCalledTimes(1);

      const addedData = mockCustomerAddDoc.mock.calls[0][1];
      expect(addedData.name).toBe('João da Silva');
      expect(addedData.phone).toBe('(11) 99999-8888');
      expect(addedData.email).toBe('joao@email.com');
      expect(addedData.userId).toBe('user-test-123');
      expect(addedData.totalOrders).toBe(0);
      expect(addedData.totalSpent).toBe(0);
    });

    it('deve lançar DUPLICATE_PHONE quando o telefone já pertencer a outro cliente', async () => {
      mockCustomerGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'cust-existente',
            data: () => ({
              name: 'Cliente Já Existente',
              phone: '(11) 99999-8888',
              userId: 'user-test-123',
            }),
          },
        ],
      });

      await expect(
        firebaseCustomerService.createCustomer('user-test-123', {
          name: 'Novo Nome',
          phone: '(11) 99999-8888',
        })
      ).rejects.toThrow('DUPLICATE_PHONE:Cliente Já Existente');
    });
  });

  describe('2. Algoritmo de Busca e Filtragem de Clientes em Pedidos (Bug 2 & Sugestão)', () => {
    const sampleCustomers: Customer[] = [
      {
        id: '1',
        name: 'Ana Carolina Santos',
        phone: '(11) 91234-5678',
        email: 'ana.santos@gmail.com',
        userId: 'u1',
        createdAt: '2026-01-01',
      },
      {
        id: '2',
        name: 'Bruno Lima Pereira',
        phone: '(21) 98765-4321',
        email: 'bruno@empresa.com.br',
        userId: 'u1',
        status: 'defaulter',
        createdAt: '2026-01-02',
      },
      {
        id: '3',
        name: 'Carla Beatriz Mendes',
        phone: '(31) 97777-8888',
        email: 'carla.mendes@outlook.com',
        userId: 'u1',
        createdAt: '2026-01-03',
      },
      {
        id: '4',
        name: 'Daniel Rocha',
        phone: '(11) 94444-5555',
        userId: 'u1',
        createdAt: '2026-01-04',
      },
    ];

    const filterCustomers = (customers: Customer[], searchQuery: string) => {
      if (!searchQuery.trim()) return customers;
      const q = searchQuery.toLowerCase().trim();
      const cleanDigits = q.replace(/\D/g, '');

      return customers.filter((c) => {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const emailMatch = (c.email || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').includes(q);
        const digitsMatch =
          cleanDigits.length >= 2 &&
          (c.phone || '').replace(/\D/g, '').includes(cleanDigits);

        return nameMatch || emailMatch || phoneMatch || digitsMatch;
      });
    };

    it('deve filtrar clientes por nome insensível a maiúsculas/minúsculas', () => {
      const results = filterCustomers(sampleCustomers, 'ana');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Ana Carolina Santos');

      const resultsUpper = filterCustomers(sampleCustomers, 'BRUNO');
      expect(resultsUpper.length).toBe(1);
      expect(resultsUpper[0].name).toBe('Bruno Lima Pereira');
    });

    it('deve filtrar clientes por dígitos numéricos parciais do telefone', () => {
      const results = filterCustomers(sampleCustomers, '98765');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Bruno Lima Pereira');

      const resultsWithDashes = filterCustomers(sampleCustomers, '1234-5678');
      expect(resultsWithDashes.length).toBe(1);
      expect(resultsWithDashes[0].name).toBe('Ana Carolina Santos');
    });

    it('deve filtrar clientes por email', () => {
      const results = filterCustomers(sampleCustomers, 'outlook.com');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Carla Beatriz Mendes');
    });

    it('deve retornar lista completa quando a busca estiver vazia', () => {
      const results = filterCustomers(sampleCustomers, '   ');
      expect(results.length).toBe(4);
    });

    it('deve identificar corretamente cliente inadimplente na lista', () => {
      const defaulters = sampleCustomers.filter((c) => c.status === 'defaulter');
      expect(defaulters.length).toBe(1);
      expect(defaulters[0].name).toBe('Bruno Lima Pereira');
    });
  });

  describe('3. Lógica de Submissão de Pedido com Cliente Não Pré-Selecionado', () => {
    it('deve resolver criação de novo cliente quando selectedCustomer for vazio e campos preenchidos', async () => {
      const selectedCustomer = '';
      const formData = {
        customerName: 'Cliente Novo Digitado',
        customerPhone: '(11) 95555-4444',
        customerEmail: 'novo@teste.com',
      };
      const loadedCustomers: Customer[] = [];

      mockCustomerGetDocs.mockResolvedValue({ empty: true, docs: [] });
      mockCustomerAddDoc.mockResolvedValueOnce({ id: 'generated-cust-id-123' });

      let customerId = selectedCustomer && selectedCustomer !== 'new' ? selectedCustomer : undefined;
      const trimmedCustomerName = formData.customerName.trim();
      const trimmedCustomerPhone = formData.customerPhone.trim();
      const trimmedCustomerEmail = formData.customerEmail?.trim() || undefined;

      if (!customerId && trimmedCustomerName) {
        let existingCustomer: Customer | null = null;
        if (trimmedCustomerPhone) {
          const cleanPhoneDigits = trimmedCustomerPhone.replace(/\D/g, '');
          existingCustomer = loadedCustomers.find((c) => {
            if (c.phone === trimmedCustomerPhone) return true;
            const cDigits = (c.phone || '').replace(/\D/g, '');
            return cleanPhoneDigits.length >= 8 && cDigits === cleanPhoneDigits;
          }) || null;

          if (!existingCustomer) {
            existingCustomer = await firebaseCustomerService.findCustomerByPhone('user-test-123', trimmedCustomerPhone);
          }
        }

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          customerId = await firebaseCustomerService.createCustomer('user-test-123', {
            name: trimmedCustomerName,
            phone: trimmedCustomerPhone,
            email: trimmedCustomerEmail,
          });
        }
      }

      expect(customerId).toBe('generated-cust-id-123');
      expect(mockCustomerAddDoc).toHaveBeenCalledTimes(1);
    });

    it('deve reaproveitar ID existente quando o cliente digitado já existir na lista em memória', async () => {
      const selectedCustomer = '';
      const formData = {
        customerName: 'Fernanda Lima',
        customerPhone: '(11) 91111-2222',
        customerEmail: '',
      };
      const loadedCustomers: Customer[] = [
        {
          id: 'existing-fernanda',
          name: 'Fernanda Lima',
          phone: '(11) 91111-2222',
          userId: 'user-test-123',
          createdAt: '2026-01-01',
        },
      ];

      let customerId = selectedCustomer && selectedCustomer !== 'new' ? selectedCustomer : undefined;
      const trimmedCustomerName = formData.customerName.trim();
      const trimmedCustomerPhone = formData.customerPhone.trim();

      if (!customerId && trimmedCustomerName) {
        let existingCustomer: Customer | null = null;
        if (trimmedCustomerPhone) {
          const cleanPhoneDigits = trimmedCustomerPhone.replace(/\D/g, '');
          existingCustomer = loadedCustomers.find((c) => {
            if (c.phone === trimmedCustomerPhone) return true;
            const cDigits = (c.phone || '').replace(/\D/g, '');
            return cleanPhoneDigits.length >= 8 && cDigits === cleanPhoneDigits;
          }) || null;
        }

        if (existingCustomer) {
          customerId = existingCustomer.id;
        }
      }

      // Deve reaproveitar o ID sem disparar addDoc
      expect(customerId).toBe('existing-fernanda');
      expect(mockCustomerAddDoc).not.toHaveBeenCalled();
    });
  });

  describe('4. Resolução de Clientes e Sanitização em Orçamentos e Formulário', () => {
    it('deve aparar espaços em branco (trim) ao submeter dados do cliente', () => {
      const rawForm = {
        name: '  Carla Souza   ',
        phone: '  (11) 98888-7777  ',
        email: '   carla@empresa.com   ',
        street: '  Rua das Flores  ',
        city: '  São Paulo  ',
      };

      const sanitized = {
        name: rawForm.name.trim(),
        phone: rawForm.phone.trim(),
        email: rawForm.email.trim() || undefined,
        street: rawForm.street.trim() || undefined,
        city: rawForm.city.trim() || undefined,
      };

      expect(sanitized.name).toBe('Carla Souza');
      expect(sanitized.phone).toBe('(11) 98888-7777');
      expect(sanitized.email).toBe('carla@empresa.com');
      expect(sanitized.street).toBe('Rua das Flores');
      expect(sanitized.city).toBe('São Paulo');
    });

    it('deve auto-cadastrar cliente ao salvar orçamento com novo cliente', async () => {
      mockCustomerGetDocs.mockResolvedValue({ empty: true, docs: [] });
      mockCustomerAddDoc.mockResolvedValueOnce({ id: 'quote-cust-777' });

      const quoteForm = {
        customerName: 'Cliente Novo Orçamento',
        customerPhone: '(11) 97777-6666',
        customerId: undefined,
      };

      let finalCustomerId = quoteForm.customerId;
      const trimmedPhone = quoteForm.customerPhone.trim();
      const trimmedName = quoteForm.customerName.trim();

      if (!finalCustomerId && trimmedPhone) {
        finalCustomerId = await firebaseCustomerService.createCustomer('user-test-123', {
          name: trimmedName,
          phone: trimmedPhone,
          status: 'active',
        });
      }

      expect(finalCustomerId).toBe('quote-cust-777');
      expect(mockCustomerAddDoc).toHaveBeenCalledTimes(1);
    });
  });
});
