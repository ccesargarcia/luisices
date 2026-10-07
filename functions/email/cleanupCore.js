const EMAIL_DRAFT_PREFIX = 'users/';
const EMAIL_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function cleanupEmailDraftFiles(bucket, now = Date.now()) {
  const [files] = await bucket.getFiles({ prefix: EMAIL_DRAFT_PREFIX });
  const expiration = now - EMAIL_DRAFT_MAX_AGE_MS;
  const candidates = files.filter(file => {
    if (!/^users\/[^/]+\/orders\/email_draft\//.test(file.name)) return false;
    const metadata = file.metadata?.metadata || {};
    if (metadata.emailDraft !== 'true') return false;
    const uploadedAt = Number(metadata.uploadedAtMs);
    return Number.isFinite(uploadedAt) && uploadedAt < expiration;
  });
  const results = await Promise.allSettled(candidates.map(file => file.delete({ ignoreNotFound: true })));
  const failed = results.filter(result => result.status === 'rejected');
  if (failed.length) console.error(`[cleanupEmailDrafts] Falha ao remover ${failed.length} arquivo(s).`);
  console.log(`[cleanupEmailDrafts] ${candidates.length - failed.length} arquivo(s) removido(s); ${failed.length} falha(s).`);
  return { removed: candidates.length - failed.length, failed: failed.length };
}

module.exports = { cleanupEmailDraftFiles, EMAIL_DRAFT_MAX_AGE_MS };
