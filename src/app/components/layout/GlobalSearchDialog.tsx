import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '../ui/command';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  Settings,
  BarChart3,
  FileText,
  ShoppingBag,
  Images,
  Mail,
  MessageSquare,
  ArrowLeftRight,
  UserCog,
  Coins,
  Store,
  Palette,
  Archive,
  Plus,
  Sparkles,
  HelpCircle,
  Globe,
  Search,
} from 'lucide-react';
import { useOrders } from '../../../contexts/OrdersContext';
import { Order } from '../../types';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenNewOrder?: () => void;
  onOpenNewCustomer?: () => void;
  onOpenAiCopilot?: () => void;
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
  onOpenNewOrder,
  onOpenNewCustomer,
  onOpenAiCopilot,
}: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const [search, setSearch] = useState('');

  // Fechar dialog ao navegar
  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  // Pedidos filtrados pela busca
  const matchingOrders = React.useMemo<Order[]>(() => {
    if (!search || search.trim().length < 2) return [];
    const q = search.toLowerCase().trim();
    return (orders || [])
      .filter(
        (o: Order) =>
          o.customerName?.toLowerCase().includes(q) ||
          o.productName?.toLowerCase().includes(q) ||
          o.orderNumber?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [orders, search]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Busca Global"
      description="Procure páginas, ações rápidas ou pedidos no sistema"
    >
      <CommandInput
        placeholder="Digite para buscar páginas, clientes, pedidos ou atalhos..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-80 overflow-y-auto">
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {/* Ações Rápidas */}
        <CommandGroup heading="Ações Rápidas">
          {onOpenNewOrder && (
            <CommandItem
              onSelect={() =>
                handleSelect(() => {
                  onOpenNewOrder();
                })
              }
              className="cursor-pointer"
            >
              <Plus className="size-4 mr-2 text-primary" />
              <span>Cadastrar Novo Pedido</span>
            </CommandItem>
          )}
          <CommandItem
            onSelect={() =>
              handleSelect(() => {
                navigate('/orcamentos?novo=1');
              })
            }
            className="cursor-pointer"
          >
            <FileText className="size-4 mr-2 text-primary" />
            <span>Criar Novo Orçamento</span>
          </CommandItem>
          {onOpenNewCustomer && (
            <CommandItem
              onSelect={() =>
                handleSelect(() => {
                  onOpenNewCustomer();
                })
              }
              className="cursor-pointer"
            >
              <Users className="size-4 mr-2 text-primary" />
              <span>Cadastrar Novo Cliente</span>
            </CommandItem>
          )}
          {onOpenAiCopilot && (
            <CommandItem
              onSelect={() =>
                handleSelect(() => {
                  onOpenAiCopilot();
                })
              }
              className="cursor-pointer"
            >
              <Sparkles className="size-4 mr-2 text-amber-500" />
              <span>Abrir Copiloto de IA</span>
            </CommandItem>
          )}
        </CommandGroup>

        {/* Pedidos Recentes / Correspondentes */}
        {matchingOrders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Pedidos Encontrados">
              {matchingOrders.map((order: Order) => (
                <CommandItem
                  key={order.id}
                  onSelect={() =>
                    handleSelect(() => {
                      navigate(`/?pedido=${order.id}`);
                    })
                  }
                  className="cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{order.customerName}</span>
                    <span className="text-xs text-muted-foreground truncate">— {order.productName}</span>
                  </div>
                  {order.orderNumber && (
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0 ml-2">
                      #{order.orderNumber}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        {/* Módulos de Navegação */}
        <CommandGroup heading="Navegação & Telas">
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/'))}
            className="cursor-pointer"
          >
            <LayoutDashboard className="size-4 mr-2" />
            <span>Dashboard & Esteira de Pedidos</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/agenda'))}
            className="cursor-pointer"
          >
            <Calendar className="size-4 mr-2" />
            <span>Agenda Semanal de Entregas</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/pedidos-arquivados'))}
            className="cursor-pointer"
          >
            <Archive className="size-4 mr-2" />
            <span>Pedidos Arquivados</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/whatsapp'))}
            className="cursor-pointer"
          >
            <MessageSquare className="size-4 mr-2" />
            <span>Atendimento WhatsApp</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/clientes'))}
            className="cursor-pointer"
          >
            <Users className="size-4 mr-2" />
            <span>Gestão de Clientes</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/orcamentos'))}
            className="cursor-pointer"
          >
            <FileText className="size-4 mr-2" />
            <span>Orçamentos & Propostas</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/permutas'))}
            className="cursor-pointer"
          >
            <ArrowLeftRight className="size-4 mr-2" />
            <span>Permutas & Parcerias</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/produtos'))}
            className="cursor-pointer"
          >
            <Package className="size-4 mr-2" />
            <span>Catálogo de Produtos do Ateliê</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/precificacao'))}
            className="cursor-pointer"
          >
            <Coins className="size-4 mr-2" />
            <span>Precificação & Custos de Insumos</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/galeria'))}
            className="cursor-pointer"
          >
            <Images className="size-4 mr-2" />
            <span>Galeria de Artes & Fotos</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/personalizar-lojinha'))}
            className="cursor-pointer"
          >
            <Palette className="size-4 mr-2" />
            <span>Personalizar Vitrine / Lojinha Online</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/relatorios'))}
            className="cursor-pointer"
          >
            <BarChart3 className="size-4 mr-2" />
            <span>Relatórios Financeiros & Métricas</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/usuarios'))}
            className="cursor-pointer"
          >
            <UserCog className="size-4 mr-2" />
            <span>Equipe & Permissões</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/configuracoes'))}
            className="cursor-pointer"
          >
            <Settings className="size-4 mr-2" />
            <span>Configurações do Sistema</span>
          </CommandItem>
          <CommandItem
            onSelect={() => handleSelect(() => navigate('/ajuda'))}
            className="cursor-pointer"
          >
            <HelpCircle className="size-4 mr-2" />
            <span>Central de Ajuda & Guia de Uso</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
