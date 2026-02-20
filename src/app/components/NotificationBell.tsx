import { useMemo, useState, useEffect } from 'react';
import { Bell, Cake, AlertTriangle, Package, CalendarClock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { useAuth } from '../../contexts/AuthContext';
import { Customer } from '../types';

interface Notification {
  id: string;
  type: 'birthday-today' | 'birthday-week' | 'overdue' | 'due-today' | 'due-soon';
  label: string;
  sub?: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { orders } = useFirebaseOrders();
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (user) {
      firebaseCustomerService.getCustomers(user.uid).then(setCustomers).catch(() => {});
    }
  }, [user]);

  const notifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: Notification[] = [];

    // Aniversários
    customers.forEach(c => {
      if (!c.birthday) return;
      const [, mm, dd] = c.birthday.split('-').map(Number);
      const nextBirthday = new Date(today.getFullYear(), mm - 1, dd);
      if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
      const daysUntil = Math.round((nextBirthday.getTime() - today.getTime()) / 86400000);

      if (daysUntil === 0) {
        items.push({ id: `bday-${c.id}`, type: 'birthday-today', label: `Aniversário hoje: ${c.name}` });
      } else if (daysUntil <= 7) {
        items.push({
          id: `bday-${c.id}`,
          type: 'birthday-week',
          label: `Aniversário em ${daysUntil}d: ${c.name}`,
          sub: `${dd.toString().padStart(2, '0')}/${mm.toString().padStart(2, '0')}`,
        });
      }
    });

    // Pedidos atrasados
    orders
      .filter(o => {
        if (o.status !== 'pending' && o.status !== 'in-progress') return false;
        const d = new Date(o.deliveryDate);
        d.setHours(0, 0, 0, 0);
        return d < today;
      })
      .forEach(o => {
        const d = new Date(o.deliveryDate);
        d.setHours(0, 0, 0, 0);
        const daysLate = Math.round((today.getTime() - d.getTime()) / 86400000);
        items.push({
          id: `overdue-${o.id}`,
          type: 'overdue',
          label: `Atrasado ${daysLate}d: ${o.customerName}`,
          sub: o.productName,
        });
      });

    // Entregas hoje
    orders
      .filter(o => {
        if (o.status !== 'pending' && o.status !== 'in-progress') return false;
        const d = new Date(o.deliveryDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      })
      .forEach(o => {
        items.push({ id: `today-${o.id}`, type: 'due-today', label: `Entrega hoje: ${o.customerName}`, sub: o.productName });
      });

    // Entregas amanhã
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    orders
      .filter(o => {
        if (o.status !== 'pending' && o.status !== 'in-progress') return false;
        const d = new Date(o.deliveryDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === tomorrow.getTime();
      })
      .forEach(o => {
        items.push({ id: `soon-${o.id}`, type: 'due-soon', label: `Entrega amanhã: ${o.customerName}`, sub: o.productName });
      });

    return items;
  }, [customers, orders]);

  // Apenas tipos "urgentes" contam para o badge
  const urgentCount = notifications.filter(n =>
    n.type === 'birthday-today' || n.type === 'overdue' || n.type === 'due-today'
  ).length;

  const typeIcon = {
    'birthday-today': <Cake className="size-4 text-yellow-500 shrink-0" />,
    'birthday-week': <Cake className="size-4 text-muted-foreground shrink-0" />,
    'overdue': <AlertTriangle className="size-4 text-destructive shrink-0" />,
    'due-today': <Package className="size-4 text-blue-500 shrink-0" />,
    'due-soon': <CalendarClock className="size-4 text-muted-foreground shrink-0" />,
  } as const;

  const typeBg = {
    'birthday-today': 'bg-yellow-50 dark:bg-yellow-950/20',
    'birthday-week': '',
    'overdue': 'bg-red-50 dark:bg-red-950/20',
    'due-today': 'bg-blue-50 dark:bg-blue-950/20',
    'due-soon': '',
  } as const;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex items-center justify-center size-10 rounded-full hover:bg-muted transition-colors"
          aria-label="Notificações"
        >
          <Bell className="size-5" />
          {urgentCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {urgentCount > 9 ? '9+' : urgentCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-3 py-2.5 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {notifications.length > 0 && (
            <span className="text-xs text-muted-foreground">{notifications.length} item{notifications.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <Bell className="size-8 opacity-20" />
              <p className="text-sm">Tudo em dia!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <div key={n.id} className={`px-3 py-2.5 flex items-start gap-2.5 ${typeBg[n.type]}`}>
                  {typeIcon[n.type]}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-tight">{n.label}</div>
                    {n.sub && <div className="text-xs text-muted-foreground mt-0.5 truncate">{n.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
