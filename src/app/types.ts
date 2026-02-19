export type OrderStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid';
export type PaymentMethod = 'pix' | 'cash' | 'credit' | 'debit' | 'transfer';

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
  cost?: number; // Custo de produção
  status: OrderStatus;
  deliveryDate: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  tags?: Tag[];
  payment?: Payment;
  userId: string;
  productionWorkflow?: ProductionWorkflow;
  attachments?: string[]; // URLs de imagens/arquivos
}

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