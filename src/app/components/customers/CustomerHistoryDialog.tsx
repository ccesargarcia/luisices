import React, { useState, useEffect } from 'react';
import { Customer, Order, GalleryItem } from '../../types';
import { formatDate } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { ShoppingBag, Images, Plus, Upload, ZoomIn, Trash2, X, Loader2 } from 'lucide-react';
import { firebaseOrderService } from '../../../services/firebaseOrderService';
import { firebaseGalleryService } from '../../../services/firebaseGalleryService';
import { CustomerGalleryUploadDialog } from './CustomerGalleryUploadDialog';
import { toast } from 'sonner';

interface CustomerHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  userId?: string;
}

export function CustomerHistoryDialog({
  open,
  onOpenChange,
  customer,
  userId,
}: CustomerHistoryDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (!open || !customer) {
      setOrders([]);
      setGallery([]);
      return;
    }

    let isCancelled = false;
    setLoadingOrders(true);
    setLoadingGallery(true);

    async function loadData() {
      if (!customer) return;
      try {
        const [allOrders, galleryItems] = await Promise.all([
          firebaseOrderService.getOrders(),
          userId ? firebaseGalleryService.getItems(userId) : Promise.resolve([]),
        ]);

        if (!isCancelled) {
          setOrders(
            allOrders.filter(
              (o) => o.customerId === customer.id || o.customerName === customer.name
            )
          );
          setGallery(galleryItems.filter((g) => g.customerId === customer.id));
        }
      } catch (error) {
        console.error('Erro ao carregar histórico do cliente:', error);
      } finally {
        if (!isCancelled) {
          setLoadingOrders(false);
          setLoadingGallery(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [open, customer, userId]);

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

  const handleItemUploaded = (newItem: GalleryItem) => {
    setGallery((prev) => [newItem, ...prev]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-full sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{customer?.name}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="pedidos" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full">
              <TabsTrigger value="pedidos" className="flex-1 gap-1.5">
                <ShoppingBag className="size-3.5" /> Pedidos
                {!loadingOrders && <span className="text-xs opacity-60">({orders.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="galeria" className="flex-1 gap-1.5">
                <Images className="size-3.5" /> Galeria
                {!loadingGallery && <span className="text-xs opacity-60">({gallery.length})</span>}
              </TabsTrigger>
            </TabsList>

            {/* ── Pedidos ── */}
            <TabsContent value="pedidos" className="flex-1 overflow-y-auto mt-3">
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
                  <p className="text-sm">Nenhuma arte ainda</p>
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
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Gallery Lightbox */}
      {lightboxItem && (
        <Dialog open onOpenChange={() => setLightboxItem(null)}>
          <DialogContent className="w-full max-w-full sm:max-w-2xl p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <DialogTitle className="text-sm font-semibold truncate flex-1">
                {lightboxItem.title}
              </DialogTitle>
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleGalleryDelete(lightboxItem)}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setLightboxItem(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>
            <div className="bg-black/90 flex items-center justify-center min-h-48 max-h-[70vh]">
              <img
                src={lightboxItem.imageUrl}
                alt={lightboxItem.title}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
            {lightboxItem.description && (
              <p className="px-4 py-2 text-sm text-muted-foreground">{lightboxItem.description}</p>
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
