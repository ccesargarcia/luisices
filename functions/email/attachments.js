// Only reads objects in this project's bucket. Never fetch arbitrary client URLs.
const MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024;

/**
 * Validação rigorosa no servidor da assinatura binária de arquivos (magic bytes).
 * Impede que anexos maliciosos (executáveis, scripts, arquivos corrompidos) sejam processados e distribuídos pelo backend.
 */
function detectBufferMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // GIF: 47 49 46 38 ('GIF8')
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }
  // PDF: 25 50 44 46 ('%PDF')
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }
  // WebP: RIFF (52 49 46 46) em 0..3 e WEBP (57 45 42 50) em 8..11
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
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

    const detectedMime = detectBufferMime(content);
    if (!detectedMime) {
      throw new Error(`O anexo "${attachment.name}" possui formato binário não suportado ou inválido (permitido apenas imagens e PDF).`);
    }

    const filename = attachment.name.replace(/[\r\n/\\]/g, '_').slice(0, 200) || 'anexo';
    result.push({ filename, path, content: content.toString('base64') });
  }
  return result;
}

module.exports = { prepareAttachments, attachmentPath, MAX_ATTACHMENT_BYTES, detectBufferMime };
