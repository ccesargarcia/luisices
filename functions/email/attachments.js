// Only reads objects in this project's bucket. Never fetch arbitrary client URLs.
const MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024;

/**
 * Allowlist estrita de tipos MIME permitidos para anexos de e-mail.
 */
const ALLOWED_ATTACHMENT_MIMES = Object.freeze([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

/**
 * Extensões canônicas seguras atribuídas a cada formato MIME.
 */
const CANONICAL_EXTENSIONS = Object.freeze({
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
});

/**
 * Extensões compatíveis e aceitáveis para cada formato MIME.
 */
const COMPATIBLE_EXTENSIONS = Object.freeze({
  'application/pdf': new Set(['pdf']),
  'image/png': new Set(['png']),
  'image/jpeg': new Set(['jpg', 'jpeg', 'jpe']),
  'image/webp': new Set(['webp']),
  'image/gif': new Set(['gif']),
});

/**
 * Validação estrutural de assinatura binária (magic bytes) no servidor.
 * Determina o MIME estritamente pelos bytes reais do arquivo baixado do Firebase Storage,
 * rejeitando executáveis (MZ, ELF), buffers truncados ou assinaturas apenas parciais.
 *
 * @param {Buffer} buffer
 * @returns {{ ok: true, mime: string, extension: string } | { ok: false, error: string }}
 */
function detectBufferMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 14) {
    return { ok: false, error: 'Arquivo vazio, truncado ou buffer corrompido.' };
  }

  // Bloqueio explícito de executáveis Windows (PE/DOS MZ)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { ok: false, error: 'Executáveis e scripts binários são estritamente proibidos.' };
  }

  // Bloqueio explícito de executáveis Linux/Unix (ELF: 0x7F 'E' 'L' 'F')
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { ok: false, error: 'Executáveis e scripts binários são estritamente proibidos.' };
  }

  // 1. PDF: obrigatoriamente '%PDF-' nos 5 primeiros bytes (mínimo de 24 bytes para estrutura básica)
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 && // F
    buffer[4] === 0x2d    // -
  ) {
    return { ok: true, mime: 'application/pdf', extension: CANONICAL_EXTENSIONS['application/pdf'] };
  }

  // 2. PNG: 8 bytes canônicos + primeiro chunk IHDR (a partir do byte 12)
  if (
    buffer.length >= 16 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    // Validação estrutural do primeiro chunk: deve ser IHDR
    if (buffer[12] === 0x49 && buffer[13] === 0x48 && buffer[14] === 0x44 && buffer[15] === 0x52) {
      return { ok: true, mime: 'image/png', extension: CANONICAL_EXTENSIONS['image/png'] };
    }
    return { ok: false, error: 'Estrutura de imagem PNG truncada ou inválida.' };
  }

  // 3. JPEG / JPG: Marcador SOI (FF D8 FF) seguido de marcador válido (APPn E0..EF, DQT DB, SOF C0..C3, etc.)
  if (
    buffer.length >= 16 &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff &&
    ((buffer[3] >= 0xe0 && buffer[3] <= 0xef) || buffer[3] === 0xdb || (buffer[3] >= 0xc0 && buffer[3] <= 0xc3) || buffer[3] === 0xfe)
  ) {
    return { ok: true, mime: 'image/jpeg', extension: CANONICAL_EXTENSIONS['image/jpeg'] };
  }

  // 4. GIF: Assinatura canônica completa GIF87a ou GIF89a
  if (
    buffer.length >= 14 &&
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { ok: true, mime: 'image/gif', extension: CANONICAL_EXTENSIONS['image/gif'] };
  }

  // 5. WebP: Contêiner RIFF com FourCC WEBP e sub-chunk válido (VP8 , VP8L, VP8X)
  if (
    buffer.length >= 16 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50  // WEBP
  ) {
    const isVp8 = buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && // VP8
      (buffer[15] === 0x20 || buffer[15] === 0x4c || buffer[15] === 0x58); // ' ', 'L', 'X'
    if (isVp8) {
      return { ok: true, mime: 'image/webp', extension: CANONICAL_EXTENSIONS['image/webp'] };
    }
    return { ok: false, error: 'Estrutura de imagem WebP truncada ou inválida.' };
  }

  return { ok: false, error: 'Formato não suportado. Permitido apenas PDF e imagens (JPEG, PNG, WebP, GIF).' };
}

/**
 * Normaliza o nome do anexo associando uma extensão canônica/compatível coerente com o MIME detectado.
 * Impede que arquivos mascarados (ex.: 'documento.exe' com bytes de PDF) preservem extensões perigosas ou divergentes.
 *
 * @param {string} rawName - Nome fornecido pelo cliente
 * @param {string} detectedMime - MIME validado estruturalmente no buffer
 * @returns {string} Nome de arquivo higienizado com extensão compatível
 */
function resolveSafeAttachmentFilename(rawName, detectedMime) {
  const canonicalExt = CANONICAL_EXTENSIONS[detectedMime] || 'bin';
  const compatibleSet = COMPATIBLE_EXTENSIONS[detectedMime] || new Set();

  if (typeof rawName !== 'string') return `anexo.${canonicalExt}`;

  // Se o nome contiver separadores de diretório (/ ou \), extrai apenas o segmento final (basename)
  const segments = rawName.split(/[/\\]+/).filter(Boolean);
  const baseSegment = segments.length ? segments[segments.length - 1] : 'anexo';

  // Sanitizar caracteres de controle e nulos
  const clean = baseSegment.replace(/[\r\n\0]/g, '').trim();

  const extMatch = clean.match(/\.([a-zA-Z0-9_-]+)$/);
  const providedExt = extMatch ? extMatch[1].toLowerCase() : '';
  const rawBase = extMatch ? clean.slice(0, extMatch.index) : clean;

  // Higienizar caracteres no nome base
  const safeBase = rawBase
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 150) || 'anexo';

  // Se a extensão fornecida for compatível com o MIME real (ex: .jpg ou .jpeg para image/jpeg), preserva
  if (providedExt && compatibleSet.has(providedExt)) {
    return `${safeBase}.${providedExt}`;
  }

  // Caso contrário (extensão ausente, incompatível ou perigosa como .exe), força a extensão canônica
  return `${safeBase}.${canonicalExt}`;
}

function attachmentPath(url, bucketName, projectId) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('URL de anexo inválida.');
  let rawPath = '';
  if (parsed.hostname === 'firebasestorage.googleapis.com') {
    const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (match && decodeURIComponent(match[1]) === bucketName) {
      rawPath = decodeURIComponent(match[2]);
    }
  } else {
    const cdn = projectId === 'luisices-dev' ? 'cdn-dev.luisices.com.br' : 'cdn.luisices.com.br';
    if (parsed.hostname === cdn && !parsed.port) {
      rawPath = decodeURIComponent(parsed.pathname.slice(1));
    }
  }
  if (!rawPath) {
    throw new Error('O anexo deve pertencer ao Storage deste projeto.');
  }

  // Sanitização estrita contra path-traversal e codificações anômalas
  let decoded = rawPath;
  try {
    while (decoded.includes('%')) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {}

  const normalized = decoded.replace(/\\/g, '/');
  if (normalized.includes('\0') || normalized.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('Caminho de anexo não permitido.');
  }
  return normalized;
}

async function prepareAttachments({ attachments = [], bucket, db, uid, profile, projectId }) {
  if (!profile || typeof profile !== 'object') throw new Error('Perfil do usuário não encontrado.');
  if (!Array.isArray(attachments) || attachments.length > 10) throw new Error('Envie no máximo 10 anexos.');
  const result = [];
  let totalBytes = 0;
  for (const attachment of attachments) {
    if (!attachment || typeof attachment.url !== 'string' || typeof attachment.name !== 'string') {
      throw new Error('Anexo inválido.');
    }
    const path = attachmentPath(attachment.url, bucket.name, projectId);
    const match = path.match(/^users\/([^/]+)\/(?:orders\/([^/]+)|emails)\/.+$/);
    if (!match || path.split('/').some(part => part === '.' || part === '..')) throw new Error('Caminho de anexo não permitido.');
    const [, ownerUid, orderId] = match;
    let allowed = uid === ownerUid || profile.role === 'admin';
    if (!allowed && orderId && orderId !== 'email_draft') {
      const order = await db.doc(`orders/${orderId}`).get();
      const data = order.exists ? order.data() : null;
      allowed = data && (data.userId === uid || (profile.role === 'funcionario'
        && data.assignedTo === uid && profile.permissions?.orders?.view === true));
    }
    if (!allowed) throw new Error('Sem permissão para compartilhar este anexo.');
    const file = bucket.file(path);
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size);
    if (!Number.isFinite(size) || size < 0 || totalBytes + size > MAX_ATTACHMENT_BYTES) {
      throw new Error('Os anexos juntos não podem ultrapassar 18 MB.');
    }
    // Pin the generation inspected above, so replacing the object cannot bypass the size check.
    const [content] = await bucket.file(path, { generation: metadata.generation }).download();
    totalBytes += content.length;
    if (totalBytes > MAX_ATTACHMENT_BYTES) throw new Error('Os anexos juntos não podem ultrapassar 18 MB.');

    const detection = detectBufferMime(content);
    if (!detection.ok) {
      const safeDisplayName = attachment.name.replace(/[\r\n\0/\\]/g, '_').slice(0, 80) || 'anexo';
      throw new Error(`O anexo "${safeDisplayName}" possui formato inválido ou não suportado (permitido apenas imagens e PDF).`);
    }

    const filename = resolveSafeAttachmentFilename(attachment.name, detection.mime);
    result.push({
      filename,
      path,
      content: content.toString('base64'),
      contentType: detection.mime,
      size: content.length,
    });
  }
  return result;
}

module.exports = {
  prepareAttachments,
  attachmentPath,
  MAX_ATTACHMENT_BYTES,
  detectBufferMime,
  resolveSafeAttachmentFilename,
  ALLOWED_ATTACHMENT_MIMES,
  CANONICAL_EXTENSIONS,
  COMPATIBLE_EXTENSIONS,
};
