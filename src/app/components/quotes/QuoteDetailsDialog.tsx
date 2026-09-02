import React, { useState } from 'react';
import { Quote, OrderStatus } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime as formatDateTimeUtil } from '../../utils/date';
import { getTextColor } from '../../utils/tagColors';
import { useUserSettings } from '../../../hooks/useUserSettings';
import { useAuth } from '../../../contexts/AuthContext';
import { firebaseQuoteService } from '../../../services/firebaseQuoteService';
import { firebaseOrderService } from '../../../services/firebaseOrderService';
import { trackEvent } from '../../../services/analyticsService';
import { exportQuotePDF } from '../../utils/exportPdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Calendar,
  Clock,
  User,
  Phone,
  StickyNote,
  Truck,
  MapPin,
  CreditCard,
  Trash2,
  Copy,
  Download,
  Pencil,
  Send,
  XCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  STATUS_LABELS,
  STATUS_VARIANT,
  formatDate,
  buildWhatsAppMessage,
} from './quoteHelpers';
import { toast } from 'sonner';

interface QuoteDetailsDialogProps {
  quote: Quote | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (q: Quote) => void;
  onRefresh: () => void;
}

export function QuoteDetailsDialog({
  quote,
  open,
  onOpenChange,
  onEdit,
  onRefresh,
}: QuoteDetailsDialogProps) {
  const { settings } = useUserSettings();
  const { hasPermission } = useAuth();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  function handleExportPdf() {
    if (!quote) return;
    setExportingPdf(true);
    try {
      exportQuotePDF(quote, settings?.businessName);
    } finally {
      setExportingPdf(false);
    }
  }

  if (!quote) return null;

  const canApprove = quote.status === 'draft' || quote.status === 'sent';
  const canReject = quote.status === 'draft' || quote.status === 'sent';
  const canEdit = quote.status !== 'approved';

  async function handleApprove() {
    if (!quote) return;
    setApproving(true);
    try {
      // Build order productName from items
      const productName = quote.items
        .map((i) => (i.quantity > 1 ? `${i.name} (${i.quantity}x)` : i.name))
        .join(', ');
      const totalQty = quote.items.reduce((s, i) => s + i.quantity, 0);

      const order = await firebaseOrderService.createOrder({
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        customerId: quote.customerId,
        productName,
        quantity: totalQty,
        price: quote.totalPrice,
        status: 'pending' as OrderStatus,
        deliveryDate: quote.deliveryDate,
        notes: [
          `Gerado do orçamento ${quote.quoteNumber}`,
          ...(quote.notes ? [quote.notes] : []),
        ].join('\n'),
        tags: quote.tags,
        cardColor: quote.cardColor,
        isExchange: quote.isExchange,
        exchangeNotes: quote.exchangeNotes,
      });

      await firebaseQuoteService.markApproved(quote.id, order.id, order.orderNumber!);
      toast.success(`Pedido ${order.orderNumber} criado com sucesso!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao aprovar orçamento');
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!quote) return;
    setRejecting(true);
    try {
      await firebaseQuoteService.updateStatus(quote.id, 'rejected');
      toast.success('Orçamento rejeitado');
    } catch (e) {
      toast.error('Erro ao rejeitar orçamento');
    } finally {
      setRejecting(false);
    }
  }

  async function handleDelete() {
    if (!quote) return;
    setDeleting(true);
    try {
      await firebaseQuoteService.deleteQuote(quote.id);
      toast.success('Orçamento excluído');
      onRefresh();
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao excluir orçamento');
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  }

  async function handleDuplicate() {
    if (!quote) return;
    setDuplicating(true);
    try {
      const payload: Partial<Quote> = {
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        customerId: quote.customerId,
        items: quote.items,
        totalPrice: quote.totalPrice,
        discount: quote.discount,
        discountType: quote.discountType,
        paymentCondition: quote.paymentCondition,
        deliveryType: quote.deliveryType,
        deliveryAddress: quote.deliveryAddress,
        deliveryDate: quote.deliveryDate,
        validUntil: quote.validUntil,
        notes: quote.notes,
        tags: quote.tags,
        cardColor: quote.cardColor,
        status: 'draft',
      };
      await firebaseQuoteService.createQuote(payload);
      trackEvent('quote_duplicated', {
        original_quote_id: quote.id,
        total_value: quote.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      });
      toast.success('Orçamento duplicado como rascunho');
      onOpenChange(false);
    } catch (e) {
      toast.error('Erro ao duplicar orçamento');
    } finally {
      setDuplicating(false);
    }
  }

  async function handleMarkSent() {
    if (!quote) return;
    setMarking(true);
    try {
      await firebaseQuoteService.updateStatus(quote.id, 'sent');
      toast.success('Orçamento marcado como enviado');
    } catch (e) {
      toast.error('Erro ao atualizar status');
    } finally {
      setMarking(false);
    }
  }

  return (
    <>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O orçamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle>{quote.quoteNumber}</DialogTitle>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_VARIANT[quote.status]
                }`}
              >
                {STATUS_LABELS[quote.status]}
              </span>
            </div>
          </DialogHeader>

          <div className="space-y-5">
            {/* Cliente */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="size-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{quote.customerName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="size-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={`https://wa.me/55${quote.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    buildWhatsAppMessage(quote, settings ?? undefined)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline"
                >
                  {quote.customerPhone}
                </a>
              </div>
            </div>

            {/* Itens */}
            <div className="rounded-md border overflow-x-auto">
              <div className="min-w-[340px]">
                <div className="grid grid-cols-[1fr_64px_100px_100px] gap-2 px-3 py-2 bg-muted text-xs font-medium text-muted-foreground">
                  <span>Produto / Serviço</span>
                  <span className="text-center">Qtd</span>
                  <span className="text-right">Preço unit.</span>
                  <span className="text-right">Subtotal</span>
                </div>
                {quote.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_64px_100px_100px] gap-2 items-center px-3 py-2 border-t text-sm"
                  >
                    <span>{item.name}</span>
                    <span className="text-center">{item.quantity}</span>
                    <span className="text-right">{formatCurrency(item.unitPrice)}</span>
                    <span className="text-right font-medium">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_64px_100px_100px] gap-2 items-center px-3 py-2 bg-muted border-t">
                  <span className="col-span-3 text-sm font-semibold text-right">Total</span>
                  <span className="text-sm font-bold text-right">
                    {formatCurrency(quote.totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Datas / custo / desconto / pagamento / entrega */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Entrega:</span>
                <span className="font-medium">{formatDate(quote.deliveryDate)}</span>
              </div>
              {quote.validUntil && (
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Válido até:</span>
                  <span className="font-medium">{formatDate(quote.validUntil)}</span>
                </div>
              )}
              {quote.discount != null && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {quote.discountType === 'percent'
                      ? `${quote.discount}%`
                      : formatCurrency(quote.discount)}
                  </span>
                </div>
              )}
              {quote.paymentCondition && (
                <div className="flex items-center gap-2 col-span-2">
                  <CreditCard className="size-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Pagamento:</span>
                  <span className="font-medium">{quote.paymentCondition}</span>
                </div>
              )}
              {quote.deliveryType && (
                <div className="flex items-center gap-2 col-span-2">
                  {quote.deliveryType === 'delivery' ? (
                    <Truck className="size-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <MapPin className="size-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-muted-foreground">Entrega:</span>
                  <span className="font-medium">
                    {quote.deliveryType === 'pickup'
                      ? 'Retirada na loja'
                      : `Entrega${quote.deliveryAddress ? ` — ${quote.deliveryAddress}` : ''}`}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Criado em:</span>
                <span className="font-medium">{formatDateTimeUtil(quote.createdAt)}</span>
              </div>
              {quote.sentAt && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Enviado em:</span>
                  <span className="font-medium">{formatDateTimeUtil(quote.sentAt)}</span>
                </div>
              )}
              {quote.approvedAt && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-green-700 dark:text-green-400">
                    Aprovado em:
                  </span>
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {formatDateTimeUtil(quote.approvedAt)}
                  </span>
                </div>
              )}
              {quote.rejectedAt && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-red-600">Rejeitado em:</span>
                  <span className="font-medium text-red-600">
                    {formatDateTimeUtil(quote.rejectedAt)}
                  </span>
                </div>
              )}
              {quote.expiredAt && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-orange-600">Expirado em:</span>
                  <span className="font-medium text-orange-600">
                    {formatDateTimeUtil(quote.expiredAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Notas */}
            {quote.notes && (
              <div className="flex gap-2 text-sm bg-muted/50 rounded-md p-3">
                <StickyNote className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}

            {/* Tags */}
            {quote.tags && quote.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {quote.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Pedido gerado */}
            {quote.status === 'approved' && quote.orderNumber && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle className="size-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-300">
                  Pedido <strong>{quote.orderNumber}</strong> gerado a partir deste orçamento.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="mt-4 flex-wrap gap-2">
            {hasPermission((p) => p.quotes?.delete ?? false) && (
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground mr-auto"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleting}
              >
                <Trash2 className="size-4 mr-2" />
                Excluir
              </Button>
            )}
            {hasPermission((p) => p.quotes?.create ?? false) && (
              <Button variant="outline" onClick={handleDuplicate} disabled={duplicating}>
                {duplicating ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="size-4 mr-2" />
                )}
                Duplicar
              </Button>
            )}
            <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
              <Download className="size-4 mr-2" />
              {exportingPdf ? 'Gerando...' : 'Exportar PDF'}
            </Button>
            {canEdit && hasPermission((p) => p.quotes?.edit ?? false) && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(quote);
                }}
              >
                <Pencil className="size-4 mr-2" /> Editar
              </Button>
            )}
            {quote.status === 'draft' && (
              <Button variant="outline" onClick={handleMarkSent} disabled={marking}>
                {marking ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Send className="size-4 mr-2" />
                )}
                Marcar como Enviado
              </Button>
            )}
            {canReject && (
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleReject}
                disabled={rejecting}
              >
                {rejecting ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="size-4 mr-2" />
                )}
                Rejeitar
              </Button>
            )}
            {canApprove && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="size-4 mr-2" />
                )}
                Aprovar e Gerar Pedido
              </Button>
            )}
            {!canApprove && !canReject && !canEdit && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
