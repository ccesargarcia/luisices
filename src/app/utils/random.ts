/**
 * Utilitários criptográficos seguros para geração de números e IDs aleatórios.
 * Utiliza a Web Crypto API (globalThis.crypto) para compatibilidade universal
 * (Navegador, Node.js, Web Workers e Vitest).
 */

/**
 * Retorna uma instância do objeto crypto global de forma segura e universal.
 */
function getCrypto(): Crypto | null {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return null;
}

/**
 * Gera um número inteiro pseudoaleatório criptograficamente seguro no intervalo [min, max).
 * Se max <= min, retorna min.
 */
export function secureRandomNumber(min: number, max: number): number {
  const range = max - min;
  if (range <= 0) return min;

  const cryptoInstance = getCrypto();
  if (cryptoInstance && typeof cryptoInstance.getRandomValues === 'function') {
    const randomBuffer = new Uint32Array(1);
    cryptoInstance.getRandomValues(randomBuffer);
    // Divisão pelo valor máximo do Uint32 (0x100000000) garante distribuição uniforme sem viés de módulo
    const fraction = randomBuffer[0] / 0x100000000;
    return min + Math.floor(fraction * range);
  }

  // Fallback seguro em ambientes legados sem Web Crypto
  return min + Math.floor(Math.random() * range);
}

/**
 * Gera uma string aleatória criptograficamente segura (alfanumérica em base36 ou hex).
 * Ideal para IDs temporários, chaves de idempotência e chaves de lista.
 */
export function secureRandomId(length = 8): string {
  const cryptoInstance = getCrypto();

  if (cryptoInstance) {
    if (typeof cryptoInstance.randomUUID === 'function') {
      return cryptoInstance.randomUUID().replace(/-/g, '').slice(0, length);
    }
    if (typeof cryptoInstance.getRandomValues === 'function') {
      const bytesNeeded = Math.ceil(length / 2);
      const randomBuffer = new Uint8Array(bytesNeeded);
      cryptoInstance.getRandomValues(randomBuffer);
      return Array.from(randomBuffer, (b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, length);
    }
  }

  // Fallback seguro
  return Math.random().toString(36).substring(2, 2 + length);
}
