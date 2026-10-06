import { assertFails } from '@firebase/rules-unit-testing';

/** For sequential rules tests: discard denial logs only after the assertion passes. */
export async function assertPermissionDenied(operation: () => Promise<unknown>): Promise<void> {
  const buffered: Array<() => void> = [];
  const originals = { warn: console.warn, error: console.error };
  for (const method of ['warn', 'error'] as const) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      const message = args.map(String).join(' ');
      if (message.includes('@firebase/firestore:') && /\bPERMISSION_DENIED\b/.test(message)) {
        buffered.push(() => original(...args));
      } else {
        original(...args);
      }
    };
  }

  try {
    await assertFails(operation());
  } catch (error) {
    // Retain all diagnostics when the expected denial is not confirmed.
    buffered.forEach((write) => write());
    throw error;
  } finally {
    console.warn = originals.warn;
    console.error = originals.error;
  }
}
