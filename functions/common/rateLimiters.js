/**
 * Instâncias de Rate Limiting centralizadas para proteção contra abusos e DoS.
 */

const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiter: 3 tentativas por email a cada hora (redefinição de senha)
const passwordResetLimiter = new RateLimiterMemory({
  points: 3,
  duration: 3600, // 1 hora em segundos
});

// Rate limiter para envio customizado de e-mails: máximo de 50 disparos por hora por usuário admin
const customEmailLimiter = new RateLimiterMemory({
  points: 50,
  duration: 3600, // 1 hora em segundos
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

module.exports = {
  passwordResetLimiter,
  customEmailLimiter,
  aiAgentLimiter,
  galleryAiLimiter,
  publicCatalogOrderLimiter,
};
