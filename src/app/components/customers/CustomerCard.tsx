import React from 'react';
import { formatDate } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { Customer } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Calendar,
  Trash2,
  Edit,
  History,
  Cake,
  Star,
} from 'lucide-react';

interface CustomerCardProps {
  customer: Customer;
  isSelected: boolean;
  onToggleSelect: (customerId: string, selected: boolean) => void;
  onOpenHistory: (customer: Customer) => void;
  onOpenEdit: (customer: Customer) => void;
  onOpenDelete: (customer: Customer) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function CustomerCard({
  customer,
  isSelected,
  onToggleSelect,
  onOpenHistory,
  onOpenEdit,
  onOpenDelete,
  canEdit,
  canDelete,
}: CustomerCardProps) {
  const addressLine = customer.address || [customer.street, customer.number, customer.complement]
    .filter(Boolean)
    .join(', ');
  const statusAccent = {
    active: 'border-l-emerald-400/70',
    vip: 'border-l-amber-400/80',
    recurring: 'border-l-violet-400/70',
    defaulter: 'border-l-red-400/80',
    partner: 'border-l-sky-400/70',
  }[customer.status || 'active'];
  const avatarAccent = {
    active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200',
    vip: 'bg-amber-500/20 text-amber-800 dark:text-amber-200',
    recurring: 'bg-violet-500/15 text-violet-800 dark:text-violet-200',
    defaulter: 'bg-red-500/15 text-red-800 dark:text-red-200',
    partner: 'bg-sky-500/15 text-sky-800 dark:text-sky-200',
  }[customer.status || 'active'];
  const statusColor = {
    active: '#759986',
    vip: '#b49a5a',
    recurring: '#8d789f',
    defaulter: '#b86b6b',
    partner: '#6785a8',
  }[customer.status || 'active'];

  return (
    <Card
      className={`border-l-4 border-[color:var(--glass-border)] shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgb(123_84_85_/_8%)] dark:border-[color:var(--glass-border)] ${statusAccent}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${statusColor} 10%, var(--card))`,
        borderTopColor: `color-mix(in srgb, ${statusColor} 35%, var(--glass-border))`,
        borderRightColor: `color-mix(in srgb, ${statusColor} 25%, var(--glass-border))`,
        borderBottomColor: `color-mix(in srgb, ${statusColor} 25%, var(--glass-border))`,
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onToggleSelect(customer.id, Boolean(checked))}
              className="mt-1"
              aria-label={`Selecionar ${customer.name}`}
            />
            <div className={`size-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-white/30 ${avatarAccent}`}>
              {customer.photoUrl ? (
                <img
                  src={customer.photoUrl}
                  alt={customer.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="text-base font-semibold text-muted-foreground">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{customer.name}</CardTitle>
                {customer.status === 'vip' && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border gap-1 py-0">
                    <Star className="size-3 fill-yellow-500 text-yellow-500" /> VIP
                  </Badge>
                )}
                {customer.status === 'recurring' && (
                  <Badge variant="outline" className="text-blue-700 border-blue-300 py-0">
                    Cliente recorrente
                  </Badge>
                )}
                {customer.status === 'defaulter' && (
                  <Badge variant="outline" className="text-red-700 border-red-300 py-0">
                    Inadimplente
                  </Badge>
                )}
                {customer.status === 'partner' && (
                  <Badge variant="outline" className="text-purple-700 border-purple-300 py-0 gap-1">
                    🤝 Parceiro
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="size-3" />
                {customer.phone}
              </div>
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenHistory(customer)}
              title="Ver histórico de pedidos"
              aria-label={`Ver histórico de ${customer.name}`}
              className="h-9 w-9 sm:h-8 sm:w-8"
            >
              <History className="size-4" />
            </Button>
            {canEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenEdit(customer)}
                aria-label={`Editar ${customer.name}`}
                className="h-9 w-9 sm:h-8 sm:w-8"
              >
                <Edit className="size-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onOpenDelete(customer)}
                aria-label={`Remover ${customer.name}`}
                className="h-9 w-9 sm:h-8 sm:w-8"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {customer.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="size-3 text-muted-foreground" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {addressLine && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-3 text-muted-foreground" />
            <span className="truncate">{addressLine}</span>
          </div>
        )}
        {(customer.city || customer.state) && !addressLine && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="size-3 text-muted-foreground" />
            <span className="truncate">
              {[customer.city, customer.state].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-white/30">
          <div className="flex items-center gap-1 text-sm">
            <ShoppingBag className="size-3" />
            <span>{customer.totalOrders || 0} pedidos</span>
          </div>
          <div className="font-semibold text-sm">
            {formatCurrency(customer.totalSpent || 0)}
          </div>
        </div>
        {customer.lastOrderDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            Último pedido: {formatDate(customer.lastOrderDate)}
          </div>
        )}
        {customer.birthday && (() => {
          const [, mm, dd] = customer.birthday!.split('-').map(Number);
          const today = new Date();
          const next = new Date(today.getFullYear(), mm - 1, dd);
          if (next < today) next.setFullYear(today.getFullYear() + 1);
          const days = Math.round((next.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
          return (
            <div
              className={`flex items-center gap-2 text-xs ${
                days === 0 ? 'text-yellow-600 font-semibold' : 'text-muted-foreground'
              }`}
            >
              <Cake className="size-3" />
              {days === 0
                ? '🎂 Aniversário hoje!'
                : days <= 7
                ? `Aniversário em ${days}d — ${dd.toString().padStart(2, '0')}/${mm.toString().padStart(2, '0')}`
                : `Aniversário: ${dd.toString().padStart(2, '0')}/${mm.toString().padStart(2, '0')}`}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
