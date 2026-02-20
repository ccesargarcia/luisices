export interface DashboardCardConfig {
  id: string;
  label: string;
  description: string;
}

export const DASHBOARD_CARD_CONFIGS: DashboardCardConfig[] = [
  { id: 'total',        label: 'Total de Pedidos',       description: 'Quantidade geral de pedidos' },
  { id: 'revenue',      label: 'Receita Total',          description: 'Soma de pedidos concluídos' },
  { id: 'open',         label: 'Total em Aberto',        description: 'Valor dos pedidos a entregar' },
  { id: 'avgTicket',    label: 'Ticket Médio',           description: 'Valor médio por pedido' },
  { id: 'inProgress',   label: 'Em Produção',            description: 'Pedidos em andamento' },
  { id: 'toReceive',    label: 'A Receber',              description: 'Pagamentos pendentes' },
  { id: 'received',     label: 'Já Recebido',            description: 'Total pago pelos clientes' },
  { id: 'topProducts',  label: 'Produtos Mais Vendidos', description: 'Ranking de receita por produto' },
  { id: 'delivery',     label: 'Alertas de Entrega',     description: 'Entregas próximas do prazo' },
  { id: 'overdue',      label: 'Pedidos Atrasados',      description: 'Pedidos fora do prazo' },
];

export const DEFAULT_DASHBOARD_CARDS = DASHBOARD_CARD_CONFIGS.map((c) => c.id);
