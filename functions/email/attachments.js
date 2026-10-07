// Only reads objects in this project's bucket. Never fetch arbitrary client URLs.
const MAX_ATTACHMENT_BYTES = 18 * 1024 * 1024;

function attachmentPath(url, bucketName, projectId) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('URL de anexo inválida.');
  if (parsed.hostname === 'firebasestorage.googleapis.com') {
    const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (match && decodeURIComponent(match[1]) === bucketName) return decodeURIComponent(match[2]);
  }
  const cdn = projectId === 'luisices-dev' ? 'cdn-dev.luisices.com.br' : 'cdn.luisices.com.br';
  if (parsed.hostname === cdn && !parsed.port) return decodeURIComponent(parsed.pathname.slice(1));
  throw new Error('O anexo deve pertencer ao Storage deste projeto.');
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
    const filename = attachment.name.replace(/[\r\n/\\]/g, '_').slice(0, 200) || 'anexo';
    result.push({ filename, path, content: content.toString('base64') });
  }
  return result;
}

module.exports = { prepareAttachments, attachmentPath, MAX_ATTACHMENT_BYTES };
