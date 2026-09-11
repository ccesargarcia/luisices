import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrdersContext';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import {
  Users,
  ChevronDown,
  X,
  Check,
  UserX,
  Shield,
  Briefcase,
  Layers,
  Search,
} from 'lucide-react';
import { cn } from './ui/utils';

interface AdminTeamFilterProps {
  variant?: 'header' | 'inline';
  className?: string;
}

export function AdminTeamFilter({ variant = 'header', className }: AdminTeamFilterProps) {
  const { userProfile } = useAuth();
  const {
    allOrders,
    selectedUserIds,
    toggleUserId,
    selectSoloUser,
    selectAllUsers,
    clearUserFilter,
    teamMembers,
    unassignedCount,
    isFilterActive,
    selectedFilterLabel,
  } = useOrders();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Apenas admins podem utilizar este filtro global de equipe
  if (userProfile?.role !== 'admin') {
    return null;
  }

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return teamMembers;
    const term = searchTerm.toLowerCase();
    return teamMembers.filter(
      (m) =>
        m.displayName.toLowerCase().includes(term) ||
        (m.email && m.email.toLowerCase().includes(term)),
    );
  }, [teamMembers, searchTerm]);

  const totalOrdersCount = allOrders.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'header' ? (
          <div className={cn('relative inline-flex items-center', className)}>
            <Button
              variant={isFilterActive ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-9 gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm font-medium transition-all rounded-full border',
                isFilterActive
                  ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 shadow-sm'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/80',
              )}
              title="Filtrar pedidos por responsável / equipe"
            >
              <Users className={cn('size-4 shrink-0', isFilterActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className="hidden xs:inline-block max-w-[130px] sm:max-w-[180px] truncate">
                {isFilterActive ? selectedFilterLabel : 'Equipe: Todos'}
              </span>
              {isFilterActive && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {selectedUserIds.length}
                </span>
              )}
              <ChevronDown className="size-3.5 opacity-60 shrink-0 ml-0.5" />
            </Button>
            {isFilterActive && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearUserFilter();
                }}
                className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-muted-foreground/30 hover:bg-destructive hover:text-destructive-foreground text-foreground text-[10px] transition-colors"
                title="Limpar filtro e visualizar tudo"
              >
                <X className="size-2.5" />
              </button>
            )}
          </div>
        ) : (
          <Button
            variant={isFilterActive ? 'secondary' : 'outline'}
            size="sm"
            className={cn(
              'h-9 gap-2 px-3 text-sm font-medium transition-all',
              isFilterActive
                ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:text-foreground',
              className,
            )}
          >
            <Users className="size-4 shrink-0" />
            <span className="truncate max-w-[200px]">
              {isFilterActive ? `Responsável: ${selectedFilterLabel}` : 'Visualizar: Todos'}
            </span>
            {isFilterActive && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-primary/20 text-primary">
                {selectedUserIds.length}
              </Badge>
            )}
            <ChevronDown className="size-3.5 opacity-60 ml-auto" />
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent align={variant === 'header' ? 'end' : 'start'} className="w-[calc(100vw-1.5rem)] sm:w-96 max-w-[384px] p-0 shadow-xl">
        <div className="p-3.5 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm leading-tight">Visualização por Responsável</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cálculos e entregas calculados individualmente ou por grupo
              </p>
            </div>
            {isFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearUserFilter()}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
              >
                Limpar
              </Button>
            )}
          </div>

          {teamMembers.length > 4 && (
            <div className="relative mt-2.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar membro da equipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          {/* Opção 1: Visualizar Tudo */}
          <div
            onClick={() => {
              selectAllUsers();
            }}
            className={cn(
              'flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors',
              !isFilterActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'hover:bg-muted/70 text-foreground',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                <Layers className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span>Visualizar Tudo</span>
                  {!isFilterActive && <Check className="size-3.5 text-primary" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Todos os pedidos e cálculos consolidados
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono ml-2 shrink-0">
              {totalOrdersCount}
            </Badge>
          </div>

          {/* Opção 2: Sem Responsável */}
          <div
            className={cn(
              'flex items-center justify-between p-2 rounded-md transition-colors text-sm',
              selectedUserIds.includes('unassigned')
                ? 'bg-amber-500/10 text-amber-900 dark:text-amber-200'
                : 'hover:bg-muted/70 text-foreground',
            )}
          >
            <div
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
              onClick={() => toggleUserId('unassigned')}
            >
              <Checkbox
                checked={selectedUserIds.includes('unassigned')}
                onCheckedChange={() => toggleUserId('unassigned')}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0"
              />
              <div className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                <UserX className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="leading-tight font-medium truncate">Sem responsável</div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Aguardando atribuição de funcionário
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              <Badge variant="secondary" className="text-xs font-mono">
                {unassignedCount}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  selectSoloUser('unassigned');
                }}
                title="Visualizar apenas pedidos sem responsável"
              >
                Apenas
              </Button>
            </div>
          </div>

          <Separator className="my-1.5" />

          {/* Seção: Membros da Equipe */}
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Membros da Equipe ({filteredMembers.length})</span>
            <span className="text-[10px] font-normal normal-case text-muted-foreground">
              Selecione 1, 2 ou mais
            </span>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Nenhum membro encontrado.
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isSelected = selectedUserIds.includes(member.uid);
              const initials = member.displayName
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase() || 'U';

              return (
                <div
                  key={member.uid}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-md transition-colors text-sm',
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/70 text-foreground',
                  )}
                >
                  <div
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    onClick={() => toggleUserId(member.uid)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleUserId(member.uid)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    />
                    <div
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full text-xs font-bold shrink-0',
                        member.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                      )}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span className="truncate">{member.displayName}</span>
                        {member.role === 'admin' ? (
                          <span
                            className="inline-flex items-center text-[10px] px-1 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-normal"
                            title="Administrador"
                          >
                            <Shield className="size-2.5 mr-0.5" /> Admin
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center text-[10px] px-1 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-normal"
                            title="Funcionário"
                          >
                            <Briefcase className="size-2.5 mr-0.5" /> Equipe
                          </span>
                        )}
                      </div>
                      {member.email && (
                        <p className="text-[11px] text-muted-foreground truncate font-normal">
                          {member.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Badge variant="outline" className="text-xs font-mono">
                      {member.orderCount}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSoloUser(member.uid);
                      }}
                      title={`Visualizar individualmente apenas ${member.displayName}`}
                    >
                      Apenas
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-2.5 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>{isFilterActive ? `${selectedUserIds.length} selecionado(s)` : 'Exibindo tudo'}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-6 text-xs px-2"
          >
            Concluir
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
