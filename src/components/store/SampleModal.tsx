import React, { useState } from 'react';
import { X, Eye, CheckCircle2, MessageCircle, Sparkles, MapPin } from 'lucide-react';
import { StoreProduct } from '../../types/store';

interface SampleModalProps {
  product: StoreProduct;
  onClose: () => void;
}

export const SampleModal: React.FC<SampleModalProps> = ({ product, onClose }) => {
  const [sampleType, setSampleType] = useState<'physical' | 'digital'>('physical');
  const [customerName, setCustomerName] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRequestSample = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
  };

  const handleWhatsAppSample = () => {
    const text = `🌸 *SOLICITAÇÃO DE AMOSTRA — LUISICES*
----------------------------------------
*Item:* ${product.title}
*Tipo de Amostra:* ${sampleType === 'physical' ? 'Amostra Física em Mãos' : 'Prova Digital em PDF Alta Resolução'}
*Nome:* ${customerName || 'Cliente'}
*Cidade/UF:* ${customerCity || 'Não informada'}
----------------------------------------
Olá! Gostaria de receber uma amostra deste projeto para aprovar acabamentos!`;

    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(text)}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="luisices-glass bg-[var(--background)] max-w-lg w-full p-6 sm:p-7 rounded-3xl shadow-2xl space-y-5 border border-[var(--glass-border)] relative">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="font-serif font-bold text-lg text-[var(--foreground)]">
              Solicitar Amostra de Produção
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[var(--muted-foreground)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-xl font-bold text-[var(--primary)]">
                Solicitação Recebida!
              </h4>
              <p className="text-xs text-[var(--muted-foreground)] max-w-xs mx-auto">
                Nossa artesã entrará em contato para alinhar o envio da amostra de <strong>{product.title}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleWhatsAppSample}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Confirmar no WhatsApp da Artesã</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleRequestSample} className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 border border-[var(--border)]">
              <img
                src={product.mainImage}
                alt={product.title}
                className="w-14 h-14 rounded-xl object-cover"
              />
              <div>
                <div className="font-bold text-xs text-[var(--foreground)]">{product.title}</div>
                <div className="text-[10px] text-[var(--muted-foreground)]">
                  {product.materials.join(' • ')}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-[var(--foreground)] uppercase tracking-wider block">
                Escolha o Tipo de Amostra
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSampleType('physical')}
                  className={`p-3 rounded-xl border text-left space-y-1 transition ${
                    sampleType === 'physical'
                      ? 'bg-[var(--primary)]/10 border-[var(--primary)] ring-1 ring-[var(--primary)]'
                      : 'bg-white/60 border-[var(--border)]'
                  }`}
                >
                  <div className="font-bold text-[var(--foreground)]">Amostra Física</div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">
                    Enviada via Sedex com toque real de papel, cera e laços.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSampleType('digital')}
                  className={`p-3 rounded-xl border text-left space-y-1 transition ${
                    sampleType === 'digital'
                      ? 'bg-[var(--primary)]/10 border-[var(--primary)] ring-1 ring-[var(--primary)]'
                      : 'bg-white/60 border-[var(--border)]'
                  }`}
                >
                  <div className="font-bold text-[var(--foreground)]">Prova Digital</div>
                  <div className="text-[10px] text-[var(--muted-foreground)]">
                    Mockup 3D em alta resolução e PDF com as suas cores.
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-[var(--foreground)] mb-1 block">Seu Nome</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Mariana Silveira"
                  className="w-full px-3 py-2 rounded-xl luisices-glass-input text-xs text-[var(--foreground)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--foreground)] mb-1 block">Cidade / Estado (para cálculo de frete)</label>
                <input
                  type="text"
                  required
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  placeholder="Ex: São Paulo / SP"
                  className="w-full px-3 py-2 rounded-xl luisices-glass-input text-xs text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)] flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold uppercase tracking-wider shadow-sm hover:bg-[var(--primary-hover)] transition"
              >
                Solicitar Amostra
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
