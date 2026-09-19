import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Loader2, Trash2 } from 'lucide-react';
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
    try {
      await firebaseStoreProductService.bulkDeleteStoreProducts(selectedIds);
      toast.success(
        selectedIds.length === 1
          ? 'Produto removido da vitrine com sucesso.'
          : `${selectedIds.length} produtos removidos da vitrine com sucesso.`
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Erro na exclusão em lote:', err);
      // Fallback unitário se batch falhar
      try {
        let ok = 0;
        for (const id of selectedIds) {
          await firebaseStoreProductService.deleteStoreProduct(id);
          ok++;
        }
        toast.success(`${ok} produto(s) removido(s) da vitrine.`);
        onSuccess();
        onOpenChange(false);
      } catch (fallbackErr) {
        toast.error('Ocorreu um erro ao processar a exclusão dos itens.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[95vw] sm:max-w-md max-h-[85dvh] overflow-y-auto rounded-2xl p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 bg-background border shadow-xl">
        <AlertDialogHeader className="space-y-2.5 text-left">
          <div className="size-11 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
            <Trash2 className="size-5" />
          </div>
          <AlertDialogTitle className="text-base sm:text-lg font-bold text-foreground">
            Remover {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'itens'} da vitrine online?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Esta operação desvinculará e removerá permanentemente os itens selecionados do catálogo público. Suas fotos e páginas de divulgação deixarão de estar acessíveis aos clientes.
          </AlertDialogDescription>

          {/* Prévia dos itens selecionados */}
          {selectedProducts.length > 0 && (
            <div className="max-h-28 sm:max-h-36 overflow-y-auto mt-2 p-2 bg-muted/40 rounded-xl divide-y divide-border/60 text-xs">
              {selectedProducts.slice(0, 6).map((p) => (
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
              {selectedProducts.length > 6 && (
                <p className="pt-1.5 text-[11px] text-muted-foreground text-center font-medium">
                  + outros {selectedProducts.length - 6} produtos selecionados
                </p>
              )}
            </div>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 flex flex-col gap-2.5 sm:flex-row-reverse sm:gap-2">
          <Button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirmDelete}
            className="w-full sm:w-auto h-10 sm:h-9 text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] transition-transform"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Confirmar Exclusão ({selectedIds.length})</span>
              </>
            )}
          </Button>
          <AlertDialogCancel
            disabled={isDeleting}
            className="w-full sm:w-auto h-10 sm:h-9 text-xs font-semibold mt-0"
          >
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
