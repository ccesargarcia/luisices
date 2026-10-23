import { createRequire } from 'node:module';
import { describe, it, expect, vi } from 'vitest';
const require = createRequire(import.meta.url);
const {
  prepareAttachments,
  attachmentPath,
  MAX_ATTACHMENT_BYTES,
  detectBufferMime,
  resolveSafeAttachmentFilename,
  ALLOWED_ATTACHMENT_MIMES,
  CANONICAL_EXTENSIONS,
} = require('../../functions/email/attachments.js');

const bucketName = 'luisices-dev.firebasestorage.app';
const url = (path: string, bucket = bucketName) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=not-authority`;

// Buffers estruturalmente válidos para testes
const VALID_PDF = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
const VALID_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
]);
const VALID_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
]);
const VALID_WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
]);
const VALID_GIF = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0xff,
]);

function fixture(buffer = VALID_PDF) {
  const download = vi.fn().mockResolvedValue([buffer]);
  const getMetadata = vi.fn().mockResolvedValue([{ size: String(buffer.length), generation: '123' }]);
  const bucket = { name: bucketName, file: vi.fn(() => ({ getMetadata, download })) };
  const get = vi.fn().mockResolvedValue({ exists: false });
  const db = { doc: vi.fn(() => ({ get })) };
  return { bucket, db, get, getMetadata, download, uid: 'owner', profile: { role: 'user' }, projectId: 'luisices-dev' };
}

describe('anexos privados enviados pelo backend', () => {
  it('envia o conteúdo real com MIME validado e fixa a geração inspecionada', async () => {
    const f = fixture(VALID_PDF);
    const path = 'users/owner/orders/email_draft/file.pdf';
    expect(await prepareAttachments({ ...f, attachments: [{ name: 'file.pdf', url: url(path) }] }))
      .toEqual([{
        filename: 'file.pdf',
        path,
        content: VALID_PDF.toString('base64'),
        contentType: 'application/pdf',
        size: VALID_PDF.length,
      }]);
    expect(f.bucket.file).toHaveBeenCalledWith(path, { generation: '123' });
  });

  it('normaliza a extensão do arquivo quando o cliente fornece extensão divergente do conteúdo real', async () => {
    const f = fixture(VALID_PNG);
    const path = 'users/owner/orders/email_draft/foto.exe';
    // O anexo tem bytes de PNG mas o nome é 'foto.exe'
    const [result] = await prepareAttachments({
      ...f,
      attachments: [{ name: 'foto.exe', url: url(path) }],
    });
    // O backend higieniza o nome e substitui a extensão para .png com contentType image/png
    expect(result.filename).toBe('foto.png');
    expect(result.contentType).toBe('image/png');
  });

  it('preserva extensões compatíveis aceitas (ex: .jpeg para image/jpeg)', async () => {
    const f = fixture(VALID_JPEG);
    const path = 'users/owner/orders/email_draft/foto.jpeg';
    const [result] = await prepareAttachments({
      ...f,
      attachments: [{ name: 'foto.jpeg', url: url(path) }],
    });
    expect(result.filename).toBe('foto.jpeg');
    expect(result.contentType).toBe('image/jpeg');
  });

  it('atribui extensão canônica quando o nome original não possui extensão', async () => {
    const f = fixture(VALID_WEBP);
    const path = 'users/owner/orders/email_draft/arte_sem_extensao';
    const [result] = await prepareAttachments({
      ...f,
      attachments: [{ name: 'arte_sem_extensao', url: url(path) }],
    });
    expect(result.filename).toBe('arte_sem_extensao.webp');
    expect(result.contentType).toBe('image/webp');
  });

  it('rejeita executáveis Windows (MZ) e Linux (ELF) com mensagem segura sem vazar paths internos', async () => {
    const f = fixture();
    // Executável Windows PE/DOS
    f.download.mockResolvedValue([Buffer.from('MZ\x90\x00' + 'x'.repeat(30))]);
    await expect(prepareAttachments({
      ...f,
      attachments: [{ name: 'malware.exe', url: url('users/owner/orders/email_draft/malware.exe') }],
    })).rejects.toThrow('O anexo "malware.exe" possui formato inválido ou não suportado (permitido apenas imagens e PDF).');

    // Executável Linux ELF
    f.download.mockResolvedValue([Buffer.from('\x7fELF' + 'x'.repeat(30))]);
    await expect(prepareAttachments({
      ...f,
      attachments: [{ name: 'script.sh', url: url('users/owner/orders/email_draft/script.sh') }],
    })).rejects.toThrow('O anexo "script.sh" possui formato inválido ou não suportado (permitido apenas imagens e PDF).');
  });

  it('rejeita buffers truncados ou vazios que não atendem ao tamanho estrutural mínimo', async () => {
    const f = fixture();
    // 3 bytes apenas (%PD)
    f.download.mockResolvedValue([Buffer.from('%PD')]);
    await expect(prepareAttachments({
      ...f,
      attachments: [{ name: 'truncado.pdf', url: url('users/owner/orders/email_draft/truncado.pdf') }],
    })).rejects.toThrow(/formato inválido ou não suportado/i);

    // PNG sem chunk IHDR
    f.download.mockResolvedValue([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x41, 0x41, 0x41, 0x41])]);
    await expect(prepareAttachments({
      ...f,
      attachments: [{ name: 'corrompido.png', url: url('users/owner/orders/email_draft/corrompido.png') }],
    })).rejects.toThrow(/formato inválido ou não suportado/i);
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
    const f = fixture(VALID_PDF);
    f.get.mockResolvedValue({ exists: true, data: () => ({ assignedTo: 'employee' }) });
    const attachments = [{ name: 'x.pdf', url: url('users/other/orders/order-1/x.pdf') }];
    await expect(prepareAttachments({ ...f, attachments, uid: 'employee', profile: { role: 'funcionario', permissions: { orders: { view: true } } } })).resolves.toHaveLength(1);
  });

  it('aceita apenas a CDN do ambiente correto', () => {
    expect(attachmentPath('https://cdn-dev.luisices.com.br/users/owner/emails/a.pdf', bucketName, 'luisices-dev')).toBe('users/owner/emails/a.pdf');
    expect(() => attachmentPath('https://cdn.luisices.com.br/users/owner/emails/a.pdf', bucketName, 'luisices-dev')).toThrow();
  });

  it('rejeita tentativas de path traversal com codificação dupla ou bytes nulos', () => {
    expect(() => attachmentPath('https://cdn-dev.luisices.com.br/users/owner/%252e%252e/secrets.json', bucketName, 'luisices-dev')).toThrow();
    expect(() => attachmentPath('https://cdn-dev.luisices.com.br/users/owner/..%2Fsecrets.json', bucketName, 'luisices-dev')).toThrow();
    expect(() => attachmentPath('https://cdn-dev.luisices.com.br/users/owner/emails/file\0.pdf', bucketName, 'luisices-dev')).toThrow();
  });
});

describe('detectBufferMime (validação estrutural de assinaturas no servidor)', () => {
  it('detecta PDF com cabeçalho de versão estrutural', () => {
    const res = detectBufferMime(VALID_PDF);
    expect(res).toEqual({ ok: true, mime: 'application/pdf', extension: 'pdf' });
  });

  it('detecta PNG com assinatura canônica e chunk IHDR', () => {
    const res = detectBufferMime(VALID_PNG);
    expect(res).toEqual({ ok: true, mime: 'image/png', extension: 'png' });
  });

  it('detecta JPEG com marcador SOI e APP0', () => {
    const res = detectBufferMime(VALID_JPEG);
    expect(res).toEqual({ ok: true, mime: 'image/jpeg', extension: 'jpg' });
  });

  it('detecta WebP com RIFF, WEBP e chunk VP8', () => {
    const res = detectBufferMime(VALID_WEBP);
    expect(res).toEqual({ ok: true, mime: 'image/webp', extension: 'webp' });
  });

  it('detecta GIF com assinatura GIF89a', () => {
    const res = detectBufferMime(VALID_GIF);
    expect(res).toEqual({ ok: true, mime: 'image/gif', extension: 'gif' });
  });

  it('rejeita HTML ou texto simples disfarçado', () => {
    const htmlBuffer = Buffer.from('<!DOCTYPE html><html><body><h1>Oi</h1></body></html>');
    const res = detectBufferMime(htmlBuffer);
    expect(res.ok).toBe(false);
  });
});

describe('resolveSafeAttachmentFilename', () => {
  it('preserva base e extensão compatível', () => {
    expect(resolveSafeAttachmentFilename('meu_relatorio.pdf', 'application/pdf')).toBe('meu_relatorio.pdf');
    expect(resolveSafeAttachmentFilename('foto.jpeg', 'image/jpeg')).toBe('foto.jpeg');
    expect(resolveSafeAttachmentFilename('foto.jpg', 'image/jpeg')).toBe('foto.jpg');
    expect(resolveSafeAttachmentFilename('animacao.gif', 'image/gif')).toBe('animacao.gif');
  });

  it('substitui extensões perigosas ou divergentes pela extensão canônica do MIME', () => {
    expect(resolveSafeAttachmentFilename('virus.exe', 'application/pdf')).toBe('virus.pdf');
    expect(resolveSafeAttachmentFilename('script.sh', 'image/png')).toBe('script.png');
    expect(resolveSafeAttachmentFilename('arquivo.pdf', 'image/png')).toBe('arquivo.png');
    expect(resolveSafeAttachmentFilename('foto.gif', 'image/webp')).toBe('foto.webp');
  });

  it('adiciona extensão canônica quando o arquivo não possui extensão', () => {
    expect(resolveSafeAttachmentFilename('fatura_outubro', 'application/pdf')).toBe('fatura_outubro.pdf');
  });

  it('sanitiza caracteres de controle e barras', () => {
    expect(resolveSafeAttachmentFilename('../../../etc/passwd', 'application/pdf')).toBe('passwd.pdf');
    expect(resolveSafeAttachmentFilename('nome\r\ncom\0quebra.pdf', 'application/pdf')).toBe('nomecomquebra.pdf');
  });
});
