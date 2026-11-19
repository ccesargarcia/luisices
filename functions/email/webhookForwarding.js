const { createForwardSignature } = require('./webhookSecurity');

async function forwardVerifiedWebhook({
  url,
  source,
  webhookSecret,
  originToken,
  svixId,
  svixTimestamp,
  svixSignature,
  rawContent,
  releaseClaim,
  fetchImpl = fetch,
  logger = console,
}) {
  let claimReleaseAttempted = false;
  const release = async () => {
    if (claimReleaseAttempted) return;
    claimReleaseAttempted = true;
    try {
      await releaseClaim();
    } catch (error) {
      logger.error('[resendReceivingWebhook] Não foi possível liberar a reserva do evento:', error);
    }
  };

  try {
    const headers = {
      'content-type': 'application/json',
      'x-forwarded-from': source,
      'x-luisices-forward-signature': `v1,${createForwardSignature({
        secret: webhookSecret,
        source,
        svixId,
        svixTimestamp,
        rawContent,
      })}`,
    };
    if (originToken) {
      headers['x-origin-secret'] = originToken;
      headers['x-cf-origin-token'] = originToken;
    }
    if (svixId) headers['svix-id'] = svixId;
    if (svixTimestamp) headers['svix-timestamp'] = svixTimestamp;
    if (svixSignature) headers['svix-signature'] = svixSignature;

    const response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: rawContent,
    });
    const responseBody = await response.json().catch(() => ({}));
    logger.log('[resendReceivingWebhook] Resultado do encaminhamento:', response.status, responseBody);
    if (!response.ok) {
      await release();
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    logger.error('[resendReceivingWebhook] Falha no encaminhamento interno:', error);
    await release();
    return { ok: false };
  }
}

module.exports = { forwardVerifiedWebhook };
