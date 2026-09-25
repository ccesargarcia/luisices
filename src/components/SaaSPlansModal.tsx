import React, { useState } from 'react';
import { SaaSPlan, SaaSPlanId, TenantQuota } from '../types';
import { SAAS_PLANS } from '../saasPlansData';
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  DollarSign, 
  Layers,
  HelpCircle,
  Clock,
  Coins
} from 'lucide-react';

interface SaaSPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuota: TenantQuota;
  onSelectPlan: (planId: SaaSPlanId) => void;
  onAddCreditPack: (amount: number, price: number) => void;
}

export const SaaSPlansModal: React.FC<SaaSPlansModalProps> = ({
  isOpen,
  onClose,
  currentQuota,
  onSelectPlan,
  onAddCreditPack,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showCreditPacks, setShowCreditPacks] = useState(false);

  if (!isOpen) return null;

  const currentPlan = SAAS_PLANS.find(p => p.id === currentQuota.planId) || SAAS_PLANS[0];
  const percentUsed = Math.min(100, Math.round((currentQuota.aiGenerationsUsed / currentQuota.aiGenerationsLimit) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="luisices-glass bg-[var(--background)] max-w-5xl w-full rounded-3xl p-5 sm:p-8 shadow-2xl border border-[var(--glass-border)] my-auto max-h-[92dvh] overflow-y-auto">
        
        {/* Header com indicador de uso atual */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] font-bold uppercase tracking-wider">
                Gestão de Assinatura & Consumo
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">Tenant: {currentQuota.businessName}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mt-1">
              Planos & Blindagem de Custos Luisices
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Escolha o plano ideal para a escala de produção do seu ateliê. Cancele ou mude a qualquer momento.
            </p>
          </div>

          <button
            id="btn-close-saas-modal"
            onClick={onClose}
            className="self-end sm:self-auto p-2 rounded-xl luisices-chip text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs font-bold transition"
          >
            ✕ Fechar
          </button>
        </div>

        {/* Barra de Consumo do Mês Atual (Quotas) */}
        <div className="my-5 p-4 rounded-2xl luisices-chip flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[var(--border)]">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
                Gerações de Topos com IA no Ciclo Atual:
              </span>
              <span className="font-bold text-[var(--primary)]">
                {currentQuota.aiGenerationsUsed} de {currentQuota.aiGenerationsLimit} usadas ({percentUsed}%)
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-black/10 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentUsed >= 90 ? 'bg-red-500' : percentUsed >= 75 ? 'bg-amber-500' : 'bg-[var(--primary)]'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
              <span>Renova em: {currentQuota.cycleRenewalDate}</span>
              <span>Custo real em IA consumido: R$ {currentQuota.estimatedCostBrl.toFixed(2)}</span>
            </div>
          </div>

          {/* Ação rápida para compra avulsa de créditos de IA */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              id="btn-toggle-credit-packs"
              onClick={() => setShowCreditPacks(!showCreditPacks)}
              className="px-3.5 py-2 rounded-xl border border-[var(--primary)]/40 text-[var(--primary)] font-bold text-xs luisices-chip flex items-center gap-1.5 hover:bg-[var(--primary)]/10 transition"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{showCreditPacks ? 'Ver Planos' : '+ Créditos Avulsos'}</span>
            </button>
          </div>
        </div>

        {/* PAINEL DE CRÉDITOS AVULSOS (Upsell sem trocar de plano) */}
        {showCreditPacks ? (
          <div className="space-y-4 py-2">
            <div className="text-center max-w-lg mx-auto mb-4">
              <h3 className="text-base font-bold text-[var(--foreground)]">Precisa de um empurrãozinho extra este mês?</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Adicione créditos de IA avulsos sem alterar a mensalidade do seu plano principal.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { amount: 15, price: 9.90, desc: 'Ideal para um final de semana com muitos orçamentos' },
                { amount: 40, price: 19.90, desc: 'Perfeito para época de festas sazonais (Páscoa, Dia das Crianças)', badge: 'Mais Popular' },
                { amount: 100, price: 39.90, desc: 'Para ateliês que não podem parar de gerar orçamentos' },
              ].map((pack, idx) => (
                <div key={idx} className="p-5 rounded-2xl luisices-chip border border-[var(--border)] flex flex-col justify-between text-center relative hover:border-[var(--primary)] transition">
                  {pack.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-[9px] font-bold uppercase tracking-wider">
                      {pack.badge}
                    </span>
                  )}
                  <div>
                    <div className="text-2xl font-black text-[var(--foreground)]">+{pack.amount}</div>
                    <div className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">Gerações de Topos IA</div>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-2">{pack.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border)]">
                    <div className="text-lg font-black text-[var(--foreground)] mb-2">R$ {pack.price.toFixed(2)}</div>
                    <button
                      onClick={() => {
                        onAddCreditPack(pack.amount, pack.price);
                        setShowCreditPacks(false);
                      }}
                      className="w-full py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] text-xs font-bold uppercase tracking-wider transition shadow-sm"
                    >
                      Comprar com PIX
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* GRADE DE PLANOS SAAS */
          <div className="space-y-6">
            {/* Toggle Mensal / Anual com Desconto */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                Mensal
              </span>
              <button
                id="btn-toggle-billing-cycle"
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="w-12 h-6 rounded-full bg-[var(--primary)] p-1 transition flex items-center"
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${billingCycle === 'annual' ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                  Anual
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  2 Meses Grátis
                </span>
              </div>
            </div>

            {/* Cards dos Planos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {SAAS_PLANS.map((plan) => {
                const isCurrent = currentQuota.planId === plan.id;
                const monthlyPrice = billingCycle === 'annual' && plan.priceMonthly > 0 
                  ? (plan.priceMonthly * 10) / 12 
                  : plan.priceMonthly;

                return (
                  <div
                    key={plan.id}
                    id={`plan-card-${plan.id}`}
                    className={`rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all relative ${
                      plan.highlighted
                        ? 'luisices-glass ring-2 ring-[var(--primary)] shadow-xl scale-[1.02]'
                        : 'luisices-chip border border-[var(--border)]'
                    }`}
                  >
                    {plan.highlighted && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                        Mais Recomendado
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-extrabold text-base text-[var(--foreground)]">{plan.name}</h3>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                            Plano Atual
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)] leading-snug min-h-[32px]">
                        {plan.tagline}
                      </p>

                      <div className="my-4 pb-4 border-b border-[var(--border)]">
                        {plan.priceMonthly === 0 ? (
                          <div className="text-2xl font-black text-[var(--foreground)]">Grátis</div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs text-[var(--muted-foreground)] font-bold">R$</span>
                            <span className="text-3xl font-black text-[var(--foreground)]">
                              {monthlyPrice.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[10px] text-[var(--muted-foreground)]">/mês</span>
                          </div>
                        )}
                        {billingCycle === 'annual' && plan.priceMonthly > 0 && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                            Faturado anualmente (R$ {(plan.priceMonthly * 10).toFixed(2)})
                          </div>
                        )}
                      </div>

                      {/* Quota de IA destacada */}
                      <div className="bg-[var(--primary)]/10 p-2.5 rounded-xl mb-4 border border-[var(--primary)]/20">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{plan.aiLimitMonth} Gerações IA / mês</span>
                        </div>
                        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                          Calculado para Silhouette Portrait 3
                        </div>
                      </div>

                      {/* Lista de Features */}
                      <ul className="space-y-2 text-xs text-[var(--foreground)]">
                        {plan.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2 text-[11px] leading-snug">
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Botão de Ação do Plano */}
                    <div className="pt-6">
                      <button
                        id={`btn-select-plan-${plan.id}`}
                        disabled={isCurrent}
                        onClick={() => onSelectPlan(plan.id)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 ${
                          isCurrent
                            ? 'bg-black/10 dark:bg-white/10 text-[var(--muted-foreground)] cursor-default'
                            : plan.highlighted
                            ? 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)]'
                            : 'border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10'
                        }`}
                      >
                        {isCurrent ? 'Plano Ativo' : plan.priceMonthly === 0 ? 'Iniciar Teste' : 'Assinar Plano'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Garantia & Blindagem Footer */}
        <div className="mt-7 pt-5 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--muted-foreground)] gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Dados 100% isolados por ateliê (Multi-tenant) • Pagamento seguro via PIX e Cartão</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[var(--primary)]">Ateliê protegido contra surpresas</span>
          </div>
        </div>

      </div>
    </div>
  );
};
