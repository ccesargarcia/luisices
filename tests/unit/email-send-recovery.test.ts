import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const { fingerprint, acquireSend, markProviderAttempt, completeSend, releaseSend, RETRY_WINDOW_MS } = require('../../functions/email/sendIdempotency.js');

function fixture(initial?: any) {
  const docs = new Map<string, any>();
  if (initial) docs.set('request', initial);
  const ref = { path: 'request' };
  // Simula commits atômicos e serializa disputas pelo mesmo documento.
  let queue = Promise.resolve();
  let failCommit = false;
  const db = {
    runTransaction(callback: any) {
      const operation = queue.then(async () => {
        const writes: Array<() => void> = [];
        const result = await callback({
          get: async (target: any) => ({ exists: docs.has(target.path), data: () => docs.get(target.path) }),
          set: (target: any, data: any, options?: any) => writes.push(() => docs.set(target.path, options?.merge ? { ...docs.get(target.path), ...data } : data)),
          update: (target: any, data: any) => writes.push(() => docs.set(target.path, { ...docs.get(target.path), ...data })),
        });
        if (failCommit) throw new Error('commit failed');
        writes.forEach((write) => write());
        return result;
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
  return { docs, ref, db, args: { db, ref, hash: 'payload-a', uid: 'user', now: 1000, owner: 'worker-a' }, fail: () => { failCommit = true; } };
}

describe('Recuperação idempotente de envio', () => {
  it('normaliza ordem das propriedades sem ignorar alterações de conteúdo', () => {
    expect(fingerprint({ b: 2, a: 1 })).toBe(fingerprint({ a: 1, b: 2 }));
    expect(fingerprint({ a: 2 })).not.toBe(fingerprint({ a: 1 }));
    expect(fingerprint({ content: Buffer.from('a') })).not.toBe(fingerprint({ content: Buffer.from('b') }));
  });
  it('apenas um concorrente adquire a operação', async () => {
    const { args } = fixture();
    const results = await Promise.allSettled([acquireSend(args), acquireSend({ ...args, owner: 'worker-b' })]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });
  it('rejeita mesma chave com conteúdo diferente', async () => {
    const { args } = fixture();
    await acquireSend(args);
    await expect(acquireSend({ ...args, hash: 'payload-b' })).rejects.toMatchObject({ code: 'already-exists' });
  });
  it('renova lease na recuperação e bloqueia uma terceira tentativa', async () => {
    const { args } = fixture();
    await acquireSend(args);
    await acquireSend({ ...args, now: 122000, owner: 'worker-b' });
    await expect(acquireSend({ ...args, now: 122001, owner: 'worker-c' })).rejects.toMatchObject({ code: 'aborted' });
  });
  it('worker antigo não altera nem finaliza a operação recuperada', async () => {
    const { args, db, ref } = fixture();
    await acquireSend(args);
    await acquireSend({ ...args, now: 122000, owner: 'worker-b' });
    const stale = { db, ref, owner: 'worker-a' };
    await expect(releaseSend(stale, 'time')).rejects.toMatchObject({ code: 'aborted' });
    await expect(completeSend(stale, { path: 'sent', id: 'sent' }, {}, 'time')).rejects.toMatchObject({ code: 'aborted' });
  });
  it('falha após tentativa externa mantém resultado incerto e bloqueia anexos alterados', async () => {
    const { args, db, ref, docs } = fixture();
    await acquireSend(args);
    const context = { db, ref, owner: args.owner };
    await markProviderAttempt(context, 'provider-a');
    await releaseSend(context, 'time');
    expect(docs.get('request').status).toBe('uncertain');
    const next = await acquireSend({ ...args, owner: 'worker-b', now: 2000 });
    await expect(markProviderAttempt({ db, ref, owner: next.owner }, 'provider-b')).rejects.toMatchObject({ code: 'failed-precondition' });
  });
  it('bloqueia recuperação fora da janela segura do provedor', async () => {
    const { args } = fixture();
    await acquireSend(args);
    await expect(acquireSend({ ...args, now: 1000 + RETRY_WINDOW_MS })).rejects.toMatchObject({ code: 'failed-precondition' });
  });
  it('grava histórico e conclusão atomicamente e retorna resultado repetido', async () => {
    const { args, db, ref, docs } = fixture();
    await acquireSend(args);
    await completeSend({ db, ref, owner: args.owner }, { path: 'sent', id: 'sent' }, { resendId: 'provider-id' }, 'time');
    expect(docs.get('sent').resendId).toBe('provider-id');
    expect((await acquireSend(args)).completed.sentDocId).toBe('sent');
  });
  it('falha de commit não salva histórico nem conclusão parcial', async () => {
    const { args, db, ref, docs, fail } = fixture();
    await acquireSend(args);
    fail();
    await expect(completeSend({ db, ref, owner: args.owner }, { path: 'sent', id: 'sent' }, { resendId: 'id' }, 'time')).rejects.toThrow('commit failed');
    expect(docs.has('sent')).toBe(false);
    expect(docs.get('request').status).toBe('processing');
  });
  it('não reenvia automaticamente registros legados sem hash', async () => {
    const { args } = fixture({ status: 'failed', uid: 'user' });
    await expect(acquireSend(args)).rejects.toMatchObject({ code: 'failed-precondition' });
  });
  it('não retorna resultado de outro usuário mesmo com hash igual', async () => {
    const { args } = fixture({ uid: 'other', payloadHash: 'payload-a', status: 'completed' });
    await expect(acquireSend(args)).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
