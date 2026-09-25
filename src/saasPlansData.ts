import { SaaSPlan, SaaSPlanId } from './types';

export const SAAS_PLANS: SaaSPlan[] = [
  {
    id: 'trial',
    name: 'Degustação (Trial)',
    tagline: 'Experimente sem compromisso e sem cartão',
    priceMonthly: 0,
    aiLimitMonth: 5,
    features: [
      '5 fichas de topos 3D com IA',
      'Compatível com Silhouette Portrait',
      'Mensagens prontas para WhatsApp',
      'Até 10 pedidos no sistema',
      'Validade de 14 dias',
    ],
  },
  {
    id: 'solo',
    name: 'Ateliê Solo',
    tagline: 'Ideal para artesãs autônomas que trabalham sozinhas',
    priceMonthly: 34.90,
    aiLimitMonth: 25,
    features: [
      '25 fichas de topos 3D / mês',
      'Calculadora de insumos e margem',
      'Até 40 pedidos gerenciados / mês',
      'Catálogo público (link na bio)',
      'Backup automático no Firestore',
      'Suporte via WhatsApp',
    ],
  },
  {
    id: 'pro',
    name: 'Ateliê PRO',
    tagline: 'O mais escolhido para ateliês com produção contínua',
    priceMonthly: 64.90,
    aiLimitMonth: 80,
    highlighted: true,
    features: [
      '80 fichas de topos 3D / mês',
      'Pedidos e orçamentos ILIMITADOS',
      'Fichas de corte completas Portrait / Cameo',
      'Gestão financeira & alerta de fita banana',
      'Galeria do acervo com busca inteligente',
      'Disparo de orçamentos com 1 clique',
      'Suporte prioritário',
    ],
  },
  {
    id: 'studio_plus',
    name: 'Ateliê Escala & Equipe',
    tagline: 'Para ateliês com equipe de corte, produção e atendimento',
    priceMonthly: 119.90,
    aiLimitMonth: 250,
    features: [
      '250 fichas de topos 3D / mês',
      'Acesso para até 4 operadoras/cortadoras',
      'Controle por etapas (impressão, corte, montagem)',
      'Exportação contábil para DRE / Contador',
      'Módulos antecipados em primeira mão',
      'Treinamento de onboarding individual',
    ],
  },
];

export const INITIAL_QUOTA = {
  tenantId: 'luisices-studio-01',
  businessName: 'Luisices Papelaria de Afeto',
  planId: 'pro' as SaaSPlanId,
  aiGenerationsUsed: 12,
  aiGenerationsLimit: 80,
  ordersThisMonth: 28,
  ordersLimit: 9999,
  cycleRenewalDate: '15/10/2026',
  estimatedCostBrl: 0.18,
};
