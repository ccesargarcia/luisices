import { createRequire } from 'node:module';
import { describe, it, expect, vi } from 'vitest';
import { deflateSync } from 'node:zlib';
const require = createRequire(import.meta.url);
const {
  prepareAttachments,
  attachmentPath,
  MAX_ATTACHMENT_BYTES,
  detectBufferMime,
  resolveSafeAttachmentFilename,
} = require('../../functions/email/attachments.js');

const bucketName = 'luisices-dev.firebasestorage.app';
const url = (path: string, bucket = bucketName) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=not-authority`;

// Fixtures completas o bastante para verificar a estrutura dos formatos aceitos.
function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type), data]);
  const chunk = Buffer.alloc(4);
  chunk.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([chunk, body, crc]);
}
function makePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const pixels = deflateSync(Buffer.from([0, 0xff, 0, 0, 0xff]));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', pixels), pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
function jpegSegment(marker: number, data: Buffer): Buffer {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(data.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), length, data]);
}
function makeJpeg(): Buffer {
  const app0 = Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'binary');
  const frame = Buffer.from([8, 0, 1, 0, 1, 1, 1, 0x11, 0]);
  const scan = Buffer.from([1, 1, 0, 0, 63, 0]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]), jpegSegment(0xe0, app0), jpegSegment(0xc0, frame),
    jpegSegment(0xda, scan), Buffer.from([0x00, 0xff, 0xd9]),
  ]);
}
function makeGif(): Buffer {
  return Buffer.concat([
    Buffer.from('GIF89a'), Buffer.from([1, 0, 1, 0, 0x80, 0, 0]),
    Buffer.from([0, 0, 0, 0xff, 0xff, 0xff]),
    Buffer.from([0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0, 0x3b]),
  ]);
}
function makeWebp(): Buffer {
  const frame = Buffer.from([0, 0, 0, 0x9d, 0x01, 0x2a, 1, 0, 1, 0]);
  const size = Buffer.alloc(4);
  size.writeUInt32LE(4 + 8 + frame.length);
  const chunkSize = Buffer.alloc(4);
  chunkSize.writeUInt32LE(frame.length);
  return Buffer.concat([Buffer.from('RIFF'), size, Buffer.from('WEBPVP8 '), chunkSize, frame]);
}
function makePdf(): Buffer {
  let pdf = '%PDF-1.4\n';
  const objectOffset = Buffer.byteLength(pdf);
  pdf += '1 0 obj\n<< /Type /Catalog >>\nendobj\n';
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 2\n0000000000 65535 f \n${String(objectOffset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
const VALID_PDF = makePdf();
const VALID_PNG = makePng();
const VALID_JPEG = makeJpeg();
const VALID_WEBP = makeWebp();
const VALID_GIF = makeGif();

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

  it('rejeita arquivos que só imitam o prefixo conhecido, sem estrutura completa', () => {
    const forgedPdf = Buffer.alloc(64, 0x41);
    Buffer.from('%PDF-1.4').copy(forgedPdf);
    const forgedPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...new Array(48).fill(0)]);
    const forgedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, ...new Array(48).fill(0)]);
    const forgedWebp = Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 ' + 'x'.repeat(40), 'binary');
    const forgedGif = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00' + 'x'.repeat(30), 'binary');
    for (const forged of [forgedPdf, forgedPng, forgedJpeg, forgedWebp, forgedGif]) {
      expect(detectBufferMime(forged).ok).toBe(false);
    }
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
