import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  PackagePlus,
  Search,
  Loader2,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '../../types';
import { firebaseProductService } from '../../../services/firebaseProductService';
import { firebaseStoreProductService } from '../../../services/firebaseStoreProductService';

export interface ImportFromAtelierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportFromAtelierDialog({ open, onOpenChange, onImported }: ImportFromAtelierDialogProps) {
  const [internalProducts, setInternalProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      firebaseProductService
        .getProducts()
        .then(setInternalProducts)
        .catch(() => toast.error('Erro ao buscar produtos internos do ateliê'))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return internalProducts;
    const q = search.toLowerCase();
    return internalProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
    );
  }, [internalProducts, search]);

  async function handleImport(prod: Product) {
    setImportingId(prod.id);
    try {
      await firebaseStoreProductService.importFromInternalProduct(prod);
      toast.success(`"${prod.name}" importado para a vitrine da lojinha!`);
      onImported();
    } catch {
      toast.error('Erro ao importar produto');
    } finally {
      setImportingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" noPadding className="max-h-[88dvh] flex flex-col overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="size-5 text-primary" />
            Importar Produtos do Ateliê para a Lojinha
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecione produtos cadastrados na sua produção interna para publicá-los instantaneamente no catálogo público.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="p-4 sm:p-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>Carregando produtos do ateliê...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhum produto encontrado.
              </div>
            ) : (
              filtered.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/70 hover:bg-muted/40 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {prod.photoUrl ? (
                      <img
                        src={prod.photoUrl}
                        alt={prod.name}
                        className="size-10 rounded-md object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="size-10 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                        <Package size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{prod.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {prod.category || 'Sem categoria'} • R$ {(prod.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleImport(prod)}
                    disabled={importingId === prod.id}
                    className="shrink-0 text-xs gap-1.5 hover:bg-primary hover:text-white"
                  >
                    {importingId === prod.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}
                    <span>Publicar na Lojinha</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogBody>

        <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
