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
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => mockCallable),
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
      expect(mockCallable).toHaveBeenCalledWith({ uid: 'user-to-delete' });
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });
  });
});
