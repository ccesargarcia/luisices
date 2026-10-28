async function fetchWhatsAppInstanceStatus({ apiKey, instance, apiUrl, fetchImpl = fetch }) {
  if (!apiKey) {
    return {
      connected: false,
      state: 'missing_key',
      instance,
      message: 'Chave de integração não configurada.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetchImpl(
      `${apiUrl}/instance/connectionState/${encodeURIComponent(instance)}`,
      { method: 'GET', headers: { apikey: apiKey }, signal: controller.signal }
    );
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const state = data?.instance?.state || data?.state || 'unknown';
      return { connected: state === 'open', state, instance };
    }

    return { connected: false, state: 'error', status: response.status, instance };
  } catch (error) {
    return { connected: false, state: 'unreachable', error: error.message, instance };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { fetchWhatsAppInstanceStatus };
