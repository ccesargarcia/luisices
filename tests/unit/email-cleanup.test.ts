import { describe, expect, it, vi } from 'vitest';
import { cleanupEmailDraftFiles, EMAIL_DRAFT_MAX_AGE_MS } from '../../functions/email/cleanupCore.js';

describe('limpeza de anexos temporários de e-mail', () => {
  it('remove apenas rascunhos antigos marcados e preserva arquivos permanentes', async () => {
    const now = 10_000_000;
    const removeOld = vi.fn().mockResolvedValue(undefined);
    const removePermanent = vi.fn().mockResolvedValue(undefined);
    const removeNew = vi.fn().mockResolvedValue(undefined);
    const bucket = {
      getFiles: vi.fn().mockResolvedValue([[
        { name: 'users/u/orders/email_draft/old.pdf', metadata: { metadata: { emailDraft: 'true', uploadedAtMs: String(now - EMAIL_DRAFT_MAX_AGE_MS - 1) } }, delete: removeOld },
        { name: 'users/u/orders/real-order/keep.pdf', metadata: { metadata: { emailDraft: 'true', uploadedAtMs: String(now - EMAIL_DRAFT_MAX_AGE_MS - 1) } }, delete: removePermanent },
        { name: 'users/u/orders/email_draft/new.pdf', metadata: { metadata: { emailDraft: 'true', uploadedAtMs: String(now) } }, delete: removeNew },
      ]]),
    };
    await expect(cleanupEmailDraftFiles(bucket as any, now)).resolves.toEqual({ removed: 1, failed: 0 });
    expect(removeOld).toHaveBeenCalledWith({ ignoreNotFound: true });
    expect(removePermanent).not.toHaveBeenCalled();
    expect(removeNew).not.toHaveBeenCalled();
  });

  it('contabiliza falhas sem interromper os demais arquivos', async () => {
    const bucket = {
      getFiles: vi.fn().mockResolvedValue([[
        { name: 'users/u/orders/email_draft/a', metadata: { metadata: { emailDraft: 'true', uploadedAtMs: '1' } }, delete: vi.fn().mockRejectedValue(new Error('offline')) },
        { name: 'users/u/orders/email_draft/b', metadata: { metadata: { emailDraft: 'true', uploadedAtMs: '1' } }, delete: vi.fn().mockResolvedValue(undefined) },
      ]]),
    };
    await expect(cleanupEmailDraftFiles(bucket as any, EMAIL_DRAFT_MAX_AGE_MS + 2)).resolves.toEqual({ removed: 1, failed: 1 });
  });
});
