import React, { useState } from 'react';
import { Order, Customer } from '../../types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Truck,
  ExternalLink,
  Copy,
  Send,
  FileText,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUserSettings } from '../../../hooks/useUserSettings';
import { SuperfreteGenerateLabelDialog } from '../shipping/SuperfreteGenerateLabelDialog';
import { normalizePhoneForWhatsApp } from '../../utils/whatsapp';
import { isSuperfreteDevEnvironment } from '../../../lib/firebase';
import type { CreateLabelResponse } from '../../../services/superfreteService';

interface OrderShippingSectionProps {
  order: Order;
  customer?: Customer | null;
  onOrderUpdated?: (order: Order) => void;
}

export function OrderShippingSection({
  order,
  customer,
  onOrderUpdated,
}: OrderShippingSectionProps) {
  const { settings } = useUserSettings();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Se o recurso estiver desativado pelo Admin, não renderiza absolutamente nada
  if (!isSuperfreteDevEnvironment || !settings?.superfreteEnabled) {
    return null;
  }

  const hasLabel = Boolean(order.shippingTagId || order.shippingLabelUrl || order.shippingTrackingNumber);
  const isProcessing = order.shippingStatus === 'processing';

  const handleCopyTracking = () => {
    if (order.shippingTrackingNumber) {
      navigator.clipboard.writeText(order.shippingTrackingNumber);
      toast.success('Código de rastreamento copiado!');
    }
  };

  const handleSendWhatsApp = () => {
    const phone = order.customerPhone || customer?.phone;
    if (!order.shippingTrackingNumber || !phone) return;
    const cleanPhone = normalizePhoneForWhatsApp(phone);
    const msg = `Olá, ${order.customerName}! Seu pedido *${order.orderNumber || order.productName}* foi enviado!\n\n📦 *Código de Rastreamento:* ${order.shippingTrackingNumber}\nVocê pode acompanhar o trajeto diretamente pelo site dos Correios/Transportadora.\n\nQualquer dúvida, estamos à disposição!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Truck className="size-4 text-primary" />
          Envio & Logística (SuperFrete)
        </h3>
        <Badge
          variant={hasLabel ? 'default' : isProcessing ? 'secondary' : 'outline'}
          className={`text-xs ${
            hasLabel
              ? 'bg-emerald-600 text-white'
            : isProcessing ? 'text-amber-700' : 'text-muted-foreground'
          }`}
        >
          {hasLabel ? 'Etiqueta Emitida' : isProcessing ? 'Emissão em andamento' : order.shippingStatus === 'failed' ? 'Falha na emissão' : 'Envio Pendente'}
        </Badge>
      </div>

      <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
        {hasLabel ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-card border">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Código de Rastreio
                </span>
                <div className="font-mono font-bold text-sm sm:text-base text-primary">
                  {order.shippingTrackingNumber || 'Disponível na Etiqueta'}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {order.shippingTrackingNumber && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTracking}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Copy className="size-3.5" />
                    Copiar
                  </Button>
                )}
                {order.shippingLabelUrl && (
                  <Button
                    size="sm"
                    onClick={() => window.open(order.shippingLabelUrl!, '_blank')}
                    className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <FileText className="size-3.5" />
                    Imprimir PDF
                    <ExternalLink className="size-3 opacity-70" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Status de Envio: <strong className="text-foreground uppercase">{order.shippingStatus || 'Pendente'}</strong>
              </span>

              {(order.customerPhone || customer?.phone) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendWhatsApp}
                  className="gap-1.5 text-xs h-7"
                >
                  <Send className="size-3 text-emerald-600" />
                  Enviar Rastreio no WhatsApp
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">
                Gere a etiqueta de envio com desconto via Correios ou transportadoras parceiras.
              </p>
              {customer?.zipCode && (
                <p className="text-[11px] text-muted-foreground">
                  Destino: CEP {customer.zipCode} ({customer.city || 'Cidade'}/{customer.state || 'UF'})
                </p>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              disabled={isProcessing}
              className="gap-1.5 text-xs shrink-0"
            >
              <Package className="size-3.5" />
              {isProcessing ? 'Emissão em andamento' : order.shippingStatus === 'failed' ? 'Tentar novamente' : 'Emitir Etiqueta'}
            </Button>
          </div>
        )}
      </div>

      <SuperfreteGenerateLabelDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        order={order}
        customer={customer}
        onSuccess={(result: CreateLabelResponse) => {
          onOrderUpdated?.({
            ...order,
            shippingTagId: result.tagId,
            shippingStatus: result.status,
            shippingTrackingNumber: result.trackingCode || null,
            shippingLabelUrl: result.labelPdfUrl || null,
            shippingCost: result.price ?? null,
            shippingUpdatedAt: new Date().toISOString(),
          });
        }}
      />
    </div>
  );
}
