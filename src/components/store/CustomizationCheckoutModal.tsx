import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Info, 
  ShieldCheck, 
  Heart, 
  MessageCircle, 
  Layers, 
  Percent, 
  CreditCard,
  QrCode,
  Package,
  Scissors
} from 'lucide-react';
import { StoreProduct, ProductFinish, CostBreakdownItem } from '../../types/store';

interface CustomizationCheckoutModalProps {
  product: StoreProduct;
  onClose: () => void;
  onConfirmOrder: (orderSummary: any) => void;
}

export const CustomizationCheckoutModal: React.FC<CustomizationCheckoutModalProps> = ({
  product,
  onClose,
  onConfirmOrder,
}) => {
  const [quantity, setQuantity] = useState<number>(product.minQuantity || 20);
  const [selectedFinishes, setSelectedFinishes] = useState<Record<string, string>>({
    foil: 'finish-foil-rose',
    paper: 'finish-paper-cotton',
    seal: 'finish-seal-botanic',
    ribbon: 'finish-ribbon-silk',
  });

  // Data da celebração (default para 45 dias no futuro)
  const defaultEventDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return d.toISOString().split('T')[0];
  }, []);

  const [celebrationDate, setCelebrationDate] = useState<string>(defaultEventDate);
  const [recipientNames, setRecipientNames] = useState<string>('');
  const [colorNotes, setColorNotes] = useState<string>('');
  const [paymentOption, setPaymentOption] = useState<'split_50_50' | 'pix_full_discount'>('split_50_50');
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Toggle ou seleção de acabamento
  const handleSelectFinish = (category: string, finishId: string) => {
    setSelectedFinishes(prev => ({ ...prev, [category]: finishId }));
  };

  // Cálculo de valor unitário com acabamentos extras
  const unitExtras = useMemo(() => {
    let sum = 0;
    Object.values(selectedFinishes).forEach(finishId => {
      const finish = product.availableFinishes.find(f => f.id === finishId);
      if (finish) sum += finish.extraPrice;
    });
    return sum;
  }, [selectedFinishes, product.availableFinishes]);

  const unitPrice = product.basePrice + unitExtras;
  const subtotal = unitPrice * quantity;

  // Cálculo de desconto e sinal
  const discountPix = subtotal * 0.05;
  const totalPix = subtotal - discountPix;
  const depositAmount50 = subtotal * 0.5;

  // Cálculo do Cronograma Reverso
  const timelineSchedule = useMemo(() => {
    if (!celebrationDate) return null;
    const event = new Date(celebrationDate + 'T00:00:00');
    
    // Data de envio com 10 dias de antecedência
    const shipDate = new Date(event);
    shipDate.setDate(shipDate.getDate() - 10);

    // Data de aprovação da prova física (18 dias antes do evento)
    const proofDate = new Date(event);
    proofDate.setDate(proofDate.getDate() - 18);

    // Início da produção (25 dias antes do evento)
    const startProductionDate = new Date(event);
    startProductionDate.setDate(startProductionDate.getDate() - (product.estimatedDaysToProduce + 12));

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return {
      eventDateFormatted: formatDate(event),
      shipDateFormatted: formatDate(shipDate),
      proofDateFormatted: formatDate(proofDate),
      startProductionFormatted: formatDate(startProductionDate),
      isUrgent: (event.getTime() - Date.now()) / (1000 * 3600 * 24) < 20,
    };
  }, [celebrationDate, product.estimatedDaysToProduce]);

  // Composição aberta e transparente de custos
  const costBreakdown: CostBreakdownItem[] = useMemo(() => {
    const paperCost = subtotal * 0.38;
    const craftCost = subtotal * 0.44;
    const packagingCost = subtotal * 0.18;
    return [
      { label: 'Papéis Especiais & Lamicotes', sublabel: 'Algodão 300g, Colorplus e Foils Nobres', amount: paperCost },
      { label: 'Corte Silhouette & Manufatura', sublabel: 'Caligrafia, vincos, dobras e laços manuais', amount: craftCost },
      { label: 'Embalagem Perfumada & Sedas', sublabel: 'Essência exclusiva de baunilha e fitas puras', amount: packagingCost },
    ];
  }, [subtotal]);

  const handleFinishReservation = () => {
    const summary = {
      productTitle: product.title,
      quantity,
      celebrationDate,
      recipientNames,
      colorNotes,
      selectedFinishes,
      paymentOption,
      subtotal,
      depositAmount: paymentOption === 'split_50_50' ? depositAmount50 : totalPix,
      timeline: timelineSchedule,
    };

    onConfirmOrder(summary);
    setOrderSuccess(true);
  };

  const handleWhatsAppCheckout = () => {
    const paymentText = paymentOption === 'split_50_50'
      ? `Sinal 50% (R$ ${depositAmount50.toFixed(2)}) + 50% após aprovação`
      : `Pagamento Integral com 5% OFF Pix (R$ ${totalPix.toFixed(2)})`;

    const text = `🌸 *RESERVA DE DATA & ORÇAMENTO — LUISICES*
----------------------------------------
*Item:* ${product.title}
*Quantidade:* ${quantity} ${product.unitLabel}
*Data da Celebração:* ${timelineSchedule?.eventDateFormatted || celebrationDate}
*Envio Seguro Previsto:* ${timelineSchedule?.shipDateFormatted}
*Nome / Monograma:* ${recipientNames || 'A definir'}
*Paleta / Cores:* ${colorNotes || 'Padrão da foto'}
*Total da Encomenda:* R$ ${subtotal.toFixed(2)}
*Condição Selecionada:* ${paymentText}
----------------------------------------
Olá! Gostaria de reservar minha data e enviar o comprovante do sinal!`;

    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(text)}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="luisices-glass bg-[var(--background)] max-w-2xl w-full p-5 sm:p-8 rounded-3xl shadow-2xl space-y-6 border border-[var(--glass-border)] my-6 relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Personalização de Afeto &amp; Reserva
            </span>
            <h2 className="font-serif font-bold text-lg sm:text-2xl text-[var(--foreground)]">
              {product.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 text-[var(--muted-foreground)] transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {orderSuccess ? (
          /* Sucesso na Reserva */
          <div className="space-y-6 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-2xl font-bold text-[var(--primary)]">
                Data Pré-Reservada com Carinho!
              </h3>
              <p className="text-xs sm:text-sm text-[var(--muted-foreground)] max-w-md mx-auto leading-relaxed">
                Sua celebração foi agendada para <strong>{timelineSchedule?.eventDateFormatted}</strong>. Finalize os detalhes pelo WhatsApp com nossa artesã para envio da prova física ou digital.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-[var(--border)] text-xs text-left space-y-2">
              <div className="flex justify-between font-bold">
                <span>Valor do Sinal (50%):</span>
                <span className="text-[var(--primary)] text-sm">
                  R$ {paymentOption === 'split_50_50' ? depositAmount50.toFixed(2) : totalPix.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)]">
                Envio seguro garantido até <strong>{timelineSchedule?.shipDateFormatted}</strong>.
              </div>
            </div>

            <button
              type="button"
              onClick={handleWhatsAppCheckout}
              className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar Pedido &amp; Comprovante no WhatsApp</span>
            </button>
          </div>
        ) : (
          /* Formulário de Personalização */
          <form onSubmit={(e) => { e.preventDefault(); handleFinishReservation(); }} className="space-y-6">
            {/* 1. Quantidade & Informações Básicas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                  1. Quantidade Desejada ({product.unitLabel})
                </label>
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  Mínimo: {product.minQuantity} {product.unitLabel}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={product.minQuantity || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(product.minQuantity || 1, Number(e.target.value)))}
                  className="w-32 px-4 py-2.5 rounded-xl luisices-glass-input text-sm font-bold text-[var(--foreground)] text-center focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                />
                <div className="text-xs text-[var(--muted-foreground)]">
                  <span>Preço unitário calculado: </span>
                  <strong className="text-[var(--primary)] font-bold">R$ {unitPrice.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* 2. Seletor Tátil de Acabamentos com Previews */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider block">
                2. Acabamentos &amp; Papéis Nobres
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.availableFinishes.map((finish) => {
                  const isSelected = selectedFinishes[finish.category] === finish.id;
                  return (
                    <div
                      key={finish.id}
                      onClick={() => handleSelectFinish(finish.category, finish.id)}
                      className={`cursor-pointer p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-xs ring-1 ring-[var(--primary)]/50'
                          : 'bg-white/60 border-[var(--border)] hover:border-[var(--primary)]/40'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex-shrink-0 border border-black/10 overflow-hidden shadow-xs"
                        style={{ backgroundColor: finish.swatchHex || '#eee' }}
                      >
                        <img
                          src={finish.previewUrl}
                          alt={finish.name}
                          className="w-full h-full object-cover opacity-80"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--foreground)] leading-tight">
                            {finish.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--muted-foreground)] line-clamp-1">
                          {finish.description}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-stone-200/80 text-stone-700">
                            {finish.badge}
                          </span>
                          {finish.extraPrice > 0 ? (
                            <span className="text-[10px] font-bold text-[var(--primary)]">
                              +R$ {finish.extraPrice.toFixed(2)}/un
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold">Incluso</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Cronograma Reverso & Trava de Data */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FFF0F0] border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--primary)]" />
                  <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                    3. Data da Celebração &amp; Cronograma Reverso
                  </label>
                </div>
                {timelineSchedule?.isUrgent && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 text-[10px] font-bold">
                    Produção com Vaga Prioritária
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">
                    Selecione a data do casamento, batizado ou aniversário:
                  </span>
                  <input
                    type="date"
                    required
                    value={celebrationDate}
                    onChange={(e) => setCelebrationDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl luisices-glass-input text-xs font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                  />
                </div>

                {timelineSchedule && (
                  <div className="p-3 rounded-xl bg-white/90 border border-black/5 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-[var(--foreground)]">
                      <span>Envio Seguro Sedex:</span>
                      <strong className="text-[var(--primary)] font-bold">{timelineSchedule.shipDateFormatted}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[var(--muted-foreground)] text-[10px]">
                      <span>Prova Física/Digital:</span>
                      <span>{timelineSchedule.proofDateFormatted}</span>
                    </div>
                    <div className="text-[9px] text-stone-500 pt-0.5">
                      ✓ 10 dias de antecedência para caligrafia, cura e montagem.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Nomes e Notas de Personalização */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[var(--foreground)] mb-1 block">
                  Nomes / Monograma / Iniciais
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sarah &amp; Benjamin / Theo 1 ano"
                  value={recipientNames}
                  onChange={(e) => setRecipientNames(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl luisices-glass-input text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--foreground)] mb-1 block">
                  Paleta de Cores Desejada
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rosa chá, lilás lavanda e dourado"
                  value={colorNotes}
                  onChange={(e) => setColorNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl luisices-glass-input text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                />
              </div>
            </div>

            {/* 5. Composição Aberta e Transparente de Custos */}
            <div className="p-4 rounded-2xl bg-white/70 border border-[var(--border)] space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
                <Info className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Composição Transparente de Custos</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {costBreakdown.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-black/5 space-y-0.5">
                    <div className="text-[11px] font-bold text-[var(--foreground)]">{item.label}</div>
                    <div className="text-[9px] text-[var(--muted-foreground)] leading-tight">{item.sublabel}</div>
                    <div className="font-bold text-[var(--primary)] text-xs pt-1">
                      R$ {item.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Modelo de Pagamento Facilitado do Ateliê */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider block">
                6. Condição de Pagamento do Ateliê
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opção 1: 2x Sem Juros (Sinal 50% + 50%) */}
                <div
                  onClick={() => setPaymentOption('split_50_50')}
                  className={`cursor-pointer p-3.5 rounded-2xl border transition-all space-y-1 ${
                    paymentOption === 'split_50_50'
                      ? 'bg-[var(--primary)]/10 border-[var(--primary)] ring-1 ring-[var(--primary)]/50'
                      : 'bg-white/60 border-[var(--border)] hover:border-[var(--primary)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[var(--primary)]" />
                      2x Sem Juros no Ateliê
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--primary)] text-white">
                      Tradicional
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">
                    Sinal de <strong>50% hoje (R$ {depositAmount50.toFixed(2)})</strong> para travar a data + restante após aprovação da prova.
                  </p>
                </div>

                {/* Opção 2: Pagamento Integral com 5% OFF Pix */}
                <div
                  onClick={() => setPaymentOption('pix_full_discount')}
                  className={`cursor-pointer p-3.5 rounded-2xl border transition-all space-y-1 ${
                    paymentOption === 'pix_full_discount'
                      ? 'bg-[var(--primary)]/10 border-[var(--primary)] ring-1 ring-[var(--primary)]/50'
                      : 'bg-white/60 border-[var(--border)] hover:border-[var(--primary)]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      Integral com 5% OFF Pix
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-600 text-white">
                      Economize R$ {discountPix.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">
                    Pagamento único com desconto exclusivo: <strong>R$ {totalPix.toFixed(2)}</strong> via Pix.
                  </p>
                </div>
              </div>
            </div>

            {/* Sticky Action Bar */}
            <div className="pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] block">
                  {paymentOption === 'split_50_50' ? 'Sinal a pagar hoje (50%):' : 'Total com desconto Pix:'}
                </span>
                <span className="text-xl sm:text-2xl font-serif font-bold text-[var(--primary)]">
                  R$ {paymentOption === 'split_50_50' ? depositAmount50.toFixed(2) : totalPix.toFixed(2)}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] block">
                  Total da encomenda: R$ {subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 sm:w-auto px-4 py-3 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--foreground)] hover:bg-black/5 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="w-2/3 sm:w-auto px-6 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Reservar Data Agora</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
