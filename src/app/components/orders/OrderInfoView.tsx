import React from 'react';
import { Order } from '../../types';
import { Badge } from '../ui/badge';
import {
  Calendar,
  DollarSign,
  Package,
  Phone,
  User,
  FileText,
  Clock,
  Tag as TagIcon,
  Repeat2,
  UserRoundCheck,
} from 'lucide-react';
import { formatDate } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { getTextColor } from '../../utils/tagColors';

interface OrderInfoViewProps {
  order: Order;
}

export function OrderInfoView({ order }: OrderInfoViewProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="size-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">Cliente</div>
              <div className="font-medium">{order.customerName}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="size-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">Telefone</div>
              <div className="font-medium">{order.customerPhone}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Package className="size-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">Produto</div>
              <div className="font-medium">{order.productName}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Quantidade: {order.quantity} unidades
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="size-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">Data de Entrega</div>
              <div className="font-medium">{formatDate(order.deliveryDate)}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="size-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">Valor Total</div>
              <div className="font-medium text-lg">{formatCurrency(order.price)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {formatCurrency(order.price / (order.quantity || 1))} por unidade
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="size-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">Criado em</div>
              <div className="font-medium">{formatDate(order.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
        <UserRoundCheck className="size-5 text-muted-foreground mt-0.5" />
        <div>
          <div className="text-sm text-muted-foreground">Criado por</div>
          <div className="font-medium">{order.createdByName || 'Usuário proprietário'}</div>
        </div>
      </div>

      {/* Permuta / Parceria */}
      {order.isExchange && (
        <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <Repeat2 className="size-5 text-purple-600 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="text-sm font-medium text-purple-800 dark:text-purple-300">
              Permuta / Parceria
            </div>
            {order.exchangeItems && order.exchangeItems.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-purple-700 dark:text-purple-400">
                  Itens recebidos:
                </p>
                <div className="space-y-0.5">
                  {order.exchangeItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm text-purple-700 dark:text-purple-400"
                    >
                      <span>
                        {item.quantity > 1 ? `${item.name} (${item.quantity}x)` : item.name}
                      </span>
                      {item.value != null && item.value > 0 && (
                        <span className="text-xs">
                          {formatCurrency(item.quantity * item.value)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {(() => {
                  const total = order.exchangeItems.reduce(
                    (s, i) => s + i.quantity * (i.value ?? 0),
                    0
                  );
                  return total > 0 ? (
                    <div className="flex justify-end border-t border-purple-200 pt-1">
                      <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">
                        Valor estimado: {formatCurrency(total)}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            {order.exchangeNotes && (
              <div className="text-sm text-purple-700 dark:text-purple-400">
                {order.exchangeNotes}
              </div>
            )}
          </div>
        </div>
      )}

      {order.notes && (
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <FileText className="size-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">Observações</div>
            <div className="text-sm text-muted-foreground">{order.notes}</div>
          </div>
        </div>
      )}

      {order.tags && order.tags.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <TagIcon className="size-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium mb-2">Tags</div>
            <div className="flex flex-wrap gap-2">
              {order.tags.map((tag, index) => (
                <Badge
                  key={index}
                  className="border-0"
                  style={{
                    backgroundColor: tag.color,
                    color: getTextColor(tag.color),
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Informações de Pagamento */}
      {order.payment && (
        <div className="border-t pt-4">
          <h3 className="font-medium text-sm mb-4">Informações de Pagamento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge
                className={`ml-2 ${
                  order.payment.status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : order.payment.status === 'partial'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {order.payment.status === 'paid'
                  ? 'Pago'
                  : order.payment.status === 'partial'
                  ? 'Parcial'
                  : 'Pendente'}
              </Badge>
            </div>
            {order.payment.method && (
              <div>
                <span className="text-muted-foreground">Método:</span>
                <span className="ml-2 font-medium">
                  {order.payment.method === 'pix'
                    ? 'Pix'
                    : order.payment.method === 'cash'
                    ? 'Dinheiro'
                    : order.payment.method === 'credit'
                    ? 'Cartão de Crédito'
                    : order.payment.method === 'debit'
                    ? 'Cartão de Débito'
                    : 'Transferência'}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Valor Pago:</span>
              <span className="ml-2 font-medium text-green-600">
                {formatCurrency(order.payment.paidAmount)}
              </span>
            </div>
            {order.payment.remainingAmount > 0 && (
              <div>
                <span className="text-muted-foreground">Restante:</span>
                <span className="ml-2 font-medium text-orange-600">
                  {formatCurrency(order.payment.remainingAmount)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custo Real */}
      {order.realCost != null && (
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <DollarSign className="size-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">Custo Real de Produção</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Custo real:</span>
                <span className="ml-2 font-medium">{formatCurrency(order.realCost)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Margem:</span>
                <span
                  className={`ml-2 font-medium ${
                    order.price - order.realCost >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(order.price - order.realCost)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
