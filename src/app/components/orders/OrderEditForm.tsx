import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { TagInput } from '../TagInput';
import { OrderStatus, PaymentStatus, PaymentMethod, Tag } from '../../types';
import { Plus, Trash2, Repeat2, X, Save } from 'lucide-react';

export interface ProductItem {
  name: string;
  quantity: string;
  unitPrice: string;
}

export interface OrderEditState {
  customerName: string;
  customerPhone: string;
  deliveryDate: string;
  notes: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | undefined;
  paidAmount: number | '';
  isExchange: boolean;
  exchangeNotes: string;
  cardColor: string;
}

interface OrderEditFormProps {
  editData: OrderEditState;
  onEditDataChange: (data: OrderEditState) => void;
  editProducts: ProductItem[];
  onEditProductsChange: (
    updater: ProductItem[] | ((prev: ProductItem[]) => ProductItem[])
  ) => void;
  editExchangeItems: ProductItem[];
  onEditExchangeItemsChange: (
    updater: ProductItem[] | ((prev: ProductItem[]) => ProductItem[])
  ) => void;
  editTags: Tag[];
  onEditTagsChange: (tags: Tag[]) => void;
  totalPrice: number;
  originalPrice: number;
  formatCurrency: (v: number) => string;
  onCancel: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export function OrderEditForm({
  editData,
  onEditDataChange,
  editProducts,
  onEditProductsChange,
  editExchangeItems,
  onEditExchangeItemsChange,
  editTags,
  onEditTagsChange,
  totalPrice,
  originalPrice,
  formatCurrency,
  onCancel,
  onSave,
  isSaving,
}: OrderEditFormProps) {
  const currentPrice = totalPrice > 0 ? totalPrice : originalPrice;
  const remainingPrice = currentPrice - (Number(editData.paidAmount) || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Nome do Cliente *</Label>
          <Input
            id="customerName"
            value={editData.customerName}
            onChange={(e) => onEditDataChange({ ...editData, customerName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Telefone *</Label>
          <Input
            id="customerPhone"
            value={editData.customerPhone}
            onChange={(e) => onEditDataChange({ ...editData, customerPhone: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Produtos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Produtos *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 h-7 text-xs"
            onClick={() =>
              onEditProductsChange((prev) => [...prev, { name: '', quantity: '1', unitPrice: '' }])
            }
          >
            <Plus className="size-3" /> Adicionar item
          </Button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[280px]">
            <div className="grid grid-cols-[1fr_48px_84px_32px] gap-2 px-1">
              <span className="text-xs text-muted-foreground">Produto</span>
              <span className="text-xs text-muted-foreground text-center">Qtd</span>
              <span className="text-xs text-muted-foreground text-right">Valor unit.</span>
              <span />
            </div>
            <div className="space-y-2">
              {editProducts.map((item, idx) => {
                const sub =
                  (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="grid grid-cols-[1fr_48px_84px_32px] gap-2 items-center">
                      <Input
                        placeholder={`Produto ${idx + 1}`}
                        value={item.name}
                        onChange={(e) =>
                          onEditProductsChange((prev) =>
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
                          onEditProductsChange((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, quantity: e.target.value } : p))
                          )
                        }
                        className="text-center px-1"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={item.unitPrice}
                        onChange={(e) =>
                          onEditProductsChange((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, unitPrice: e.target.value } : p))
                          )
                        }
                        className="text-right px-2"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          onEditProductsChange((prev) => prev.filter((_, i) => i !== idx))
                        }
                        disabled={editProducts.length === 1}
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
                <span className="text-sm font-semibold">
                  Total: {formatCurrency(totalPrice)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="deliveryDate">Data de Entrega *</Label>
          <Input
            id="deliveryDate"
            type="date"
            value={editData.deliveryDate}
            onChange={(e) => onEditDataChange({ ...editData, deliveryDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="editStatus">Status *</Label>
          <Select
            value={editData.status}
            onValueChange={(value: OrderStatus) =>
              onEditDataChange({ ...editData, status: value })
            }
          >
            <SelectTrigger id="editStatus">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in-progress">Em Produção</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={editData.notes}
          onChange={(e) => onEditDataChange({ ...editData, notes: e.target.value })}
          rows={3}
          placeholder="Observações sobre o pedido..."
        />
      </div>

      {/* Permuta / Parceria */}
      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Repeat2 className="size-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Permuta / Parceria</p>
            <p className="text-xs text-muted-foreground">Sem cobrança monetária</p>
          </div>
        </div>
        <Switch
          checked={editData.isExchange}
          onCheckedChange={(v) => onEditDataChange({ ...editData, isExchange: v })}
        />
      </div>

      {editData.isExchange && (
        <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-950/10 dark:border-purple-800 p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                O que você recebe em troca
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 h-7 text-xs"
                onClick={() =>
                  onEditExchangeItemsChange((prev) => [
                    ...prev,
                    { name: '', quantity: '1', unitPrice: '' },
                  ])
                }
              >
                <Plus className="size-3" /> Adicionar item
              </Button>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[280px]">
                <div className="grid grid-cols-[1fr_48px_84px_32px] gap-2 px-1">
                  <span className="text-xs text-muted-foreground">Item recebido</span>
                  <span className="text-xs text-muted-foreground text-center">Qtd</span>
                  <span className="text-xs text-muted-foreground text-right">Valor est.</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {editExchangeItems.map((item, idx) => {
                    const sub =
                      (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="grid grid-cols-[1fr_48px_84px_32px] gap-2 items-center">
                          <Input
                            placeholder={`Item ${idx + 1}`}
                            value={item.name}
                            onChange={(e) =>
                              onEditExchangeItemsChange((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p))
                              )
                            }
                          />
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              onEditExchangeItemsChange((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, quantity: e.target.value } : p
                                )
                              )
                            }
                            className="text-center px-1"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={item.unitPrice}
                            onChange={(e) =>
                              onEditExchangeItemsChange((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, unitPrice: e.target.value } : p
                                )
                              )
                            }
                            className="text-right px-2"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              onEditExchangeItemsChange((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            disabled={editExchangeItems.length === 1}
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
                {(() => {
                  const total = editExchangeItems.reduce(
                    (s, p) =>
                      s + (parseFloat(p.quantity) || 0) * (parseFloat(p.unitPrice) || 0),
                    0
                  );
                  return total > 0 ? (
                    <div className="flex justify-end border-t border-purple-200 pt-2">
                      <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                        Valor estimado: {formatCurrency(total)}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="editExchangeNotes"
              className="text-sm text-purple-800 dark:text-purple-300"
            >
              Observações da permuta
            </Label>
            <Textarea
              id="editExchangeNotes"
              value={editData.exchangeNotes}
              onChange={(e) =>
                onEditDataChange({ ...editData, exchangeNotes: e.target.value })
              }
              placeholder="Ex: artes para redes sociais em troca de impressões..."
              rows={2}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagInput
          tags={editTags}
          onChange={onEditTagsChange}
          placeholder="Adicione tags para categorizar o pedido..."
        />
      </div>

      {/* Cor do card */}
      <div className="space-y-2">
        <Label>Cor do card</Label>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => onEditDataChange({ ...editData, cardColor: '' })}
            className={`size-7 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
              !editData.cardColor
                ? 'border-foreground scale-110'
                : 'border-muted-foreground/40 hover:border-muted-foreground'
            }`}
          >
            ✕
          </button>
          {[
            '#ef4444',
            '#f97316',
            '#eab308',
            '#22c55e',
            '#06b6d4',
            '#3b82f6',
            '#8b5cf6',
            '#ec4899',
            '#a855f7',
            '#14b8a6',
          ].map((color) => (
            <button
              key={color}
              type="button"
              onClick={() =>
                onEditDataChange({
                  ...editData,
                  cardColor: editData.cardColor === color ? '' : color,
                })
              }
              className={`size-7 rounded-full border-2 transition-all ${
                editData.cardColor === color
                  ? 'border-foreground scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Seção de Pagamento */}
      <div className="border-t pt-4 space-y-4">
        <h3 className="font-medium text-sm">Informações de Pagamento</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="paymentStatus">Status do Pagamento *</Label>
            <Select
              value={editData.paymentStatus}
              onValueChange={(value: any) =>
                onEditDataChange({ ...editData, paymentStatus: value })
              }
            >
              <SelectTrigger id="paymentStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pagamento (opcional)</Label>
            <Select
              value={editData.paymentMethod || 'none'}
              onValueChange={(value: any) =>
                onEditDataChange({
                  ...editData,
                  paymentMethod: value === 'none' ? undefined : value,
                })
              }
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="credit">Cartão de Crédito</SelectItem>
                <SelectItem value="debit">Cartão de Débito</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="paidAmount">Valor Pago (R$)</Label>
            <Input
              id="paidAmount"
              type="number"
              min="0"
              step="0.01"
              value={editData.paidAmount}
              onChange={(e) =>
                onEditDataChange({
                  ...editData,
                  paidAmount: e.target.value === '' ? '' : parseFloat(e.target.value),
                })
              }
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Total</Label>
            <Input
              type="text"
              value={formatCurrency(currentPrice)}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label>Restante</Label>
            <Input
              type="text"
              value={formatCurrency(remainingPrice)}
              disabled
              className="bg-muted"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="size-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          <Save className="size-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
}
