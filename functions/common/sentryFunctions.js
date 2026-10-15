/** Firebase v2 trigger wrappers that report unexpected handler failures. */
const { Sentry } = require('./sentry');
const firebaseHttps = require('firebase-functions/v2/https');
const firebaseScheduler = require('firebase-functions/v2/scheduler');

const EXPECTED_HTTPS_CODES = new Set([
  'cancelled', 'invalid-argument', 'deadline-exceeded', 'not-found',
  'already-exists', 'permission-denied', 'resource-exhausted', 'failed-precondition',
  'aborted', 'unauthenticated',
]);

function reportUnexpected(error, trigger) {
  if (!Sentry.getClient()) return Promise.resolve();
  if (EXPECTED_HTTPS_CODES.has(error?.code)) return Promise.resolve();
  Sentry.withScope((scope) => {
    scope.setTag('firebase.trigger', trigger);
    Sentry.captureException(error);
  });
  return Sentry.flush(1500).catch(() => false);
}

function wrapHandler(handler, trigger) {
  return function sentryWrappedHandler(...args) {
    let result;
    try {
      result = handler.apply(this, args);
    } catch (error) {
      return reportUnexpected(error, trigger).then(() => { throw error; });
    }
    return Promise.resolve(result).catch(async (error) => {
      await reportUnexpected(error, trigger);
      throw error;
    });
  };
}

function wrapFactory(factory, trigger) {
  return (...args) => {
    if (args.length === 1) return factory(wrapHandler(args[0], trigger));
    return factory(args[0], wrapHandler(args[1], trigger));
  };
}

module.exports = {
  onCall: wrapFactory(firebaseHttps.onCall, 'callable'),
  onRequest: wrapFactory(firebaseHttps.onRequest, 'http'),
  onSchedule: wrapFactory(firebaseScheduler.onSchedule, 'schedule'),
};
