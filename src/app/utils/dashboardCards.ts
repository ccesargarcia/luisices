export interface DashboardCardConfig {
  id: string;
  label: string;
  description: string;
}

export const DASHBOARD_CARD_CONFIGS: DashboardCardConfig[] = [
  { id: 'total',        label: 'Total de Pedidos',          description: 'Quantidade geral no quadro operacional' },
  { id: 'revenue',      label: 'Receita (Mês Atual)',       description: 'Soma de pedidos concluídos no mês corrente' },
  { id: 'open',         label: 'Total em Aberto',           description: 'Valor dos pedidos a produzir e entregar' },
  { id: 'avgTicket',    label: 'Ticket Médio (Mês Atual)',  description: 'Média por venda válida no mês corrente' },
  { id: 'inProgress',   label: 'Em Produção',               description: 'Pedidos em andamento na esteira' },
  { id: 'toReceive',    label: 'A Receber',                 description: 'Pagamentos pendentes de pedidos ativos' },
  { id: 'received',     label: 'Recebido (Mês Atual)',      description: 'Total pago pelos clientes no mês corrente' },
  { id: 'topProducts',  label: 'Produtos Mais Vendidos',    description: 'Ranking de receita por produto' },
  { id: 'delivery',     label: 'Alertas de Entrega',        description: 'Entregas próximas do prazo' },
  { id: 'overdue',      label: 'Pedidos Atrasados',         description: 'Pedidos fora do prazo' },
  { id: 'statusChart',  label: 'Gráfico de Status',         description: 'Donut com distribuição dos pedidos por status' },
  { id: 'weeklyChart',  label: 'Gráfico Semanal',           description: 'Barras com pedidos criados por semana' },
];

export const DEFAULT_DASHBOARD_CARDS = DASHBOARD_CARD_CONFIGS.map((c) => c.id);
