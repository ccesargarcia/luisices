const crypto = require('crypto');
const zlib = require('zlib');

const INLINE_BODY_MAX_BYTES = 700 * 1024;
const MAX_RECEIVED_BODY_BYTES = 15 * 1024 * 1024;
const BODY_PREVIEW_MAX_BYTES = 24 * 1024;

function bodyPreview(text, html) {
  const source = typeof text === 'string' && text.trim()
    ? text
    : (typeof html === 'string' ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '');
  let preview = '';
  let bytes = 0;
  for (const character of source) {
    const characterBytes = Buffer.byteLength(character, 'utf8');
    if (bytes + characterBytes > BODY_PREVIEW_MAX_BYTES) break;
    preview += character;
    bytes += characterBytes;
  }
  return preview;
}

function prepareReceivedEmailBody({ emailId, html, text, reservedBytes = 0 }) {
  const safeHtml = typeof html === 'string' ? html : '';
  const safeText = typeof text === 'string' ? text : '';
  const htmlBytes = Buffer.byteLength(safeHtml, 'utf8');
  const textBytes = Buffer.byteLength(safeText, 'utf8');
  const totalBytes = htmlBytes + textBytes;

  const safeReservedBytes = Number.isFinite(reservedBytes) && reservedBytes > 0 ? reservedBytes : 0;
  const preview = bodyPreview(safeText, safeHtml);
  const previewBytes = Buffer.byteLength(preview, 'utf8');
  if (totalBytes + safeReservedBytes + previewBytes <= INLINE_BODY_MAX_BYTES) {
    return {
      mode: 'inline', html: safeHtml, text: safeText, totalBytes,
      preview, storagePaths: null, files: [],
    };
  }

  if (totalBytes > MAX_RECEIVED_BODY_BYTES) {
    return {
      mode: 'omitted', html: '', text: '', totalBytes, preview,
      storagePaths: null, files: [], reason: 'size_limit',
    };
  }

  const digest = crypto.createHash('sha256').update(String(emailId)).digest('hex');
  const basePath = `emails/received/${digest}`;
  const files = [];
  const storagePaths = {};
  if (safeHtml) {
    storagePaths.html = `${basePath}/body.html`;
    files.push({ path: storagePaths.html, content: safeHtml, contentType: 'text/html; charset=utf-8' });
  }
  if (safeText) {
    storagePaths.text = `${basePath}/body.txt`;
    files.push({ path: storagePaths.text, content: safeText, contentType: 'text/plain; charset=utf-8' });
  }
  return {
    mode: 'storage', html: '', text: '', totalBytes, preview,
    storagePaths, files,
  };
}

async function persistReceivedEmailBody(bucket, plan) {
  const saved = [];
  try {
    for (const file of plan.files) {
      const compressed = zlib.gzipSync(Buffer.from(file.content, 'utf8'));
      await bucket.file(file.path).save(compressed, {
        resumable: false,
        metadata: {
          contentType: file.contentType,
          contentEncoding: 'gzip',
          cacheControl: 'private, max-age=86400, immutable',
        },
      });
      saved.push(file.path);
    }
    return plan.storagePaths;
  } catch (error) {
    await Promise.all(saved.map((path) => bucket.file(path).delete({ ignoreNotFound: true }).catch(() => {})));
    throw error;
  }
}

module.exports = {
  INLINE_BODY_MAX_BYTES,
  MAX_RECEIVED_BODY_BYTES,
  prepareReceivedEmailBody,
  persistReceivedEmailBody,
};
