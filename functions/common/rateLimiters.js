/**
 * Instâncias de Rate Limiting centralizadas para proteção contra abusos e DoS.
 */

let RateLimiterMemory;
try {
  ({ RateLimiterMemory } = require('rate-limiter-flexible'));
} catch {
  RateLimiterMemory = class InMemoryRateLimiter {
    constructor({ points, duration }) {
      this.points = points;
      this.durationMs = duration * 1000;
      this.buckets = new Map();
    }
    async consume(key) {
      const now = Date.now();
      const entry = this.buckets.get(key);
      if (!entry || entry.expiresAt <= now) {
        this.buckets.set(key, { count: 1, expiresAt: now + this.durationMs });
        return;
      }
      if (entry.count >= this.points) {
        const err = new Error('Rate limit exceeded');
        err.msBeforeNext = entry.expiresAt - now;
        throw err;
      }
      entry.count += 1;
    }
  };
}

// Rate limiter: 3 tentativas por email a cada hora (redefinição de senha)
const passwordResetLimiter = new RateLimiterMemory({
  points: 3,
  duration: 3600, // 1 hora em segundos
});

// Operações administrativas de usuários: limita abuso de convites, resets e alterações.
const adminUserActionLimiter = new RateLimiterMemory({
  points: 30,
  duration: 900,
});

// Rate limiter para envio customizado de e-mails: máximo de 50 disparos por hora por usuário admin
const customEmailLimiter = new RateLimiterMemory({
  points: 50,
  duration: 3600, // 1 hora em segundos
});

// Rate limiter para envio de WhatsApp: 20 mensagens por 15 minutos por usuário.
const whatsappMessageLimiter = new RateLimiterMemory({
  points: 20,
  duration: 900,
});

// Rate limiter para o Agente de IA interno: 60 requisições por minuto por usuário
const aiAgentLimiter = new RateLimiterMemory({
  points: 60,
  duration: 60,
});

// Rate limiter para análise de imagens e visão computacional: 20 requisições por minuto por usuário
const galleryAiLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

// Rate limiter para checkout público da vitrine (catalogOrders): 10 pedidos por 15 minutos por IP
const publicCatalogOrderLimiter = new RateLimiterMemory({
  points: 10,
  duration: 900,
});

// Consulta pública de acompanhamento: evita enumeração/abuso do endpoint por IP.
const publicOrderTrackingLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60,
});

module.exports = {
  passwordResetLimiter,
  adminUserActionLimiter,
  customEmailLimiter,
  whatsappMessageLimiter,
  aiAgentLimiter,
  galleryAiLimiter,
  publicCatalogOrderLimiter,
  publicOrderTrackingLimiter,
};
