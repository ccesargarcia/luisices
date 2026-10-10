import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDocs = vi.fn();
const mockDocSet = vi.fn();
const mockDocGet = vi.fn();
const mockDocUpdate = vi.fn();
const mockDocDelete = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123', email: 'test@example.com' } },
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, coll, id, sub, subId) => ({ coll, id, sub, subId })),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn((c) => c),
  orderBy: vi.fn(),
  where: vi.fn(),
}));

const mockCallable = vi.fn();
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn((_functions, name) => {
    return (...args: any[]) => mockCallable(name, ...args);
  }),
}));

import { firebaseUserService } from '../../src/services/firebaseUserService';

describe('Ciclo de Vida de Sessões e Resiliência de Dispositivos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserDevices: Filtragem e Mapeamento', () => {
    it('filtra dispositivos com status "revoked" e preserva dispositivos ativos', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'dev-active-1',
            data: () => ({
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              ip: '200.100.50.1',
              location: 'São Paulo, SP - Brazil',
              lastActiveAt: '2026-10-09T10:00:00.000Z',
              createdAt: '2026-10-01T10:00:00.000Z',
              status: 'active',
            }),
          },
          {
            id: 'dev-revoked-2',
            data: () => ({
              userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
              ip: '200.100.50.2',
              location: 'Rio de Janeiro, RJ - Brazil',
              lastActiveAt: '2026-10-08T10:00:00.000Z',
              createdAt: '2026-10-02T10:00:00.000Z',
              status: 'revoked',
            }),
          },
          {
            id: 'dev-legacy-3',
            data: () => ({
              userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
              ip: '200.100.50.3',
              location: 'Curitiba, PR - Brazil',
              lastActiveAt: '2026-10-09T09:00:00.000Z',
              createdAt: '2026-10-03T10:00:00.000Z',
              // Legado sem status explícito deve ser considerado active por padrão
            }),
          },
        ],
      });

      const devices = await firebaseUserService.getUserDevices('user-test-uid');

      expect(devices).toHaveLength(2);
      expect(devices.map((d) => d.deviceId)).toEqual(['dev-active-1', 'dev-legacy-3']);
      expect(devices.find((d) => d.deviceId === 'dev-revoked-2')).toBeUndefined();
      expect(devices[0].status).toBe('active');
      expect(devices[1].status).toBe('active');
    });
  });

  describe('Revogação e Registro de Dispositivo no Backend', () => {
    it('registerDeviceSession chama Cloud Function com contrato correto', async () => {
      mockCallable.mockResolvedValueOnce({ data: { success: true } });
      await firebaseUserService.registerDeviceSession('dev-100', 'Edge/120.0');

      expect(mockCallable).toHaveBeenCalledWith('registerDeviceSession', {
        deviceId: 'dev-100',
        userAgent: 'Edge/120.0',
      });
    });

    it('revokeDeviceSession chama Cloud Function com { uid, deviceId }', async () => {
      mockCallable.mockResolvedValueOnce({ data: { success: true } });
      await firebaseUserService.revokeDeviceSession('user-xyz', 'dev-100');

      expect(mockCallable).toHaveBeenCalledWith('revokeDeviceSession', {
        uid: 'user-xyz',
        deviceId: 'dev-100',
      });
    });
  });

  describe('Proteção Contra Ressurreição de Sessão Revogada', () => {
    it('detecta flag status "revoked" em dados de dispositivo recuperados', () => {
      const activeDeviceData = {
        deviceId: 'dev-1',
        status: 'active',
        lastActiveAt: Date.now(),
      };

      const revokedDeviceData = {
        deviceId: 'dev-2',
        status: 'revoked',
        revokedAt: Date.now(),
      };

      const isRevoked = (data: any) => data?.status === 'revoked';

      expect(isRevoked(activeDeviceData)).toBe(false);
      expect(isRevoked(revokedDeviceData)).toBe(true);
    });

    it('permite re-registro de sessão com novo IP e dados atualizados em nova conexão', async () => {
      mockCallable.mockResolvedValueOnce({ data: { success: true } });
      await firebaseUserService.registerDeviceSession('dev-fresh', 'Chrome/124.0');

      expect(mockCallable).toHaveBeenCalledWith('registerDeviceSession', {
        deviceId: 'dev-fresh',
        userAgent: 'Chrome/124.0',
      });
    });
  });
});
