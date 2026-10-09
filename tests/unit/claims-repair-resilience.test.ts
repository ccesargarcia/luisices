/**
 * tests/unit/claims-repair-resilience.test.ts
 *
 * Testes de resiliência e concorrência para o serviço real userSyncService e callables de usuários.
 * Executa a implementação real com injeção de dependências em memória / espiões controlados.
 *
 * Cenários cobertos:
 *  A. Operações fora de ordem: Worker antigo que termina após um novo NÃO pode deixar claims antigas no Auth.
 *  B. Perda de revogação: Falha externa em revogação seguida de update cosmético PRESERVA needsRevocation=true.
 *  C. Migração de marcador legado: Reparo legado sob concorrência com atualização nova NÃO remove o marcador novo.
 *  D. Falha após efeito externo: Falha ao confirmar no Firestore permite convergência idempotente no retry/reparo.
 *  E. Falha em cada etapa externa: Erros em RTDB, Auth refresh tokens ou setCustomUserClaims preservam pendências.
 *  F. Proteção do último administrador: Impede remoção/desativação do único admin sem efeitos externos.
 *  G. Autorização de reparo: Próprio usuário e admin autorizados; terceiro não-admin rejeitado com permission-denied.
 *  H. Barreira temporal: auth_time <= tokensValidAfterTime rejeitado; auth_time > tokensValidAfterTime aceito.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
const {
  updateUserProfile,
  revokeUserSessions,
  executeUserRepair,
  convertLegacyMarker,
  processUserSync,
} = require('../../functions/users/userSyncService');

// ─── Harness em Memória com Semântica Transacional Real ───────────────────────

function createMemoryFirestore() {
  const store = new Map<string, any>();

  function getDocData(path: string) {
    const val = store.get(path);
    return val ? JSON.parse(JSON.stringify(val)) : null;
  }

  function setDocData(path: string, val: any) {
    store.set(path, JSON.parse(JSON.stringify(val)));
  }

  const firestore: any = {
    _store: store,
    doc: (path: string) => ({
      path,
      get: async () => {
        const d = getDocData(path);
        return {
          exists: d !== null,
          data: () => d,
          ref: { path },
        };
      },
      set: async (val: any, options?: any) => {
        if (options?.merge && store.has(path)) {
          setDocData(path, { ...getDocData(path), ...val });
        } else {
          setDocData(path, val);
        }
      },
      update: async (val: any) => {
        const current = getDocData(path) || {};
        const updated = { ...current };
        for (const [k, v] of Object.entries(val)) {
          if (
            (v && typeof v === 'object' && (v.constructor?.name === 'DeleteTransform' || (v as any)._methodName === 'FieldValue.delete')) ||
            v === undefined
          ) {
            delete updated[k];
          } else {
            updated[k] = v;
          }
        }
        setDocData(path, updated);
      },
    }),
    collection: (collPath: string) => ({
      path: collPath,
      doc: (id?: string) => {
        const docId = id || `doc_${Math.random().toString(36).substring(2, 9)}`;
        return firestore.doc(`${collPath}/${docId}`);
      },
      where: (field: string, op: string, val: any) => ({
        get: async () => {
          const docs: any[] = [];
          for (const [k, v] of store.entries()) {
            if (k.startsWith(`${collPath}/`)) {
              if (op === '==' && v[field] === val) {
                docs.push({
                  id: k.split('/').pop(),
                  data: () => JSON.parse(JSON.stringify(v)),
                });
              }
            }
          }
          return { docs, size: docs.length, empty: docs.length === 0 };
        },
      }),
      get: async () => {
        const docs: any[] = [];
        for (const [k, v] of store.entries()) {
          if (k.startsWith(`${collPath}/`)) {
            docs.push({
              id: k.split('/').pop(),
              ref: firestore.doc(k),
              data: () => JSON.parse(JSON.stringify(v)),
            });
          }
        }
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
    }),
    batch: () => {
      const ops: Array<() => void> = [];
      return {
        delete: (ref: any) => {
          ops.push(() => store.delete(ref.path));
        },
        commit: async () => {
          ops.forEach((op) => op());
        },
      };
    },
    runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
      // Simulação de transação com staging local de mutações
      const stagedWrites: Array<() => void> = [];
      const tx = {
        get: async (ref: any) => {
          return await ref.get();
        },
        update: (ref: any, data: any) => {
          stagedWrites.push(() => ref.update(data));
        },
        set: (ref: any, data: any, options?: any) => {
          stagedWrites.push(() => ref.set(data, options));
        },
        create: (ref: any, data: any) => {
          stagedWrites.push(() => ref.set(data));
        },
        delete: (ref: any) => {
          stagedWrites.push(() => store.delete(ref.path));
        },
      };

      const result = await updateFunction(tx);
      // Aplica todas as escritas atomicamente
      for (const write of stagedWrites) {
        await write();
      }
      return result;
    },
  };

  return firestore;
}

function createFakeDependencies() {
  const firestore = createMemoryFirestore();
  const authClaims = new Map<string, any>();
  const revokedTokens = new Set<string>();
  const rtdbStatus = new Map<string, any>();
  const rtdbRevocations = new Map<string, number>();

  let currentTime = 1728400000000;

  const auth = {
    setCustomUserClaims: vi.fn(async (uid: string, claims: any) => {
      authClaims.set(uid, { ...claims });
    }),
    revokeRefreshTokens: vi.fn(async (uid: string) => {
      revokedTokens.add(uid);
    }),
    getClaims: (uid: string) => authClaims.get(uid),
    isRevoked: (uid: string) => revokedTokens.has(uid),
  };

  const database = {
    ref: (path: string) => ({
      remove: vi.fn(async () => {
        if (path.startsWith('status/')) {
          rtdbStatus.delete(path.replace('status/', ''));
        }
      }),
      set: vi.fn(async (val: any) => {
        if (path.startsWith('revocations/')) {
          rtdbRevocations.set(path.replace('revocations/', ''), val);
        }
      }),
      transaction: vi.fn(async (updateFn: (current: any) => any) => {
        if (path.startsWith('revocations/')) {
          const key = path.replace('revocations/', '');
          const current = rtdbRevocations.get(key);
          const next = updateFn(current);
          rtdbRevocations.set(key, next);
        }
      }),
    }),
    _status: rtdbStatus,
    _revocations: rtdbRevocations,
  };

  let opCount = 0;
  const generateOpId = () => `op_${++opCount}`;
  const now = () => currentTime;

  return {
    firestore,
    auth,
    database,
    now,
    generateOpId,
    setTime: (t: number) => { currentTime = t; },
  };
}

// ─── Testes de Resiliência do Serviço Real ───────────────────────────────────

describe('userSyncService — Resiliência, Concorrência e Monotonicidade Real', () => {
  let deps: ReturnType<typeof createFakeDependencies>;

  beforeEach(() => {
    deps = createFakeDependencies();
  });

  // ─── Cenário A: Operações fora de ordem ──────────────────────────────────────
  describe('Cenário A: Operações fora de ordem (Out-of-Order Race Condition)', () => {
    it('garante que uma operação antiga (A: admin) que termina depois de uma nova (B: user) reconcilia e não deixa admin no Auth', async () => {
      const uid = 'target-user-race';
      // Perfil inicial no Firestore: role user, syncVersion 1
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'user',
        active: true,
        syncVersion: 1,
      });
      // Outro admin para satisfazer a regra do último admin
      await deps.firestore.doc('userProfiles/other-admin').set({
        uid: 'other-admin',
        role: 'admin',
        active: true,
      });

      // Barreira de sincronização: congela a chamada Auth de Op A
      let releaseOpAClaims: () => void;
      const opAClaimsBarrier = new Promise<void>((resolve) => {
        releaseOpAClaims = resolve;
      });

      let isFirstCall = true;
      const originalSetClaims = deps.auth.setCustomUserClaims;
      deps.auth.setCustomUserClaims = vi.fn(async (targetUid: string, claims: any) => {
        if (targetUid === uid && claims.role === 'admin' && isFirstCall) {
          isFirstCall = false;
          // Pausa Op A simulando latência de rede externa
          await opAClaimsBarrier;
        }
        return originalSetClaims(targetUid, claims);
      });

      // 1. Inicia Op A promovendo para 'admin' (em background)
      const opAPromise = updateUserProfile({
        uid,
        role: 'admin',
        actorUid: 'admin-1',
      }, deps);

      // Aguarda até Op A estar na transação inicial e chamar setCustomUserClaims (pausada)
      await new Promise((r) => setTimeout(r, 10));

      // 2. Op B chega logo em seguida e rebaixa para 'user'
      const opBResult = await updateUserProfile({
        uid,
        role: 'user',
        actorUid: 'admin-2',
      }, deps);

      expect(opBResult.success).toBe(true);

      // Neste momento, Firestore já está na versão de Op B (role: 'user')
      const profileAfterB = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(profileAfterB.role).toBe('user');

      // 3. Agora liberamos Op A para concluir suas chamadas tardias
      releaseOpAClaims!();
      const opAResult = await opAPromise;
      expect(opAResult.success).toBe(true);

      // VERIFICAÇÃO CRÍTICA DO CENÁRIO A:
      // O estado final no Firebase Auth NÃO PODE ser 'admin'!
      // O mecanismo de reconciliação pós-escrita deve ter detectado a versão superior e regravado 'user'.
      const finalAuthClaims = deps.auth.getClaims(uid);
      expect(finalAuthClaims.role).toBe('user');
    });
  });

  // ─── Cenário B: Perda de revogação ───────────────────────────────────────────
  describe('Cenário B: Preservação de revogação sob retries e alterações cosméticas', () => {
    it('preserva needsRevocation=true mesmo se administrador fizer alteração cosmética de nome após falha', async () => {
      const uid = 'user-revocation-test';
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'admin',
        active: true,
        displayName: 'Nome Antigo',
        syncVersion: 1,
      });
      await deps.firestore.doc('userProfiles/other-admin').set({
        uid: 'other-admin',
        role: 'admin',
        active: true,
      });

      // Simula falha na API de revokeRefreshTokens
      deps.auth.revokeRefreshTokens = vi.fn().mockRejectedValueOnce(new Error('Auth network timeout'));

      // 1. Rebaixa de admin para user (exige revogação). Falha na etapa externa.
      await expect(updateUserProfile({
        uid,
        role: 'user',
        actorUid: 'admin-1',
      }, deps)).rejects.toThrow(/falha na sincronização externa/i);

      // Firestore gravou perfil com role 'user' e marker needsRevocation=true
      const profileAfterFail = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(profileAfterFail.claimsSyncPending.needsRevocation).toBe(true);

      // 2. Administrador agora faz uma alteração puramente cosmética (displayName)
      // Restaura o Auth para responder normalmente
      deps.auth.revokeRefreshTokens = vi.fn().mockResolvedValue(undefined);

      const cosmeticResult = await updateUserProfile({
        uid,
        displayName: 'Nome Atualizado',
        actorUid: 'admin-1',
      }, deps);

      expect(cosmeticResult.success).toBe(true);

      // O marker foi processado e a revogação pendente foi EXECUTADA com sucesso!
      expect(deps.auth.revokeRefreshTokens).toHaveBeenCalledWith(uid);
      const profileFinal = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(profileFinal.displayName).toBe('Nome Atualizado');
      expect(profileFinal.role).toBe('user');
      // Sincronização concluída: marker limpo
      expect(profileFinal.claimsSyncPending).toBeUndefined();
    });
  });

  // ─── Cenário C: Migração de marcador legado ──────────────────────────────────
  describe('Cenário C: Migração concorrente de marcador legado (claimsSyncPending: true)', () => {
    it('reparo legado não remove marcador estruturado novo gravado concorrentemente', async () => {
      const uid = 'legacy-user';
      // Perfil legado com boolean true
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'funcionario',
        active: true,
        claimsSyncPending: true,
        syncVersion: 1,
      });

      // 1. Executa conversão transacional
      const convertResult = await convertLegacyMarker(uid, deps);
      expect(convertResult.converted).toBe(true);

      const profileAfterConvert = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(profileAfterConvert.claimsSyncPending).toHaveProperty('version');
      expect(profileAfterConvert.claimsSyncPending.needsClaims).toBe(true);
      expect(profileAfterConvert.claimsSyncPending.needsRevocation).toBe(false);

      // 2. Se nova operação chegar com versão superior, conversão de legado antigo recusa alteração
      await deps.firestore.doc(`userProfiles/${uid}`).update({
        syncVersion: 10,
        claimsSyncPending: {
          version: 10,
          opId: 'op_moderna',
          status: 'pending',
          needsRevocation: true,
        },
      });

      const secondConvert = await convertLegacyMarker(uid, deps);
      expect(secondConvert.converted).toBe(false);

      const finalProfile = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      // O marcador moderno é preservado intacto!
      expect(finalProfile.claimsSyncPending.version).toBe(10);
      expect(finalProfile.claimsSyncPending.opId).toBe('op_moderna');
    });
  });

  // ─── Cenário D: Falha após efeito externo ─────────────────────────────────────
  describe('Cenário D: Falha após efeito externo e convergência no reparo', () => {
    it('se setCustomUserClaims tem sucesso mas transação do Firestore falhar, reparo retoma e finaliza', async () => {
      const uid = 'user-partial-fail';
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'user',
        active: true,
        syncVersion: 2,
        claimsSyncPending: {
          version: 2,
          opId: 'op_partial',
          status: 'failed',
          needsRevocation: true,
          needsClaims: true,
        },
      });

      // Executa reparo
      const repairResult = await executeUserRepair({ uid }, deps);
      expect(repairResult.success).toBe(true);
      expect(repairResult.resumedRevocation).toBe(true);

      // Verificamos que Auth e RTDB foram sincronizados e Firestore finalizou
      expect(deps.auth.getClaims(uid)).toEqual({ role: 'user', active: true });
      expect(deps.auth.isRevoked(uid)).toBe(true);

      const profileFinal = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(profileFinal.claimsSyncPending).toBeUndefined();
      expect(profileFinal.syncedVersion).toBe(2);
    });
  });

  // ─── Testes Obrigatórios Adicionais (Etapa 6) ─────────────────────────────────
  describe('Etapa 6: Validações de Segurança, Permissões e Último Administrador', () => {
    it('protege o último administrador: impede rebaixamento de único admin ativo e não causa efeitos externos', async () => {
      const uid = 'sole-admin';
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'admin',
        active: true,
        syncVersion: 1,
      });

      // Tenta rebaixar para 'user'
      await expect(updateUserProfile({
        uid,
        role: 'user',
        actorUid: uid,
      }, deps)).rejects.toThrow('O sistema precisa manter pelo menos um administrador ativo.');

      // Nenhum efeito externo foi executado
      expect(deps.auth.setCustomUserClaims).not.toHaveBeenCalled();
      expect(deps.auth.revokeRefreshTokens).not.toHaveBeenCalled();

      // Perfil no Firestore permanece intacto como admin
      const profile = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(profile.role).toBe('admin');
    });

    it('revokeUserSessions avança tokensValidAfterTime e aciona RTDB, Firestore devices e Auth', async () => {
      const uid = 'user-to-revoke';
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'user',
        active: true,
        tokensValidAfterTime: 1700000000,
        syncVersion: 1,
      });
      // Adiciona dispositivo
      await deps.firestore.doc(`userProfiles/${uid}/devices/dev-1`).set({
        deviceId: 'dev-1',
        createdAt: 1700000000,
      });

      deps.setTime(1728400050000); // 1728400050 segundos
      const result = await revokeUserSessions({ uid, actorUid: 'admin-audit' }, deps);
      expect(result.success).toBe(true);

      const profile = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(profile.tokensValidAfterTime).toBe(1728400050);

      // Dispositivo foi removido
      const devDoc = await deps.firestore.doc(`userProfiles/${uid}/devices/dev-1`).get();
      expect(devDoc.exists).toBe(false);

      // Auth tokens revogados e RTDB atualizado
      expect(deps.auth.isRevoked(uid)).toBe(true);
      expect(deps.database._revocations.get(uid)).toBe(1728400050000);
    });

    it('dois updates de cargo concorrentes convergem deterministicamente para a revisão mais alta', async () => {
      const uid = 'concurrent-user';
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'user',
        active: true,
        syncVersion: 1,
      });
      await deps.firestore.doc('userProfiles/other-admin').set({
        uid: 'other-admin',
        role: 'admin',
        active: true,
      });

      // Executa duas atualizações simultâneas
      const [res1, res2] = await Promise.all([
        updateUserProfile({ uid, role: 'funcionario', actorUid: 'admin-1' }, deps),
        updateUserProfile({ uid, role: 'admin', actorUid: 'admin-2' }, deps),
      ]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);

      // O perfil no Firestore e no Auth devem ter convergido para o mesmo estado
      const finalDoc = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      const finalClaims = deps.auth.getClaims(uid);

      expect(finalClaims.role).toBe(finalDoc.role);
      expect(finalDoc.claimsSyncPending).toBeUndefined();
    });

    it('falha isolada no RTDB preserva needsRevocation=true no Firestore para posterior reparo', async () => {
      const uid = 'rtdb-fail-user';
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'admin',
        active: true,
        syncVersion: 1,
      });
      await deps.firestore.doc('userProfiles/other-admin').set({
        uid: 'other-admin',
        role: 'admin',
        active: true,
      });

      // RTDB lança erro de conexão
      deps.database.ref = vi.fn().mockReturnValue({
        remove: vi.fn().mockRejectedValue(new Error('RTDB connection refused')),
        set: vi.fn().mockResolvedValue(undefined),
        transaction: vi.fn().mockRejectedValue(new Error('RTDB connection refused')),
      });

      await expect(updateUserProfile({
        uid,
        role: 'user',
        actorUid: 'admin-1',
      }, deps)).rejects.toThrow(/falha na sincronização externa/i);

      const profile = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(profile.claimsSyncPending).toBeDefined();
      expect(profile.claimsSyncPending.needsRevocation).toBe(true);
      expect(profile.claimsSyncPending.lastError).toContain('RTDB connection refused');
    });

    it('falha isolada no setCustomUserClaims preserva needsClaims=true para retry', async () => {
      const uid = 'claims-fail-user';
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'user',
        active: true,
        displayName: 'Nome Teste',
        syncVersion: 1,
      });

      deps.auth.setCustomUserClaims = vi.fn().mockRejectedValueOnce(new Error('Auth API timeout'));

      await expect(updateUserProfile({
        uid,
        displayName: 'Novo Nome',
        role: 'funcionario',
        actorUid: 'admin-1',
      }, deps)).rejects.toThrow(/falha na sincronização externa/i);

      const profile = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(profile.claimsSyncPending).toBeDefined();
      expect(profile.claimsSyncPending.needsClaims).toBe(true);
      expect(profile.claimsSyncPending.lastError).toContain('Auth API timeout');
    });

    it('retry da mesma atualização de cargo após falha conclui as pendências com sucesso', async () => {
      const uid = 'retry-user';
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'admin',
        active: true,
        syncVersion: 1,
      });
      await deps.firestore.doc('userProfiles/other-admin').set({
        uid: 'other-admin',
        role: 'admin',
        active: true,
      });

      // 1. Falha na primeira tentativa
      deps.auth.revokeRefreshTokens.mockRejectedValueOnce(new Error('Transient Auth error'));
      await expect(updateUserProfile({
        uid,
        role: 'user',
        actorUid: 'admin-1',
      }, deps)).rejects.toThrow(/falha na sincronização externa/i);

      // 2. Retry com exatamente os mesmos parâmetros (segunda execução usa a implementação padrão)
      const retryResult = await updateUserProfile({
        uid,
        role: 'user',
        actorUid: 'admin-1',
      }, deps);

      expect(retryResult.success).toBe(true);

      const finalDoc = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(finalDoc.role).toBe('user');
      expect(finalDoc.claimsSyncPending).toBeUndefined();
      expect(deps.auth.getClaims(uid)).toEqual({ role: 'user', active: true });
      expect(deps.auth.isRevoked(uid)).toBe(true);
    });

    it('autorização de reparo: titular e admin podem reparar, usuário restrito de terceiros é bloqueado', async () => {
      const { repairUserClaims } = require('../../functions/users/index');
      const userSyncModule = require('../../functions/users/userSyncService');
      const helpers = require('../../functions/common/helpers');

      const spyRepair = vi.spyOn(userSyncModule, 'executeUserRepair').mockResolvedValue({
        success: true,
        claims: { role: 'user', active: true },
        resumedRevocation: false,
        syncedVersion: 1,
      });

      // Caso 1: Usuário reparando sua própria conta (request.auth.uid === uid)
      const ownRequest = {
        auth: { uid: 'user-self' },
        data: { uid: 'user-self' },
      };
      const resOwn = await repairUserClaims.run(ownRequest);
      expect(resOwn.success).toBe(true);
      expect(resOwn.claims.role).toBe('user');

      // Caso 2: Usuário não-admin tentando reparar conta de terceiro
      const adminSpy = vi.spyOn(helpers, 'isAdminRequest').mockResolvedValueOnce(false);
      const unauthorizedRequest = {
        auth: { uid: 'attacker-uid' },
        data: { uid: 'victim-uid' },
      };
      await expect(repairUserClaims.run(unauthorizedRequest)).rejects.toThrow(/Sem permissão para reparar credenciais de terceiros/);

      // Caso 3: Admin tentando reparar conta de terceiro
      adminSpy.mockResolvedValueOnce(true);
      const adminRequest = {
        auth: { uid: 'admin-uid' },
        data: { uid: 'victim-uid' },
      };
      const resAdmin = await repairUserClaims.run(adminRequest);
      expect(resAdmin.success).toBe(true);

      adminSpy.mockRestore();
      spyRepair.mockRestore();
    });

    it('login e barreira temporal: rejeita tokens anteriores ou do mesmo segundo, aceita estritamente posteriores', async () => {
      const { assertActiveSession } = require('../../functions/common/helpers');
      const revocationBarrier = 1728400100; // segundo 100

      const mockDb: any = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ active: true, tokensValidAfterTime: revocationBarrier }),
            }),
          }),
        }),
      };

      // Token anterior: auth_time = 1728400099
      await expect(assertActiveSession({
        auth: { uid: 'u1', token: { auth_time: 1728400099 } },
      }, { db: mockDb })).rejects.toThrow(/Sessão revogada no servidor/);

      // Token no mesmo segundo: auth_time = 1728400100
      await expect(assertActiveSession({
        auth: { uid: 'u1', token: { auth_time: 1728400100 } },
      }, { db: mockDb })).rejects.toThrow(/Sessão revogada no servidor/);

      // Token posterior legítimo: auth_time = 1728400101
      const validSession = await assertActiveSession({
        auth: { uid: 'u1', token: { auth_time: 1728400101 } },
      }, { db: mockDb });
      expect(validSession.uid).toBe('u1');
    });

    // ─── Verificação Específica dos 5 Problemas Identificados ───────────────────

    it('Problema 1: Reconciliação em cadeia — terceira atualização (C) durante reconciliação de (A) não deixa claims antigas no Auth', async () => {
      const uid = 'chain-race-user';
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'user',
        active: true,
        syncVersion: 1,
      });
      await deps.firestore.doc('userProfiles/other-admin').set({
        uid: 'other-admin',
        role: 'admin',
        active: true,
      });

      // Barreira para pausar Op A durante sua 1ª chamada de claims
      let releaseOpAFirstCall: () => void;
      const opAFirstCallBarrier = new Promise<void>((r) => { releaseOpAFirstCall = r; });

      let callCount = 0;
      const originalSetClaims = deps.auth.setCustomUserClaims;
      deps.auth.setCustomUserClaims = vi.fn(async (targetUid: string, claims: any) => {
        if (targetUid === uid) {
          callCount++;
          if (callCount === 1) {
            // Pausa a 1ª chamada de Op A (tentando setar 'admin')
            await opAFirstCallBarrier;
          }
        }
        return originalSetClaims(targetUid, claims);
      });

      // 1. Inicia Op A promovendo para 'admin' (Versão 2)
      const opAPromise = updateUserProfile({
        uid,
        role: 'admin',
        actorUid: 'admin-1',
      }, deps);

      await new Promise((r) => setTimeout(r, 10));

      // 2. Op B chega e altera para 'user' (Versão 3)
      const opBResult = await updateUserProfile({
        uid,
        role: 'user',
        actorUid: 'admin-2',
      }, deps);
      expect(opBResult.success).toBe(true);

      // 3. Op C chega e altera para 'funcionario' (Versão 4)
      const opCResult = await updateUserProfile({
        uid,
        role: 'funcionario',
        actorUid: 'admin-3',
      }, deps);
      expect(opCResult.success).toBe(true);

      // 4. Libera Op A para continuar sua finalização e reconciliação
      releaseOpAFirstCall!();
      const opAResult = await opAPromise;
      expect(opAResult.success).toBe(true);

      // O estado final no Firebase Auth DEVE ser 'funcionario' (Op C), e NUNCA 'admin' (Op A) nem 'user' (Op B)
      const finalClaims = deps.auth.getClaims(uid);
      expect(finalClaims.role).toBe('funcionario');
    });

    it('Problema 2: revokeUserSessions preserva claims pendentes (inclusive de marcador legado) sem descartar needsClaims', async () => {
      const uid = 'revoke-preserves-claims-user';
      // Perfil com marcador legado claimsSyncPending: true
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'funcionario',
        active: true,
        claimsSyncPending: true,
        syncVersion: 1,
      });

      // Chama revokeUserSessions
      const revokeRes = await revokeUserSessions({
        uid,
        actorUid: 'admin-1',
      }, deps);

      expect(revokeRes.success).toBe(true);
      expect(revokeRes.synced).toBe(true);

      // Verifica se Auth recebeu tanto a revogação de tokens quanto as claims de funcionário
      expect(deps.auth.isRevoked(uid)).toBe(true);
      expect(deps.auth.getClaims(uid)).toEqual({ role: 'funcionario', active: true });
    });

    it('Problema 3: estados locked e superseded retornam synced: false com status explícito sem falso sucesso', async () => {
      const uid = 'locked-user';
      deps.setTime(1728400000000);
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'user',
        active: true,
        syncVersion: 1,
        claimsSyncPending: {
          version: 2,
          opId: 'existing_op',
          status: 'processing',
          needsRevocation: false,
          needsClaims: true,
          lease: {
            workerId: 'other_worker',
            expiresAt: 1728400015000, // Lease ativo por mais 15s
          },
        },
      });

      // Chamada a executeUserRepair concorrente:
      const repairResult = await executeUserRepair({ uid }, deps);
      expect(repairResult.synced).toBe(false);
      expect(repairResult.success).toBe(false);
      expect(repairResult.status).toBe('locked');

      // Chamada a processUserSync com expectedVersion menor (superseded):
      const supersededResult = await processUserSync(uid, {
        workerId: 'old_worker',
        expectedVersion: 1, // marker está na versão 2!
        force: false,
      }, deps);
      expect(supersededResult.status).toBe('superseded');
    });

    it('Problema 4: executeUserRepair utiliza force=false e não atropela lease ativo de outro worker', async () => {
      const uid = 'active-lease-user';
      const nowMs = 1728400000000;
      deps.setTime(nowMs);

      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'user',
        active: true,
        syncVersion: 5,
        claimsSyncPending: {
          version: 5,
          opId: 'worker_active_op',
          status: 'processing',
          needsRevocation: true,
          needsClaims: true,
          lease: {
            workerId: 'running_worker',
            expiresAt: nowMs + 10000,
          },
          attempts: 1,
        },
      });

      // executeUserRepair não deve passar force=true
      const result = await executeUserRepair({ uid }, deps);
      expect(result.status).toBe('locked');
      expect(result.synced).toBe(false);

      // O documento no Firestore manteve o lease do worker original inalterado
      const snap = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(snap.claimsSyncPending.lease.workerId).toBe('running_worker');
    });

    it('Problema 5: retries de revogação preservam originalRevocationTimeMs no RTDB e não invalidam logins posteriores ao evento', async () => {
      const uid = 'revocation-timestamp-user';
      const T1_SECONDS = 1728400100;
      const T1_MS = T1_SECONDS * 1000;

      deps.setTime(T1_MS);
      await deps.firestore.doc(`userProfiles/${uid}`).set({
        uid,
        role: 'admin',
        active: true,
        syncVersion: 1,
      });
      await deps.firestore.doc('userProfiles/other-admin').set({
        uid: 'other-admin',
        role: 'admin',
        active: true,
      });

      // 1. Simula falha no RTDB em T1
      deps.database.ref = vi.fn().mockReturnValue({
        remove: vi.fn().mockRejectedValue(new Error('RTDB transient timeout')),
        set: vi.fn().mockResolvedValue(undefined),
        transaction: vi.fn().mockRejectedValue(new Error('RTDB transient timeout')),
      });

      await expect(updateUserProfile({
        uid,
        role: 'user',
        actorUid: 'admin-1',
      }, deps)).rejects.toThrow();

      // Perfil registrou barreira T1 e marker com originalRevocationTimeMs = T1_MS
      const docAfterFail = (await deps.firestore.doc(`userProfiles/${uid}`).get()).data();
      expect(docAfterFail.tokensValidAfterTime).toBe(T1_SECONDS);
      expect(docAfterFail.claimsSyncPending.originalRevocationTimeMs).toBe(T1_MS);

      // 2. Em T2 (> T1), o usuário realiza novo login legítimo
      const T2_SECONDS = T1_SECONDS + 5; // +5s
      const userLoginAuthTime = T2_SECONDS;

      // 3. Em T3 (> T2), o administrador executa retry da mesma atualização
      const T3_SECONDS = T1_SECONDS + 10; // +10s
      deps.setTime(T3_SECONDS * 1000);

      // Restaura o RTDB para responder normalmente
      let rtdbRevocationWrittenTime = 0;
      deps.database.ref = vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue(undefined),
        set: vi.fn().mockImplementation(async (val: number) => {
          rtdbRevocationWrittenTime = val;
        }),
        transaction: vi.fn().mockImplementation(async (updateFn: (current: any) => any) => {
          rtdbRevocationWrittenTime = updateFn(0);
        }),
      });

      const retryResult = await updateUserProfile({
        uid,
        role: 'user',
        actorUid: 'admin-1',
      }, deps);

      expect(retryResult.success).toBe(true);

      // O valor gravado no RTDB deve ser T1_MS (o evento original) e NÃO T3_MS!
      expect(rtdbRevocationWrittenTime).toBe(T1_MS);

      // Regra de segurança do RTDB: auth.token.auth_time * 1000 > revocations.val()
      const isLoginValidInRtdb = (userLoginAuthTime * 1000) > rtdbRevocationWrittenTime;
      expect(isLoginValidInRtdb).toBe(true);
    });
  });
});
