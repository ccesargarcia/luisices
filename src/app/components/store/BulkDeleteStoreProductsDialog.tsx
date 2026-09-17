import { useState } from 'react';
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
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { firebaseStoreProductService } from '../../../services/firebaseStoreProductService';
import { StoreProduct } from '../../types';

interface BulkDeleteStoreProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  products: StoreProduct[];
  onSuccess: () => void;
}

export function BulkDeleteStoreProductsDialog({
  open,
  onOpenChange,
  selectedIds,
  products,
  onSuccess,
}: BulkDeleteStoreProductsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

  async function handleConfirmDelete() {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        await firebaseStoreProductService.deleteStoreProduct(id);
        successCount++;
      } catch (err) {
        console.error(`Erro ao deletar produto ${id}:`, err);
        failCount++;
      }
    }

    setIsDeleting(false);

    if (failCount === 0) {
      toast.success(`${successCount} produto(s) removido(s) da vitrine com sucesso!`);
    } else {
      toast.warning(`${successCount} produto(s) removido(s), ${failCount} falharam.`);
    }

    onSuccess();
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[94vw] sm:max-w-md rounded-2xl p-5 bg-background border shadow-xl">
        <AlertDialogHeader className="space-y-2">
          <div className="size-11 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
            <Trash2 className="size-5" />
          </div>
          <AlertDialogTitle className="text-base sm:text-lg font-bold text-foreground">
            Excluir {selectedIds.length} {selectedIds.length === 1 ? 'produto selecionado' : 'produtos selecionados'}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Esta ação removerá permanentemente os itens da vitrine da lojinha pública online. Suas fotos e links no catálogo deixarão de existir. Pedidos anteriores feitos no WhatsApp não serão alterados.
          </AlertDialogDescription>

          {/* Mini prévia dos itens selecionados */}
          {selectedProducts.length > 0 && (
            <div className="max-h-36 overflow-y-auto mt-2 p-2 bg-muted/40 rounded-xl divide-y divide-border/60 text-xs">
              {selectedProducts.slice(0, 5).map((p) => (
                <div key={p.id} className="py-1.5 flex items-center gap-2">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="size-6 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="size-6 rounded-md bg-muted flex items-center justify-center text-[10px] shrink-0">
                      📦
                    </div>
                  )}
                  <span className="truncate font-medium text-foreground">{p.name}</span>
                </div>
              ))}
              {selectedProducts.length > 5 && (
                <p className="pt-1.5 text-[11px] text-muted-foreground text-center font-medium">
                  + outros {selectedProducts.length - 5} produtos
                </p>
              )}
            </div>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className="w-full sm:w-auto h-9 text-xs"
          >
            Cancelar
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirmDelete}
            className="w-full sm:w-auto h-9 text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5 cursor-pointer shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Excluindo ({selectedIds.length})...</span>
              </>
            ) : (
              <>
                <Trash2 size={13} />
                <span>Sim, Excluir Todos</span>
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
