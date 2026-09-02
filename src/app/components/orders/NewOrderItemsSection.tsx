import React, { useState } from 'react';
import { Product } from '../../types';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export interface ProductItem {
  name: string;
  quantity: string;
  unitPrice: string;
}

interface NewOrderItemsSectionProps {
  products: ProductItem[];
  onProductsChange: (
    updater: ProductItem[] | ((prev: ProductItem[]) => ProductItem[])
  ) => void;
  catalogProducts: Product[];
  totalPrice: number;
}

export function NewOrderItemsSection({
  products,
  onProductsChange,
  catalogProducts,
  totalPrice,
}: NewOrderItemsSectionProps) {
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogOpenIdx, setCatalogOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Produtos *</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 h-7 text-xs"
          onClick={() =>
            onProductsChange((prev) => [
              ...prev,
              { name: '', quantity: '1', unitPrice: '' },
            ])
          }
        >
          <Plus className="size-3" /> Adicionar item
        </Button>
      </div>

      {/* Header das colunas */}
      <div className="grid grid-cols-[36px_1fr_56px_96px_36px] gap-2 px-1">
        <span />
        <span className="text-xs text-muted-foreground">Produto</span>
        <span className="text-xs text-muted-foreground text-center">Qtd</span>
        <span className="text-xs text-muted-foreground text-right">Valor unit.</span>
        <span />
      </div>

      <div className="space-y-2">
        {products.map((item, idx) => {
          const sub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
          return (
            <div key={idx} className="space-y-0.5">
              <div className="grid grid-cols-[36px_1fr_56px_96px_36px] gap-2 items-center">
                <Popover
                  open={catalogOpenIdx === idx}
                  onOpenChange={(v) => {
                    setCatalogOpenIdx(v ? idx : null);
                    if (v) setCatalogSearch('');
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9"
                      title="Selecionar produto"
                    >
                      <BookOpen className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <Input
                      placeholder="Buscar produto..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="h-8 text-sm mb-2"
                      autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {catalogProducts
                        .filter(
                          (p) =>
                            !catalogSearch ||
                            p.name.toLowerCase().includes(catalogSearch.toLowerCase())
                        )
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted text-sm text-left"
                            onClick={() => {
                              onProductsChange((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, name: p.name, unitPrice: String(p.unitPrice) }
                                    : item
                                )
                              );
                              setCatalogOpenIdx(null);
                            }}
                          >
                            <span className="truncate">{p.name}</span>
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                              {formatCurrency(p.unitPrice)}
                            </span>
                          </button>
                        ))}
                      {catalogProducts.filter(
                        (p) =>
                          !catalogSearch ||
                          p.name.toLowerCase().includes(catalogSearch.toLowerCase())
                      ).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Nenhum produto encontrado
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Input
                  placeholder={`Produto ${idx + 1}`}
                  value={item.name}
                  onChange={(e) =>
                    onProductsChange((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p))
                    )
                  }
                  required={idx === 0}
                />
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    onProductsChange((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, quantity: e.target.value } : p))
                    )
                  }
                  className="text-center px-1"
                  required={idx === 0}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={item.unitPrice}
                  onChange={(e) =>
                    onProductsChange((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, unitPrice: e.target.value } : p))
                    )
                  }
                  className="text-right px-2"
                  required={idx === 0}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    onProductsChange((prev) => prev.filter((_, i) => i !== idx))
                  }
                  disabled={products.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {sub > 0 && (
                <p className="text-xs text-muted-foreground text-right pr-10">
                  subtotal: {formatCurrency(sub)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {totalPrice > 0 && (
        <div className="flex justify-end border-t pt-2">
          <span className="text-sm font-semibold">Total: {formatCurrency(totalPrice)}</span>
        </div>
      )}
    </div>
  );
}
