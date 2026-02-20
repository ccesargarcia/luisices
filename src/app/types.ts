export type OrderStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid';
export type PaymentMethod = 'pix' | 'cash' | 'credit' | 'debit' | 'transfer';
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

// Workflow de produção - 7 etapas
export type ProductionStep =
  | 'design'
  | 'approval'
  | 'printing'
  | 'cutting'
  | 'assembly'
  | 'quality-check'
  | 'packaging';

export interface ProductionWorkflow {
  currentStep: ProductionStep;
  steps: {
    [key in ProductionStep]: {
      completed: boolean;
      completedAt?: string;
      completedBy?: string;
      notes?: string;
    };
  };
  startedAt?: string;
  estimatedCompletionDate?: string;
}

export interface Tag {
  name: string;
  color: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string; // campo legado
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  birthday?: string; // formato YYYY-MM-DD
  status?: 'active' | 'vip' | 'recurring' | 'defaulter' | 'partner'; // status do cliente
  photoUrl?: string; // foto do cliente
  createdAt: string;
  userId: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string;
}

export interface Payment {
  status: PaymentStatus;
  method?: PaymentMethod;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentDate?: string;
  notes?: string;
  history?: PaymentHistory[];
}

export interface PaymentHistory {
  amount: number;
  date: string;
  method: PaymentMethod;
  notes?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerId?: string; // Link para Customer
  productName: string;
  quantity: number;
  price: number;
  cost?: number; // Custo estimado de produção
  realCost?: number; // Custo real após produção
  status: OrderStatus;
  deliveryDate: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  tags?: Tag[];
  payment?: Payment;
  userId: string;
  productionWorkflow?: ProductionWorkflow;
  attachments?: OrderAttachment[];
  orderNumber?: string;
  isExchange?: boolean;    // Permuta / parceria
  exchangeNotes?: string;  // Detalhes da permuta
  exchangeItems?: ExchangeItem[]; // Itens recebidos na permuta
  cardColor?: string;      // Cor de destaque do card
}

export interface ExchangeItem {
  name: string;
  quantity: number;
  value?: number; // valor estimado
}

export interface OrderAttachment {
  url: string;        // URL original (full size)
  thumbnail?: string; // URL da thumbnail gerada (webp, max 300px)
  name?: string;      // Nome original do arquivo
  isPdf?: boolean;
}

// ─── Orçamentos ───────────────────────────────────────────────────────────────

export interface QuoteItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  unitPrice: number;
  description?: string;
  category?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerId?: string;
  items: QuoteItem[];       // Itens / produtos do orçamento
  totalPrice: number;       // Soma automática dos itens
  estimatedCost?: number;   // Custo estimado de produção
  status: QuoteStatus;
  deliveryDate: string;     // Prazo estimado de entrega
  validUntil?: string;      // Validade do orçamento
  notes?: string;
  tags?: Tag[];
  cardColor?: string;
  isExchange?: boolean;
  exchangeNotes?: string;
  discount?: number;              // Valor do desconto
  discountType?: 'percent' | 'fixed'; // Tipo: percentual ou valor fixo
  paymentCondition?: string;       // Ex: "50% entrada + 50% na entrega"
  deliveryType?: 'pickup' | 'delivery'; // Retirada ou entrega
  deliveryAddress?: string;        // Endereço de entrega (se deliveryType === 'delivery')
  rejectionReason?: string;        // Motivo da rejeição
  orderId?: string;         // Preenchido após aprovação → conversão em pedido
  orderNumber?: string;     // Número do pedido gerado
  createdAt: string;
  sentAt?: string;          // Data de envio ao cliente
  approvedAt?: string;      // Data de aprovação
  rejectedAt?: string;      // Data de rejeição
  expiredAt?: string;       // Data de expiração
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface WeekDay {
  date: string;
  dayName: string;
  orders: Order[];
}

// Estatísticas e analytics
export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingPayments: number;
  totalProfit?: number;
  averageOrderValue: number;
  topCustomers: Customer[];
}

export interface SalesReport {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  paymentMethods: { method: PaymentMethod; total: number; count: number }[];
}

// Alertas e notificações
export interface DeliveryAlert {
  orderId: string;
  customerName: string;
  productName: string;
  deliveryDate: string;
  daysUntilDelivery: number;
  status: OrderStatus;
}

// Configurações do usuário
export interface UserSettings {
  userId: string;
  businessName?: string;
  notifications: {
    deliveryAlerts: boolean;
    paymentReminders: boolean;
    daysBeforeDelivery: number; // Quantos dias antes alertar
  };
  workflow: {
    enabledSteps: ProductionStep[];
    requireApproval: boolean;
  };
  defaultValues: {
    profitMargin?: number; // Margem de lucro padrão em %
    deliveryDays?: number; // Prazo de entrega padrão em dias
  };
}