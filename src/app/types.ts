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

// ─── Gallery ──────────────────────────────────────────────────────────────────

export interface GalleryItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  imageUrl: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  orderNumber?: string;
  tags?: Tag[];
  createdAt: string;
}

// ─── User Management ─────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'user';

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Permission {
  dashboard: boolean;
  orders: ModulePermission;
  customers: ModulePermission;
  products: ModulePermission;
  quotes: ModulePermission;
  gallery: { view: boolean; create: boolean; delete: boolean };
  reports: boolean;
  exchanges: boolean;
  settings: boolean;
  users: ModulePermission;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions: Permission;
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export const ADMIN_PERMISSIONS: Permission = {
  dashboard: true,
  orders:    { view: true, create: true, edit: true, delete: true },
  customers: { view: true, create: true, edit: true, delete: true },
  products:  { view: true, create: true, edit: true, delete: true },
  quotes:    { view: true, create: true, edit: true, delete: true },
  gallery:   { view: true, create: true, delete: true },
  reports:   true,
  exchanges: true,
  settings:  true,
  users:     { view: true, create: true, edit: true, delete: true },
};

export const DEFAULT_USER_PERMISSIONS: Permission = {
  dashboard: true,
  orders:    { view: true, create: true, edit: true, delete: false },
  customers: { view: true, create: true, edit: true, delete: false },
  products:  { view: true, create: false, edit: false, delete: false },
  quotes:    { view: true, create: true, edit: true, delete: false },
  gallery:   { view: true, create: true, delete: false },
  reports:   false,
  exchanges: false,
  settings:  false,
  users:     { view: false, create: false, edit: false, delete: false },
};