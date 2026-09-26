/**
 * Configurações Centrais do Subsistema de IA - Luisices
 */

const BUSINESS_TIMEZONE = 'America/Sao_Paulo';
const PROVIDER_TIMEZONE = 'America/Los_Angeles'; // Fuso de reset das cotas da API Gemini (Pacific Time)

// Orçamento de tempo por operação (ms)
const TIMEOUTS = {
  CHAT_TOTAL_MS: 20000,
  VISION_TOTAL_MS: 30000,
  STORE_COPY_TOTAL_MS: 25000,
  FETCH_STREAM_MS: 15000,
  IMAGE_DOWNLOAD_MS: 8000,
  DB_QUERY_MS: 5000,
};

// Modelos Gemini suportados
const MODEL_CONFIG = {
  PRIMARY_CHAT_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  FALLBACK_CHAT_MODEL: 'gemini-2.5-flash-lite',
  PRIMARY_VISION_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  FALLBACK_VISION_MODEL: 'gemini-2.5-flash-lite',
  MAX_FALLBACK_ATTEMPTS: 1, // No máximo 1 tentativa alternativa por chamada
  CIRCUIT_BREAKER_FAIL_THRESHOLD: 3,
  CIRCUIT_BREAKER_COOLDOWN_MS: 60000,
};

// Tarifas oficiais de referência por milhão de tokens (USD)
const MODEL_PRICING_USD = {
  'gemini-2.5-flash': { promptPerMillion: 0.30, candidatesPerMillion: 2.50 },
  'gemini-2.5-flash-lite': { promptPerMillion: 0.10, candidatesPerMillion: 0.40 },
  'gemini-1.5-flash': { promptPerMillion: 0.075, candidatesPerMillion: 0.30 },
  'gemini-1.5-flash-8b': { promptPerMillion: 0.0375, candidatesPerMillion: 0.15 },
  'gemini-1.5-pro': { promptPerMillion: 1.25, candidatesPerMillion: 5.00 },
  'gemini-3.8-flash': { promptPerMillion: 0.75, candidatesPerMillion: 3.75 },
  'gemini-3.1-flash-lite': { promptPerMillion: 0.25, candidatesPerMillion: 1.50 },
  'default': { promptPerMillion: 0.30, candidatesPerMillion: 2.50 },
};

// Limites de entrada e segurança
const INPUT_LIMITS = {
  MAX_MESSAGE_CHARS: 4000,
  MAX_HISTORY_MESSAGES: 6, // 3 turnos
  MAX_HISTORY_CHARS: 10000,
  MAX_IMAGE_BASE64_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_DOWNLOAD_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_MIMES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_IMAGE_HOSTS: [
    'firebasestorage.googleapis.com',
    'cdn.luisices.com.br',
    'cdn-dev.luisices.com.br',
    'wa.luisices.com.br',
    'images.unsplash.com',
  ],
};

// Limites operacionais de ferramentas
const TOOL_LIMITS = {
  MAX_TOOL_CALLS_PER_REQUEST: 4,
  MAX_MODEL_ROUNDS: 2,
  ORDERS_PAGE_LIMIT: 30,
  CUSTOMERS_PAGE_LIMIT: 30,
  GALLERY_PAGE_LIMIT: 20,
};

// Configurações de Cache
const CACHE_CONFIG = {
  DEFAULT_TTL_MS: 3 * 60 * 1000, // 3 minutos
  MAX_ENTRIES: 200,
  MAX_MEMORY_BYTES: 5 * 1024 * 1024, // 5MB
};

// Limites de Orçamento Distribuído diário
const BUDGET_LIMITS = {
  DAILY_TOKENS_PER_USER: 150000,
  DAILY_REQUESTS_PER_USER: 100,
  DAILY_TOKENS_PROJECT_CEILING: 5000000,
};

module.exports = {
  BUSINESS_TIMEZONE,
  PROVIDER_TIMEZONE,
  TIMEOUTS,
  MODEL_CONFIG,
  MODEL_PRICING_USD,
  INPUT_LIMITS,
  TOOL_LIMITS,
  CACHE_CONFIG,
  BUDGET_LIMITS,
};
