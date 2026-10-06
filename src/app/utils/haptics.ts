/**
 * Utilitário de Feedback Tátil (Haptic Feedback) para dispositivos touch / mobile.
 * Oferece retorno tátil físico imediato através da Vibration API com fallback silencioso.
 */
export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error';

export function triggerHaptic(type: HapticPattern = 'light'): void {
  if (typeof window === 'undefined' || !('navigator' in window) || typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    switch (type) {
      case 'selection':
      case 'light':
        // Vibração ultra curta e nítida (10ms) para toques imediatos
        navigator.vibrate(10);
        break;
      case 'medium':
        // Clique tátil perceptível para botões de ação (20ms)
        navigator.vibrate(20);
        break;
      case 'heavy':
        // Ação principal / salvamento (35ms)
        navigator.vibrate(35);
        break;
      case 'success':
        // Pulso duplo de sucesso (15ms - pausa 40ms - 25ms)
        navigator.vibrate([15, 40, 25]);
        break;
      case 'warning':
        // Pulso de alerta
        navigator.vibrate([25, 50, 25]);
        break;
      case 'error':
        // Pulso triplo de erro
        navigator.vibrate([30, 40, 30, 40, 30]);
        break;
    }
  } catch {
    // Silencioso em navegadores ou contextos sem permissão
  }
}
