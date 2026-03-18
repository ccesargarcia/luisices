const { Logging } = require('@google-cloud/logging');
const logging = new Logging();

// HTTP function that writes a structured entry to Cloud Logging
exports.logCustom = async (req, res) => {
  try {
    const body = req.method === 'GET' ? req.query : req.body || {};
    const message = body.message || 'no-message';
    const level = (body.level || 'INFO').toUpperCase();
    const context = body.context || {};

    const log = logging.log('luisices-app-log');
    const resource = { type: 'global' };

    const entry = log.entry({ resource, severity: level }, {
      message,
      context,
      timestamp: new Date().toISOString(),
    });

    await log.write(entry);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Cloud Function logCustom error:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
};
