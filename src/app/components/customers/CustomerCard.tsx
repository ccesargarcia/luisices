import React, { memo } from 'react';
import { formatDate, getDaysUntilBirthday } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { generateCustomerGreetingWhatsAppUrl, generateCustomerBirthdayWhatsAppUrl } from '../../utils/whatsapp';
import { Customer } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
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
  MessageCircle,
  Gift,
} from 'lucide-react';

interface CustomerCardProps {
  customer: Customer;
  isSelected: boolean;
  onToggleSelect: (customerId: string, selected: boolean) => void;
  onOpenHistory: (customer: Customer) => void;
  onOpenEdit: (customer: Customer) => void;
  onOpenDelete: (customer: Customer) => void;
  onOpenNewOrder?: (customer: Customer) => void;
  canEdit: boolean;
  canDelete: boolean;
  canCreateOrder?: boolean;
}

function CustomerCardComponent({
  customer,
  isSelected,
  onToggleSelect,
  onOpenHistory,
  onOpenEdit,
  onOpenDelete,
  onOpenNewOrder,
  canEdit,
  canDelete,
  canCreateOrder = false,
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
      className={`border-l-4 border-[color:var(--glass-border)] shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgb(123_84_85_/_8%)] dark:border-[color:var(--glass-border)] gap-3 ${statusAccent}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${statusColor} 10%, var(--card))`,
        borderTopColor: `color-mix(in srgb, ${statusColor} 35%, var(--glass-border))`,
        borderRightColor: `color-mix(in srgb, ${statusColor} 25%, var(--glass-border))`,
        borderBottomColor: `color-mix(in srgb, ${statusColor} 25%, var(--glass-border))`,
      }}
    >
      <CardHeader className="pb-0 pt-5 px-5 sm:px-6">
        <div className="flex items-start gap-3 min-w-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onToggleSelect(customer.id, Boolean(checked))}
            className="mt-1 shrink-0"
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
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <CardTitle className="text-base sm:text-lg font-semibold truncate leading-tight" title={customer.name}>
                {customer.name}
              </CardTitle>
              {customer.status === 'vip' && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 border gap-1 py-0 text-[11px]">
                  <Star className="size-3 fill-yellow-500 text-yellow-500" /> VIP
                </Badge>
              )}
              {customer.status === 'recurring' && (
                <Badge variant="outline" className="text-blue-700 border-blue-300 py-0 text-[11px]">
                  Cliente recorrente
                </Badge>
              )}
              {customer.status === 'defaulter' && (
                <Badge variant="outline" className="text-red-700 border-red-300 py-0 text-[11px]">
                  Inadimplente
                </Badge>
              )}
              {customer.status === 'partner' && (
                <Badge variant="outline" className="text-purple-700 border-purple-300 py-0 gap-1 text-[11px]">
                  🤝 Parceiro
                </Badge>
              )}
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Phone className="size-3 shrink-0" />
                  <span className="truncate">{customer.phone}</span>
                </div>
                <a
                  href={generateCustomerGreetingWhatsAppUrl({ name: customer.name, phone: customer.phone })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-300 dark:bg-emerald-500/15 rounded-md px-1.5 py-0.5 transition-colors"
                  title="Conversar no WhatsApp"
                  aria-label={`Conversar no WhatsApp com ${customer.name}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 px-5 sm:px-6 text-sm">
        {customer.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {addressLine && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{addressLine}</span>
          </div>
        )}
        {(customer.city || customer.state) && !addressLine && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {[customer.city, customer.state].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/20 dark:border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShoppingBag className="size-3.5 shrink-0" />
            <span>{customer.totalOrders || 0} pedidos</span>
          </div>
          <div className="font-semibold text-sm">
            {formatCurrency(customer.totalSpent || 0)}
          </div>
        </div>
        {customer.lastOrderDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" />
            <span>Último pedido: {formatDate(customer.lastOrderDate)}</span>
          </div>
        )}
        {customer.birthday && (() => {
          const days = getDaysUntilBirthday(customer.birthday);
          if (days === null) return null;
          const [, mm, dd] = customer.birthday.split('-');
          const isUpcomingOrToday = days <= 7;
          return (
            <div
              className={`flex items-center justify-between gap-2 text-xs pt-0.5 ${
                days === 0
                  ? 'text-amber-700 dark:text-amber-300 font-semibold'
                  : isUpcomingOrToday
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Cake className="size-3.5 shrink-0" />
                <span className="truncate">
                  {days === 0
                    ? '🎂 Aniversário hoje!'
                    : days <= 7
                    ? `Aniversário em ${days}d — ${dd}/${mm}`
                    : `Aniversário: ${dd}/${mm}`}
                </span>
              </div>
              {isUpcomingOrToday && customer.phone && (
                <a
                  href={generateCustomerBirthdayWhatsAppUrl({ name: customer.name, phone: customer.phone })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 rounded-full px-2 py-0.5 transition-colors"
                  title="Enviar mensagem de parabéns pelo WhatsApp"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Gift className="size-3 text-primary" />
                  <span>Parabenizar</span>
                </a>
              )}
            </div>
          );
        })()}
      </CardContent>

      <CardFooter className="pt-2.5 pb-3.5 px-5 sm:px-6 border-t border-border/30 flex items-center justify-between gap-2 mt-auto">
        <div>
          {canCreateOrder && onOpenNewOrder && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenNewOrder(customer)}
              title="Criar novo pedido para este cliente"
              aria-label={`Criar novo pedido para ${customer.name}`}
              className="h-8 px-2.5 text-xs text-primary border-primary/25 hover:bg-primary/10 hover:text-primary gap-1.5 font-medium transition-colors"
            >
              <ShoppingBag className="size-3.5" />
              <span>Novo Pedido</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onOpenHistory(customer)}
            title="Ver histórico de pedidos"
            aria-label={`Ver histórico de ${customer.name}`}
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <History className="size-4" />
          </Button>
          {canEdit && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenEdit(customer)}
              title="Editar cliente"
              aria-label={`Editar ${customer.name}`}
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <Edit className="size-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenDelete(customer)}
              title="Remover cliente"
              aria-label={`Remover ${customer.name}`}
              className="size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export const CustomerCard = memo(CustomerCardComponent);
