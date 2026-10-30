// Only reads objects in this project's bucket. Never fetch arbitrary client URLs.
const MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024;

const {
  ALLOWED_ATTACHMENT_MIMES,
  CANONICAL_EXTENSIONS,
  COMPATIBLE_EXTENSIONS,
  detectBufferMime,
} = require('./fileValidation');

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
