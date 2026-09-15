import React from 'react';
import { Quote } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar, Package } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { getTextColor } from '../../utils/tagColors';
import {
  STATUS_LABELS,
  STATUS_VARIANT,
  formatDate,
  hexToRgba,
} from './quoteHelpers';

interface QuoteCardProps {
  quote: Quote;
  onClick: () => void;
  compact?: boolean;
}

export function QuoteCard({ quote, onClick, compact = false }: QuoteCardProps) {
  const daysToDelivery = Math.ceil(
    (new Date(quote.deliveryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isUrgent = daysToDelivery >= 0 && daysToDelivery <= 3;
  const isOverdue =
    daysToDelivery < 0 &&
    quote.status !== 'approved' &&
    quote.status !== 'rejected' &&
    quote.status !== 'expired';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all overflow-hidden"
      style={
        quote.cardColor
          ? {
              backgroundColor: hexToRgba(quote.cardColor, 0.18),
              borderColor: quote.cardColor,
              borderWidth: 1.5,
            }
          : undefined
      }
      onClick={onClick}
    >
      {compact ? (
        /* ── COMPACT ─────────────────────────────────────── */
        <div className="px-3 py-2 space-y-1">
          {/* Row 1: name + status */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm truncate flex-1">
              {quote.customerName}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium leading-4 shrink-0 ${
                STATUS_VARIANT[quote.status]
              }`}
            >
              {STATUS_LABELS[quote.status]}
            </span>
          </div>
          {/* Row 2: items + price */}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate flex-1">
              {quote.items.map((i) => i.name).join(', ')}
            </span>
            <span className="font-medium text-foreground shrink-0">
              {formatCurrency(quote.totalPrice)}
            </span>
          </div>
          {/* Row 3: date + urgent */}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3 shrink-0" />
              {formatDate(quote.deliveryDate)}
            </span>
            {isUrgent && quote.status !== 'approved' && quote.status !== 'rejected' && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 leading-4">
                {daysToDelivery === 0 ? 'Hoje!' : `${daysToDelivery}d`}
              </Badge>
            )}
            {isOverdue && (
              <Badge className="text-[10px] py-0 px-1.5 leading-4 bg-orange-600 text-white">
                Atrasado
              </Badge>
            )}
          </div>
          {/* Tags (compact) */}
          {quote.tags && quote.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 pt-0.5">
              {quote.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0 rounded-full text-[10px] font-medium leading-4"
                  style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── COMFORTABLE ─────────────────────────────────── */
        <>
          <CardHeader className="pb-2">
            {/* Linha 1: número + valor */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                {quote.quoteNumber}
              </span>
              <span className="font-bold text-base tabular-nums">
                {formatCurrency(quote.totalPrice)}
              </span>
            </div>
            {/* Linha 2: nome + badge */}
            <div className="flex items-center gap-2 mt-1 min-w-0">
              <p className="font-semibold truncate flex-1">{quote.customerName}</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                  STATUS_VARIANT[quote.status]
                }`}
              >
                {STATUS_LABELS[quote.status]}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground truncate">
              {quote.items.map((i) => i.name).join(', ')}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                Entrega: {formatDate(quote.deliveryDate)}
              </span>
              {isUrgent && quote.status !== 'approved' && quote.status !== 'rejected' && (
                <Badge variant="destructive" className="text-xs">
                  {daysToDelivery === 0 ? 'Hoje!' : `${daysToDelivery}d`}
                </Badge>
              )}
              {isOverdue && (
                <Badge className="text-xs bg-orange-600 text-white">Atrasado</Badge>
              )}
            </div>
            {quote.status === 'approved' && quote.orderNumber && (
              <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
                <Package className="size-3" />
                Pedido {quote.orderNumber}
              </div>
            )}
            {quote.tags && quote.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {quote.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
}
