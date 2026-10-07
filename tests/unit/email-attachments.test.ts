import { createRequire } from 'node:module';
import { describe, it, expect, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { prepareAttachments, attachmentPath, MAX_ATTACHMENT_BYTES } = require('../../functions/email/attachments.js');
const bucketName = 'luisices-dev.firebasestorage.app';
const url = (path: string, bucket = bucketName) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=not-authority`;
function fixture() {
  const download = vi.fn().mockResolvedValue([Buffer.from('PDF')]);
  const getMetadata = vi.fn().mockResolvedValue([{ size: '3', generation: '123' }]);
  const bucket = { name: bucketName, file: vi.fn(() => ({ getMetadata, download })) };
  const get = vi.fn().mockResolvedValue({ exists: false });
  const db = { doc: vi.fn(() => ({ get })) };
  return { bucket, db, get, getMetadata, download, uid: 'owner', profile: { role: 'user' }, projectId: 'luisices-dev' };
}
describe('anexos privados enviados pelo backend', () => {
  it('envia o conteúdo real e fixa a geração inspecionada', async () => {
    const f = fixture();
    const path = 'users/owner/orders/email_draft/file.pdf';
    expect(await prepareAttachments({ ...f, attachments: [{ name: 'file.pdf', url: url(path) }] }))
      .toEqual([{ filename: 'file.pdf', path, content: Buffer.from('PDF').toString('base64') }]);
    expect(f.bucket.file).toHaveBeenCalledWith(path, { generation: '123' });
  });
  it('não aceita token ou CDN como autorização para ler rascunho de outro usuário', async () => {
    const f = fixture();
    await expect(prepareAttachments({ ...f, attachments: [{ name: 'x', url: url('users/other/orders/email_draft/x') }] })).rejects.toThrow('Sem permissão');
    expect(f.download).not.toHaveBeenCalled();
  });
  it('rejeita URLs externas, buckets alheios e paths de secrets/arquivos não anexáveis', async () => {
    for (const link of ['https://attacker.test/a', 'http://localhost/a', url('users/owner/orders/email_draft/x', 'other'), url('private/file')]) {
      const f = fixture();
      await expect(prepareAttachments({ ...f, attachments: [{ name: 'x', url: link }] })).rejects.toThrow();
      expect(f.download).not.toHaveBeenCalled();
    }
  });
  it('limita tamanho agregado antes do download seguinte', async () => {
    const f = fixture();
    f.getMetadata.mockResolvedValue([{ size: String(MAX_ATTACHMENT_BYTES + 1) }]);
    await expect(prepareAttachments({ ...f, attachments: [{ name: 'x', url: url('users/owner/emails/x') }] })).rejects.toThrow('18 MB');
    expect(f.download).not.toHaveBeenCalled();
  });
  it('permite compartilhar anexo de pedido atribuído ao funcionário autorizado', async () => {
    const f = fixture();
    f.get.mockResolvedValue({ exists: true, data: () => ({ assignedTo: 'employee' }) });
    const attachments = [{ name: 'x', url: url('users/other/orders/order-1/x') }];
    await expect(prepareAttachments({ ...f, attachments, uid: 'employee', profile: { role: 'funcionario', permissions: { orders: { view: true } } } })).resolves.toHaveLength(1);
  });
  it('aceita apenas a CDN do ambiente correto', () => {
    expect(attachmentPath('https://cdn-dev.luisices.com.br/users/owner/emails/a.pdf', bucketName, 'luisices-dev')).toBe('users/owner/emails/a.pdf');
    expect(() => attachmentPath('https://cdn.luisices.com.br/users/owner/emails/a.pdf', bucketName, 'luisices-dev')).toThrow();
  });
});
