import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  INLINE_BODY_MAX_BYTES,
  MAX_RECEIVED_BODY_BYTES,
  prepareReceivedEmailBody,
  persistReceivedEmailBody,
} = require('../../functions/email/receivedEmailBody.js');

describe('persistência de corpos recebidos', () => {
  it('mantém corpos pequenos inline para compatibilidade com documentos atuais', () => {
    const body = prepareReceivedEmailBody({ emailId: 'mail-1', html: '<p>Olá</p>', text: 'Olá' });
    expect(body.mode).toBe('inline');
    expect(body.html).toBe('<p>Olá</p>');
    expect(body.storagePaths).toBeNull();
  });

  it('externaliza corpos grandes com caminho opaco e prévia limitada', () => {
    const html = 'á'.repeat(Math.ceil(INLINE_BODY_MAX_BYTES / 2) + 1);
    const body = prepareReceivedEmailBody({ emailId: 'mail/with-sensitive-data', html, text: '' });
    expect(body.mode).toBe('storage');
    expect(body.html).toBe('');
    expect(body.storagePaths.html).toMatch(/^emails\/received\/[a-f0-9]{64}\/body\.html$/);
    expect(body.storagePaths.html).not.toContain('mail/with-sensitive-data');
    expect(Buffer.byteLength(body.preview, 'utf8')).toBeLessThanOrEqual(24 * 1024);
  });

  it('omite somente o corpo acima do teto e mantém tamanho/causa para a interface', () => {
    const body = prepareReceivedEmailBody({ emailId: 'large', html: 'x'.repeat(MAX_RECEIVED_BODY_BYTES + 1), text: '' });
    expect(body.mode).toBe('omitted');
    expect(body.reason).toBe('size_limit');
    expect(body.totalBytes).toBe(MAX_RECEIVED_BODY_BYTES + 1);
    expect(body.files).toEqual([]);
  });

  it('remove objetos já gravados se a gravação de um segundo objeto falhar', async () => {
    const plan = prepareReceivedEmailBody({
      emailId: 'mail-2', html: 'h'.repeat(INLINE_BODY_MAX_BYTES), text: 't'.repeat(100),
    });
    const saved: string[] = [];
    const deleted: string[] = [];
    const bucket = {
      file(path: string) {
        return {
          async save() { if (path.endsWith('body.txt')) throw new Error('storage down'); saved.push(path); },
          async delete() { deleted.push(path); },
        };
      },
    };
    await expect(persistReceivedEmailBody(bucket, plan)).rejects.toThrow('storage down');
    expect(saved).toHaveLength(1);
    expect(deleted).toEqual(saved);
  });
});
