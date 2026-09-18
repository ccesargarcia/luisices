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
  number?: string;
  complement?: string;
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
  method: PaymentMethod | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentDate: string | null;
  notes: string | null;
  history: PaymentHistory[] | null;
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
  createdByName?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  assignedBy?: string;
  productionWorkflow?: ProductionWorkflow;
  attachments?: OrderAttachment[];
  orderNumber?: string;
  isExchange?: boolean;    // Permuta / parceria
  exchangeNotes?: string;  // Detalhes da permuta
  exchangeItems?: ExchangeItem[]; // Itens recebidos na permuta
  cardColor?: string;      // Cor de destaque do card
  realCost?: number;       // Custo real da produção
  version?: number;        // Versão para controle de concorrência
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
  recipeId?: string;
  unitCost?: number;
  profitMargin?: number;
  isPublic?: boolean;          // Exibir no catálogo online público
  leadTimeDays?: number;      // Prazo de confecção em dias úteis
  badge?: string;             // Selo de destaque (ex: "Mais Vendido", "Lançamento")
  isCustomizable?: boolean;   // Permite personalização com nome
}

export interface Quote {
  id: string;
  quoteNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
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

export type UserRole = 'admin' | 'user' | 'funcionario';

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
  emails?: boolean;
  pricing?: boolean;
  store?: boolean;
  storeProducts?: ModulePermission;
  whatsapp?: boolean;
}

export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl?: string;
  leadTimeDays: number;
  badge?: string;
  isCustomizable: boolean;
  active: boolean;
  order?: number;
  internalProductId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CatalogOrderStatus = 'received' | 'in_contact' | 'converted' | 'cancelled';

export interface CatalogOrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  customName?: string;
  leadTimeDays: number;
  imageUrl?: string;
}

export interface CatalogOrder {
  id: string;
  orderCode: string;
  customerNotes?: string;
  items: CatalogOrderItem[];
  totalItems: number;
  subtotal: number;
  status: CatalogOrderStatus;
  createdAt: string;
  updatedAt?: string;
  convertedOrderId?: string;
  isPriceTampered?: boolean;
  officialSubtotal?: number;
  submittedSubtotal?: number;
  priceWarning?: string;
}

// ─── Pricing & Costs (Papelaria Personalizada) ────────────────────────────────

export type SupplyUnit = 'folha' | 'metro' | 'cm' | 'unidade' | 'ml' | 'g' | 'pacote';

export type SupplyCategory =
  | 'papeis'
  | 'fitas_aviamentos'
  | 'impressao_tintas'
  | 'embalagens'
  | 'adesivos_colas'
  | 'outros';

export interface SupplyItem {
  id: string;
  userId: string;
  name: string;
  category: SupplyCategory;
  purchasePrice: number;       // Preço de compra do pacote/rolo (ex: R$ 35,00)
  packageQuantity: number;     // Quantidade no pacote/rolo (ex: 100)
  unit: SupplyUnit;            // Unidade fracionada (ex: 'folha', 'metro')
  unitCost: number;            // Custo unitário = purchasePrice / packageQuantity
  supplier?: string | null;    // Loja/fornecedor
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface RecipeItem {
  supplyId?: string | null;    // ID do insumo se veio do catálogo
  name: string;
  category?: SupplyCategory | null;
  unit: SupplyUnit;
  unitCost: number;            // Custo por unidade fracionada
  quantityUsed: number;        // Quantidade consumida por unidade do produto
  totalCost: number;           // unitCost * quantityUsed
  isCustomItem?: boolean;      // Item avulso sem cadastro prévio
}

export interface MonthlyFixedExpenses {
  rent?: number;               // Aluguel
  electricity?: number;        // Energia
  internet?: number;           // Internet
  meiTax?: number;             // DAS MEI
  softwareSubscriptions?: number; // Softwares (Canva, Silhouette, etc.)
  otherFixedExpenses?: number;    // Outros
}

export interface StudioPricingSettings {
  userId: string;
  desiredSalary: number;       // Pró-labore mensal desejado (ex: R$ 3000)
  workingDaysPerMonth: number; // Dias trabalhados/mês (ex: 20)
  workingHoursPerDay: number;  // Horas/dia (ex: 6)
  monthlyFixedExpenses: MonthlyFixedExpenses;
  defaultWasteMarginPercent: number;    // Perda padrão (ex: 10%)
  defaultPaymentFeePercent: number;     // Taxa de cartão padrão (ex: 4.5%)
  defaultProfitMarginPercent: number;  // Margem de lucro padrão (ex: 50%)
  updatedAt?: string;
}

export interface BatchTier {
  quantity: number;
  scaleDiscountPercent: number;
  unitCost: number;
  unitPrice: number;
  totalPrice: number;
  totalProfit: number;
}

export interface ProductPricingRecipe {
  id: string;
  userId: string;
  productId?: string | null;          // Vinculado a um Product existente
  productName: string;
  category?: string | null;
  items: RecipeItem[];
  materialsCost: number;
  wasteMarginPercent: number;
  materialsCostWithWaste: number;
  laborMode: 'time' | 'proportional';
  productionTimeMinutes?: number;
  hourlyRateApplied: number;
  proportionalPercent?: number;
  laborCost: number;
  fixedCostsShare: number;
  totalUnitCost: number;
  paymentFeePercent: number;
  profitMarginPercent: number;
  suggestedUnitPrice: number;
  manualUnitPrice?: number | null;
  batchTiers?: BatchTier[];
  createdAt: string;
  updatedAt?: string;
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
  lastPasswordResetRequestedAt?: string;
  whatsappPhone?: string;
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
  emails:    true,
  pricing:   true,
  store:     true,
  storeProducts: { view: true, create: true, edit: true, delete: true },
  whatsapp:  true,
};

export const DEFAULT_USER_PERMISSIONS: Permission = {
  dashboard: true,
  orders:    { view: true, create: true, edit: true, delete: true },
  customers: { view: true, create: true, edit: true, delete: true },
  products:  { view: true, create: true, edit: true, delete: true },
  quotes:    { view: true, create: true, edit: true, delete: true },
  gallery:   { view: true, create: true, delete: true },
  reports:   true,
  exchanges: true,
  settings:  true,
  users:     { view: false, create: false, edit: false, delete: false },
  emails:    false,
  pricing:   true,
  store:     true,
  storeProducts: { view: true, create: true, edit: true, delete: false },
  whatsapp:  true,
};

export const EMPLOYEE_PERMISSIONS: Permission = {
  dashboard: true,
  orders:    { view: true, create: false, edit: true, delete: false },
  customers: { view: true, create: false, edit: false, delete: false },
  products:  { view: true, create: false, edit: false, delete: false },
  quotes:    { view: true, create: false, edit: false, delete: false },
  gallery:   { view: true, create: true, delete: false },
  reports:   false,
  exchanges: false,
  settings:  false,
  users:     { view: false, create: false, edit: false, delete: false },
  emails:    false,
  pricing:   false,
  store:     false,
  storeProducts: { view: false, create: false, edit: false, delete: false },
  whatsapp:  true,
};

// Tipos para sistema de compartilhamento de dados
export type SharedResourceType = 'orders' | 'customers' | 'quotes' | 'products' | 'gallery';

export interface SharedAccess {
  id: string;
  ownerId: string; // UID de quem compartilhou
  ownerEmail: string; // Email de quem compartilhou (para exibir na UI)
  ownerName: string; // Nome de quem compartilhou
  grantedToUserId: string; // UID de quem recebeu permissão
  grantedToEmail: string; // Email de quem recebeu
  resources: SharedResourceType[]; // Quais recursos foram compartilhados
  createdAt: string;
  expiresAt?: string; // Opcional - data de expiração do compartilhamento
  active: boolean; // Permite desativar sem deletar
}

// ─── Central de E-mails Resend ────────────────────────────────────────────────

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  contentDisposition?: string | null;
  contentId?: string | null;
  size?: number;
  downloadUrl?: string;
}

export interface ReceivedEmail {
  id: string;
  resendId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  raw?: {
    download_url?: string;
    expires_at?: string;
  } | null;
  read: boolean;
  starred: boolean;
  archived?: boolean;
  receivedAt: string;
  createdAt?: any;
}

export interface SentEmail {
  id: string;
  resendId?: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  status: 'sent' | 'failed' | 'pending';
  senderUid: string;
  senderEmail: string;
  sentAt: string;
  createdAt?: any;
}

export interface SendEmailPayload {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailUsage {
  daily: {
    used: number;
    limit: number | null;
    sent: number;
    received: number;
    resetsAt?: string | null;
  };
  monthly: {
    used: number;
    limit: number | null;
    sent: number;
    received: number;
    resetsAt?: string | null;
  };
  source?: 'resend_api' | 'firestore_fallback' | 'default';
}

// Histórico Financeiro de Vendas (Sales Ledger)
export interface SaleRecord {
  id: string; // id único, mapeado para o orderId para evitar duplicações
  orderId: string;
  orderNumber?: string;
  userId: string; // Dono da conta / criador do pedido
  assignedTo?: string; // UID do funcionário atribuído
  assignedToName?: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  productName: string;
  quantity: number;
  amount: number; // Valor monetário total
  paymentStatus: PaymentStatus;
  paidAmount: number;
  paymentMethod?: PaymentMethod | null;
  date: string; // ISO string para ordenação e filtro por período
  deliveryDate?: string;
  status: OrderStatus; // 'completed' | 'in-progress' | 'pending' | 'cancelled'
  isDeletedFromOrders?: boolean; // Se o pedido foi removido da visão operacional
  notes?: string | null;
  tags?: Tag[] | null;
  createdAt: string;
  updatedAt?: string;
}

export type LedgerPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';

// Tipos para o Copiloto de IA Interno
export interface AiOrderDraft {
  customerName: string;
  customerPhone?: string;
  productName: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  deliveryDate?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
}

export interface AiWhatsAppDraft {
  recipientPhone?: string;
  recipientName?: string;
  messageText: string;
  type: 'cobranca' | 'status_producao' | 'pronto_retirada' | 'orcamento' | 'confirmacao_pedido' | 'geral';
}

export interface AiPricingEstimate {
  productName: string;
  quantity: number;
  unitCost: number;
  suggestedUnitPrice: number;
  suggestedTotalPrice: number;
  profitMarginPercent?: number;
  breakdown?: {
    materials?: number;
    customization?: number;
    labor?: number;
  };
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  orderDraft?: AiOrderDraft | null;
  whatsappDraft?: AiWhatsAppDraft | null;
  pricingEstimate?: AiPricingEstimate | null;
}

// ─── Central de Atendimento WhatsApp (Evolution API) ──────────────────────────
export interface WhatsAppMessage {
  id: string;
  chatId: string; // Número normalizado (ex: 5511999999999)
  phone: string;
  customerName?: string;
  customerId?: string;
  sender: 'me' | 'customer';
  text: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  timestamp: string;
  evolutionMessageId?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  sentByUid?: string;
  createdAt?: any;
}

export interface WhatsAppConversation {
  id: string; // phone normalizado
  phone: string;
  customerName: string;
  customerId?: string | null;
  photoUrl?: string | null;
  lastMessageText: string;
  lastMessageTimestamp: string;
  lastMessageSender: 'me' | 'customer';
  unreadCount: number;
  orderCount?: number;
  lastOrderSummary?: string;
  updatedAt?: any;
}