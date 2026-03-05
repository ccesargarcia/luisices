/**
 * Analytics Service
 * 
 * Serviço para rastreamento de eventos com Firebase Analytics
 */

import { logEvent, setUserProperties, setUserId } from 'firebase/analytics';
import { analytics } from '../lib/firebase';

/**
 * Rastrear visualização de página
 */
export const trackPageView = (pagePath: string, pageTitle?: string) => {
  if (!analytics) return;
  
  logEvent(analytics, 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
  });
};

/**
 * Rastrear login
 */
export const trackLogin = (method: string = 'email') => {
  if (!analytics) return;
  
  logEvent(analytics, 'login', {
    method,
  });
};

/**
 * Rastrear cadastro
 */
export const trackSignUp = (method: string = 'email') => {
  if (!analytics) return;
  
  logEvent(analytics, 'sign_up', {
    method,
  });
};

/**
 * Rastrear busca
 */
export const trackSearch = (searchTerm: string) => {
  if (!analytics) return;
  
  logEvent(analytics, 'search', {
    search_term: searchTerm,
  });
};

/**
 * Rastrear criação de pedido
 */
export const trackOrderCreated = (orderId: string, value: number, currency: string = 'BRL') => {
  if (!analytics) return;
  
  logEvent(analytics, 'purchase', {
    transaction_id: orderId,
    value,
    currency,
  });
};

/**
 * Rastrear criação de orçamento
 */
export const trackQuoteCreated = (quoteId: string, value?: number) => {
  if (!analytics) return;
  
  logEvent(analytics, 'generate_lead', {
    value: value || 0,
    currency: 'BRL',
    item_id: quoteId,
  });
};

/**
 * Rastrear evento customizado
 */
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (!analytics) return;
  
  logEvent(analytics, eventName, params);
};

/**
 * Definir propriedades do usuário
 */
export const setUserAnalytics = (userId: string, role?: string) => {
  if (!analytics) return;
  
  setUserId(analytics, userId);
  
  if (role) {
    setUserProperties(analytics, {
      user_role: role,
    });
  }
};

/**
 * Rastrear erro
 */
export const trackError = (errorMessage: string, errorCode?: string) => {
  if (!analytics) return;
  
  logEvent(analytics, 'exception', {
    description: errorMessage,
    fatal: false,
    error_code: errorCode,
  });
};
