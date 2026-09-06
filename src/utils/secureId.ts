export function generateSecureId(): string {
  // Use crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback using crypto.getRandomValues if randomUUID is not available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, dec => ('00000000' + dec.toString(16)).slice(-8)).join('');
  }

  // Last resort fallback (though less secure, it prevents catastrophic failure if crypto is completely unavailable)
  // This is highly unlikely in modern environments, but good practice.
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
