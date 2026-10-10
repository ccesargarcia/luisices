import type { CustomerGalleryPage } from '../../../services/firebaseGalleryService';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, Order, GalleryItem } from '../../types';
import { formatDate } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { ShoppingBag, Images, Plus, Upload, ZoomIn, Trash2, X, Loader2, MessageCircle, Sparkles, Tag, DollarSign, Clock, AlertTriangle, TrendingUp, CreditCard, PackageCheck } from 'lucide-react';
import { generateCustomerGreetingWhatsAppUrl } from '../../utils/whatsapp';
import { useOrders } from '../../../contexts/OrdersContext';
import { firebaseGalleryService } from '../../../services/firebaseGalleryService';
import { CustomerGalleryUploadDialog } from './CustomerGalleryUploadDialog';
import { computeCustomerXRay, CustomerTiersSettings, TIER_DEFINITIONS } from '../../utils/customerMetrics';
import { toast } from 'sonner';

interface CustomerHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  userId?: string;
  onOpenNewOrder?: (customer: Customer) => void;
  tiersConfig?: CustomerTiersSettings;
  historicalOrders?: Order[];
  metricsLoading?: boolean;
}

export function CustomerHistoryDialog({
  open,
  onOpenChange,
  customer,
  userId,
  onOpenNewOrder,
  tiersConfig,
  historicalOrders,
  metricsLoading = false,
}: CustomerHistoryDialogProps) {
  const { orders: allContextOrders, loading: loadingOrders } = useOrders();
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryCursor, setGalleryCursor] = useState<CustomerGalleryPage['cursor']>(null);
  const [hasMoreGallery, setHasMoreGallery] = useState(false);
  const [loadingMoreGallery, setLoadingMoreGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryReload, setGalleryReload] = useState(0);
  const galleryGeneration = useRef(0);
  const galleryPageBusy = useRef(false);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const orders = useMemo(() => {
    if (!open || !customer) return [];
    return allContextOrders.filter(
      (o) => o.customerId === customer.id && o.userId === customer.userId
    );
  }, [open, customer, allContextOrders]);

  const xray = useMemo(() => {
    if (!open || !customer || metricsLoading) return null;
    return computeCustomerXRay(customer, historicalOrders ?? orders, 'all', tiersConfig, new Date(), historicalOrders !== undefined);
  }, [open, customer, orders, historicalOrders, metricsLoading, tiersConfig]);

  useEffect(() => {
    galleryGeneration.current += 1;
    galleryPageBusy.current = false;
    setGallery([]);
    setGalleryCursor(null);
    setHasMoreGallery(false);
    setLoadingMoreGallery(false);
    setGalleryError(null);
    if (!open || !customer || !userId) {
      setGallery([]);
      return;
    }

    const currentUserId = userId;
    const currentCustomerId = customer.id;
    let isCancelled = false;
    setLoadingGallery(true);

    async function loadGallery() {
      try {
        const page = await firebaseGalleryService.getCustomerPage(currentUserId, currentCustomerId);
        if (!isCancelled) {
          setGallery(page.items);
          setGalleryCursor(page.cursor);
          setHasMoreGallery(page.hasMore);
        }
      } catch (error) {
        if (!isCancelled) setGalleryError('Não foi possível carregar a galeria.');
        console.error('Erro ao carregar histórico da galeria:', error);
      } finally {
        if (!isCancelled) {
          setLoadingGallery(false);
        }
      }
    }

    loadGallery();

    return () => {
      isCancelled = true;
    };
  }, [open, customer?.id, userId, galleryReload]);

  const handleGalleryDelete = async (item: GalleryItem) => {
    try {
      await firebaseGalleryService.deleteItem(item.id);
      setGallery((prev) => prev.filter((g) => g.id !== item.id));
      setLightboxItem(null);
      toast.success('Arte removida');
    } catch {
      toast.error('Erro ao remover arte');
    }
  };

  const loadMoreGallery = async () => {
    if (!open || !customer || !userId || !hasMoreGallery || galleryPageBusy.current) return;
    const generation = galleryGeneration.current;
    galleryPageBusy.current = true;
    setLoadingMoreGallery(true);
    setGalleryError(null);
    try {
      const page = await firebaseGalleryService.getCustomerPage(userId, customer.id, 30, galleryCursor);
      if (generation !== galleryGeneration.current) return;
      setGallery((previous) => [...new Map([...previous, ...page.items].map((item) => [item.id, item])).values()]);
      setGalleryCursor(page.cursor);
      setHasMoreGallery(page.hasMore);
    } catch {
      if (generation === galleryGeneration.current) setGalleryError('Falha ao carregar mais artes. Tente novamente.');
    } finally {
      if (generation === galleryGeneration.current) {
        galleryPageBusy.current = false;
        setLoadingMoreGallery(false);
      }
    }
  };

  const handleItemUploaded = (newItem: GalleryItem) => {
    setGallery((prev) => [newItem, ...prev]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="2xl" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border flex flex-row items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">{customer?.name}</DialogTitle>
              {customer?.phone && (
                <p className="text-xs text-muted-foreground mt-0.5">{customer.phone}</p>
              )}
            </div>
            {customer?.phone && (
              <a
                href={generateCustomerGreetingWhatsAppUrl({ name: customer.name, phone: customer.phone })}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-300 dark:bg-emerald-500/15 border border-emerald-500/20 rounded-lg px-3 py-1.5 transition-colors"
                title="Conversar no WhatsApp"
              >
                <MessageCircle className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </a>
            )}
          </DialogHeader>

          <DialogBody className="p-4 sm:p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
            <Tabs defaultValue="pedidos" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full">
                <TabsTrigger value="pedidos" className="flex-1 gap-1.5">
                  <ShoppingBag className="size-3.5" /> Pedidos
                  {!loadingOrders && <span className="text-xs opacity-60">({orders.length})</span>}
                </TabsTrigger>
                <TabsTrigger value="raiox" className="flex-1 gap-1.5">
                  <Sparkles className="size-3.5 text-amber-500" /> Raio X 360°
                </TabsTrigger>
                <TabsTrigger value="galeria" className="flex-1 gap-1.5">
                  <Images className="size-3.5" /> Galeria
                  {!loadingGallery && <span className="text-xs opacity-60">({gallery.length})</span>}
                </TabsTrigger>
              </TabsList>

              {/* ── Pedidos ── */}
              <TabsContent value="pedidos" className="flex-1 overflow-y-auto mt-3">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-medium">
                    {orders.length} {orders.length === 1 ? 'pedido carregado' : 'pedidos carregados'} — lista operacional; consulte o Raio X para indicadores históricos.
                  </span>
                  {onOpenNewOrder && customer && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenNewOrder(customer);
                      }}
                    >
                      <Plus className="size-3" />
                      Novo Pedido
                    </Button>
                  )}
                </div>
              {loadingOrders ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum pedido encontrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {orders
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((order) => (
                      <div
                        key={order.id}
                        className="flex items-start justify-between border rounded-md px-3 py-2 gap-3"
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{order.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            Criado: {formatDate(order.createdAt)} · Entrega: {formatDate(order.deliveryDate)}
                          </div>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <div className="font-semibold text-sm">{formatCurrency(order.price)}</div>
                          <Badge
                            variant="outline"
                            className={
                              {
                                pending: 'border-yellow-300 text-yellow-700 bg-yellow-50',
                                'in-progress': 'border-blue-300 text-blue-700 bg-blue-50',
                                completed: 'border-green-300 text-green-700 bg-green-50',
                                cancelled: 'border-red-300 text-red-700 bg-red-50',
                              }[order.status]
                            }
                          >
                            {
                              {
                                pending: 'Pendente',
                                'in-progress': 'Em Produção',
                                completed: 'Concluído',
                                cancelled: 'Cancelado',
                              }[order.status]
                            }
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* ── Galeria ── */}
            <TabsContent value="galeria" className="flex-1 overflow-y-auto mt-3">
              <div className="flex justify-end mb-3">
                <Button size="sm" className="gap-1.5" onClick={() => setUploadOpen(true)}>
                  <Plus className="size-3.5" /> Nova Arte
                </Button>
              </div>

              {loadingGallery ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square rounded-md" />
                  ))}
                </div>
              ) : gallery.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <Images className="size-10 opacity-30" />
                  <p className="text-sm">{hasMoreGallery ? "Nenhuma arte ativa nesta página. Carregue mais para continuar." : galleryError ? "Galeria indisponível" : "Nenhuma arte ainda"}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setUploadOpen(true)}
                  >
                    <Upload className="size-3.5" /> Adicionar arte
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setLightboxItem(item)}
                      className="group relative aspect-square rounded-md overflow-hidden border bg-muted"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.title}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {galleryError && <p role="alert" className="text-sm text-destructive mt-3">{galleryError}</p>}
              {galleryError && !hasMoreGallery && (
                <Button variant="outline" className="mt-3" onClick={() => setGalleryReload((value) => value + 1)}>
                  Tentar novamente
                </Button>
              )}
              {hasMoreGallery && (
                <Button variant="outline" className="mt-4 w-full" disabled={loadingMoreGallery} onClick={loadMoreGallery}>
                  {loadingMoreGallery ? 'Carregando…' : 'Carregar mais artes'}
                </Button>
              )}
            </TabsContent>

            {/* ── Raio X 360° Comercial ── */}
            <TabsContent value="raiox" className="flex-1 overflow-y-auto mt-3 space-y-4">
              {xray ? (
                <>
                  {/* Banner do Tier e Diagnóstico */}
                  <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${TIER_DEFINITIONS[xray.tier].badgeClass}`}>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl shrink-0">{TIER_DEFINITIONS[xray.tier].icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base leading-tight">
                            Cliente {TIER_DEFINITIONS[xray.tier].label}
                          </h4>
                          {xray.isInactive && (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              Inativo ({xray.daysSinceLastOrder}d)
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs opacity-90 mt-0.5">
                          {TIER_DEFINITIONS[xray.tier].description}
                        </p>
                      </div>
                    </div>

                    {customer?.phone && (
                      <a
                        href={generateCustomerGreetingWhatsAppUrl({
                          name: customer.name,
                          phone: customer.phone,
                          customMessage: xray.isInactive
                            ? `Olá ${customer.name}, tudo bem? Sentimos sua falta aqui no ateliê! Preparamos condições especiais para o seu próximo pedido :)`
                            : `Olá ${customer.name}! Passando para agradecer sua parceria e preferência com o nosso ateliê!`,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-background/80 hover:bg-background text-foreground border shadow-xs transition-colors shrink-0"
                      >
                        <MessageCircle className="size-3.5 text-emerald-600" />
                        <span>{xray.isInactive ? 'Mensagem de Reativação' : 'Agradecer Parceria'}</span>
                      </a>
                    )}
                  </div>

                  {/* Grid de 4 Cards de Métricas Principais */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Tag className="size-3.5 text-primary" />
                        <span>Ticket Médio</span>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-foreground">
                        {formatCurrency(xray.averageTicket)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Por pedido entregue</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <DollarSign className="size-3.5 text-emerald-600" />
                        <span>Faturamento Total</span>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-foreground">
                        {formatCurrency(xray.totalRevenue)}
                      </p>
                      {xray.inProductionAmount > 0 ? (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          + {formatCurrency(xray.inProductionAmount)} em produção
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">{xray.completedOrdersCount} pedidos concluídos</p>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Clock className="size-3.5 text-violet-600" />
                        <span>Recência / Última Compra</span>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-foreground">
                        {xray.daysSinceLastOrder !== null ? `${xray.daysSinceLastOrder} dias` : '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {xray.lastOrderDate ? `Última em ${formatDate(xray.lastOrderDate)}` : 'Nenhuma compra'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <TrendingUp className="size-3.5 text-sky-600" />
                        <span>Frequência Média</span>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-foreground">
                        {xray.frequencyDays ? `~${xray.frequencyDays} dias` : '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {xray.frequencyDays ? 'Intervalo entre compras' : 'Requer > 1 pedido'}
                      </p>
                    </div>
                  </div>

                  {/* Hábitos de Consumo do Cliente */}
                  <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm space-y-3">
                    <h5 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <PackageCheck className="size-3.5 text-primary" />
                      Hábitos de Compra & Preferências
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-background/60 border border-border/40">
                        <span className="text-muted-foreground text-[11px] block">Produto Favorito:</span>
                        {xray.topProduct ? (
                          <div className="mt-1">
                            <strong className="text-foreground text-sm block">{xray.topProduct.name}</strong>
                            <span className="text-muted-foreground text-[10px]">
                              {xray.topProduct.count} unidades • {formatCurrency(xray.topProduct.revenue)} gerados
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic mt-1 block">Nenhum produto registrado</span>
                        )}
                      </div>

                      <div className="p-2.5 rounded-lg bg-background/60 border border-border/40">
                        <span className="text-muted-foreground text-[11px] block">Forma de Pagamento Mais Usada:</span>
                        <div className="mt-1 flex items-center gap-2">
                          <CreditCard className="size-4 text-primary shrink-0" />
                          <strong className="text-foreground text-sm uppercase">
                            {xray.preferredPaymentMethod || 'Não informada'}
                          </strong>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Histórico de transações</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Dados insuficientes para gerar o Raio X deste cliente.
                </div>
              )}
            </TabsContent>
          </Tabs>
          </DialogBody>

          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex items-center justify-end bg-card">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gallery Lightbox */}
      {lightboxItem && (
        <Dialog open onOpenChange={() => setLightboxItem(null)}>
          <DialogContent size="2xl" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
              <DialogTitle className="text-sm font-semibold truncate flex-1">
                {lightboxItem.title}
              </DialogTitle>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleGalleryDelete(lightboxItem)}
                  title="Excluir arte"
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setLightboxItem(null)}
                  title="Fechar"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <div className="bg-black/95 flex-1 flex items-center justify-center p-2 min-h-56 max-h-[70dvh] overflow-hidden">
              <img
                src={lightboxItem.imageUrl}
                alt={lightboxItem.title}
                className="max-w-full max-h-[70dvh] object-contain select-none"
              />
            </div>
            {lightboxItem.description && (
              <p className="px-4 py-2.5 text-xs sm:text-sm text-muted-foreground border-t bg-card shrink-0">
                {lightboxItem.description}
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Dialog */}
      {userId && customer && (
        <CustomerGalleryUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          customer={customer}
          userId={userId}
          onUploaded={handleItemUploaded}
        />
      )}
    </>
  );
}
