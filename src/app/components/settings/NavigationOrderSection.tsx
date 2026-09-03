import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { LayoutDashboard, GripVertical, Loader2, Calendar, Users, BarChart3, FileText, ShoppingBag, Images, ArrowLeftRight, UserCog, ChevronUp, ChevronDown } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/agenda', label: 'Agenda Semanal' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/relatorios', label: 'Relatórios' },
  { href: '/orcamentos', label: 'Orçamentos' },
  { href: '/produtos', label: 'Produtos' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/permutas', label: 'Permutas' },
  { href: '/usuarios', label: 'Usuários' },
];

export const DEFAULT_NAV_ORDER = NAV_ITEMS.map((i) => i.href);

interface NavigationOrderSectionProps {
  navOrder: string[];
  onNavOrderChange: (order: string[]) => void;
  onSave: (order: string[]) => Promise<void>;
  saving: boolean;
}

export function NavigationOrderSection({
  navOrder,
  onNavOrderChange,
  onSave,
  saving,
}: NavigationOrderSectionProps) {
  const [dragNavIdx, setDragNavIdx] = useState<number | null>(null);

  const moveNavItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= navOrder.length) return;
    const next = [...navOrder];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onNavOrderChange(next);
  };

  const icons = {
    '/': LayoutDashboard,
    '/agenda': Calendar,
    '/clientes': Users,
    '/relatorios': BarChart3,
    '/orcamentos': FileText,
    '/produtos': ShoppingBag,
    '/galeria': Images,
    '/permutas': ArrowLeftRight,
    '/usuarios': UserCog,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="size-5" />
          Ordem da Navegação
        </CardTitle>
        <CardDescription>
          Arraste os itens para reorganizar a ordem dos botões do menu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          {navOrder.map((href, idx) => {
            const item = NAV_ITEMS.find((i) => i.href === href);
            if (!item) return null;
            return (
              <div
                key={href}
                draggable
                onDragStart={() => setDragNavIdx(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragNavIdx === null || dragNavIdx === idx) return;
                  const next = [...navOrder];
                  const [moved] = next.splice(dragNavIdx, 1);
                  next.splice(idx, 0, moved);
                  onNavOrderChange(next);
                  setDragNavIdx(null);
                }}
                onDragEnd={() => setDragNavIdx(null)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md border bg-card cursor-grab active:cursor-grabbing select-none transition-opacity ${
                  dragNavIdx === idx ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <GripVertical className="hidden size-4 shrink-0 cursor-grab text-muted-foreground sm:block" />
                {React.createElement(icons[href as keyof typeof icons], { className: 'size-4 shrink-0 text-muted-foreground sm:hidden' })}
                <span className="text-sm font-medium flex-1">{item.label}</span>
                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={idx === 0}
                    onClick={() => moveNavItem(idx, -1)}
                    aria-label={`Mover ${item.label} para cima`}
                    className="size-8"
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={idx === navOrder.length - 1}
                    onClick={() => moveNavItem(idx, 1)}
                    aria-label={`Mover ${item.label} para baixo`}
                    className="size-8"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onSave(navOrder)} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Ordem'
            )}
          </Button>
          <Button variant="outline" onClick={() => onNavOrderChange(DEFAULT_NAV_ORDER)}>
            Restaurar padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
