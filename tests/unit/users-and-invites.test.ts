import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockCallable = vi.fn();

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'unauthorized-user', email: 'test@example.com' } },
  functions: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, coll, id) => ({ coll, id })),
  getDocs: vi.fn(),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  updateDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
}));

const mockHttpsCallable = vi.fn((_functions, name) => {
  return (...args: any[]) => mockCallable(name, ...args);
});

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: any[]) => mockHttpsCallable(args[0], args[1]),
}));

import { firebaseUserService } from '../../src/services/firebaseUserService';
const { getCallerScope, validateAiAccess } = require('../../functions/ai/authorization');

describe('Etapa 2: Convites e Ciclo de Vida de Usuários (Achados 1 e 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Achado 1: Entrada e criação de perfil restrita a convite no servidor', () => {
    it('getUserProfile retorna null quando o perfil não existe, sem auto-criar perfil ativo no Firestore', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const profile = await firebaseUserService.getUserProfile('unauthorized-user', 'test@example.com', 'Test User');

      expect(profile).toBeNull();
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('getCallerScope marca como inativo e nega IA para chamador sem perfil autorizado no Firestore', () => {
      const scopeNoProfile = getCallerScope('new-user', null);
      expect(scopeNoProfile.active).toBe(false);
      expect(scopeNoProfile.canAiCopilot).toBe(false);
      expect(() => validateAiAccess(scopeNoProfile)).toThrow('Conta de usuário desativada');
    });

    it('getCallerScope bloqueia IA para usuário convidado com permissions.aiCopilot=false', () => {
      const scopeInvitedUser = getCallerScope('invited-user', {
        role: 'user',
        active: true,
        createdBy: 'admin-owner',
        permissions: {
          dashboard: true,
          orders: { view: true },
          aiCopilot: false,
          whatsapp: false,
        },
      });
      expect(scopeInvitedUser.active).toBe(true);
      expect(scopeInvitedUser.canAiCopilot).toBe(false);
      expect(() => validateAiAccess(scopeInvitedUser)).toThrow('não possui permissão para utilizar recursos de IA');
    });
  });

  describe('Achado 2: Exclusão de usuário atômica e resiliente', () => {
    it('deleteUser não executa exclusão direta no Firestore se a Cloud Function falhar', async () => {
      mockCallable.mockRejectedValueOnce(new Error('INTERNAL: Auth service unavailable'));

      await expect(firebaseUserService.deleteUser('user-to-delete')).rejects.toThrow('Auth service unavailable');

      // Não deve executar deleteDoc como fallback destrutivo
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it('deleteUser executa a Cloud Function administrativa com sucesso', async () => {
      mockCallable.mockResolvedValueOnce({ data: { success: true } });

      await expect(firebaseUserService.deleteUser('user-to-delete')).resolves.toBeUndefined();
      expect(mockCallable).toHaveBeenCalledWith('deleteUser', { uid: 'user-to-delete' });
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });
  });
});

describe('Sessões e Dispositivos (Contratos de Callables)', () => {
  it('revokeAllSessions deve chamar a Cloud Function com nome exato e payload { uid }', async () => {
    mockCallable.mockResolvedValueOnce({ data: { success: true } });
    await firebaseUserService.revokeAllSessions('target-user-456');
    expect(mockCallable).toHaveBeenCalledWith('revokeAllSessions', { uid: 'target-user-456' });
  });

  it('registerDeviceSession deve chamar a Cloud Function com nome exato e payload { deviceId, userAgent }', async () => {
    mockCallable.mockResolvedValueOnce({ data: { success: true } });
    await firebaseUserService.registerDeviceSession('device-valid-123', 'CustomUserAgent/1.0');
    expect(mockCallable).toHaveBeenCalledWith('registerDeviceSession', {
      deviceId: 'device-valid-123',
      userAgent: 'CustomUserAgent/1.0',
    });
  });

  it('revokeDeviceSession deve chamar a Cloud Function com nome exato e payload { uid, deviceId }', async () => {
    mockCallable.mockResolvedValueOnce({ data: { success: true } });
    await firebaseUserService.revokeDeviceSession('target-user-456', 'device-789');
    expect(mockCallable).toHaveBeenCalledWith('revokeDeviceSession', {
      uid: 'target-user-456',
      deviceId: 'device-789',
    });
  });
});

describe('Barreira Temporal e Segurança de Sessões (assertActiveSession)', () => {
  const admin = require('../../functions/node_modules/firebase-admin');
  const { assertActiveSession } = require('../../functions/common/helpers');

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'demo-test' });
  }

  it('rejeita chamadas sem autenticação com unauthenticated', async () => {
    await expect(assertActiveSession({})).rejects.toThrow('Requer autenticação.');
  });

  it('rejeita tokens emitidos no mesmo segundo ou antes da revogação (auth_time <= tokensValidAfterTime)', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ active: true, tokensValidAfterTime: 1700000050 }),
    });
    const mockCollection = vi.spyOn(admin.firestore(), 'collection').mockReturnValue({
      doc: vi.fn().mockReturnValue({ get: mockGet }),
    } as any);

    const requestNoMesmoSegundo = {
      auth: {
        uid: 'user-revoked',
        token: { auth_time: 1700000050 }, // exatamente o mesmo segundo da revogação
      },
    };

    await expect(assertActiveSession(requestNoMesmoSegundo)).rejects.toThrow('Sessão revogada no servidor.');

    const requestAnterior = {
      auth: {
        uid: 'user-revoked',
        token: { auth_time: 1700000049 }, // segundo anterior
      },
    };

    await expect(assertActiveSession(requestAnterior)).rejects.toThrow('Sessão revogada no servidor.');
    mockCollection.mockRestore();
  });

  it('permite autenticações legítimas ocorridas estritamente após a revogação (auth_time > tokensValidAfterTime)', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ active: true, tokensValidAfterTime: 1700000050 }),
    });
    const mockCollection = vi.spyOn(admin.firestore(), 'collection').mockReturnValue({
      doc: vi.fn().mockReturnValue({ get: mockGet }),
    } as any);

    const requestNovoLogin = {
      auth: {
        uid: 'user-revoked',
        token: { auth_time: 1700000051 }, // 1 segundo após revogação
      },
    };

    const session = await assertActiveSession(requestNovoLogin);
    expect(session.uid).toBe('user-revoked');
    mockCollection.mockRestore();
  });
});
