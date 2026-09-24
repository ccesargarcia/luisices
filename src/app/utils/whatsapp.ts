import { Order } from '../types';

/**
 * Normaliza número de telefone brasileiro para envio ao WhatsApp (E.164 sem o sinal de +).
 * Garante que números com DDD (10 ou 11 dígitos) recebam o DDI 55 do Brasil,
 * e não duplica caso o usuário já tenha digitado 55.
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Se já tem 12 ou 13 dígitos e começa com 55 (55 + DDD + 8 ou 9 dígitos)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Se tem 10 ou 11 dígitos (DDD + 8 ou 9 dígitos), adiciona o DDI 55 do Brasil
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Caso genérico: se não tiver 55, adiciona
  return digits.startsWith('55') ? digits : `55${digits}`;
}

/**
 * Formata um número de telefone para exibição visual amigável: (11) 99999-9999 ou (11) 9999-9999.
 */
export function formatPhoneForDisplay(phone?: string | null): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Se tiver 12 ou 13 dígitos e começar com 55, remove o DDI para exibir o padrão nacional limpo
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  const limited = digits.slice(0, 11);
  if (limited.length <= 2) return limited;
  if (limited.length <= 6) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  if (limited.length <= 10) return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
}

/**
 * Formatar número de telefone para WhatsApp (remover caracteres especiais e garantir DDI)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  return normalizePhoneForWhatsApp(phone);
}

/**
 * Gerar mensagem formatada do pedido para WhatsApp
 */
export function generateOrderMessage(order: Order): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const statusLabels: Record<string, string> = {
    pending: '⏳ Pendente',
    'in-progress': '🔄 Em Produção',
    completed: '✅ Concluído',
    cancelled: '❌ Cancelado',
  };

  let message = `🎨 *Papelaria Personalizada*\n\n`;
  message += `Olá, ${order.customerName}! 👋\n\n`;
  message += `📋 *Detalhes do Pedido*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🏷️ Produto: ${order.productName}\n`;
  message += `📦 Quantidade: ${order.quantity} unidades\n`;
  message += `💰 Valor: ${formatCurrency(order.price)}\n`;
  message += `📅 Entrega prevista: ${formatDate(order.deliveryDate)}\n`;
  message += `📊 Status: ${statusLabels[order.status] || order.status}\n`;

  // Informações de pagamento se disponíveis
  if (order.payment) {
    message += `\n💳 *Pagamento*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `💵 Total: ${formatCurrency(order.payment.totalAmount)}\n`;
    message += `✅ Pago: ${formatCurrency(order.payment.paidAmount)}\n`;

    if (order.payment.remainingAmount > 0) {
      message += `⚠️ Restante: ${formatCurrency(order.payment.remainingAmount)}\n`;
    }

    if (order.payment.method) {
      const methodLabels: Record<string, string> = {
        pix: '📱 PIX',
        cash: '💵 Dinheiro',
        credit: '💳 Cartão de Crédito',
        debit: '💳 Cartão de Débito',
        transfer: '🏦 Transferência',
      };
      message += `💳 Forma: ${methodLabels[order.payment.method] || order.payment.method}\n`;
    }
  }

  // Workflow de produção se disponível
  if (order.productionWorkflow) {
    const steps = order.productionWorkflow.steps;
    const completedSteps = Object.values(steps).filter(step => step.completed).length;
    const totalSteps = Object.keys(steps).length;

    message += `\n🏭 *Progresso da Produção*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 ${completedSteps}/${totalSteps} etapas concluídas\n`;

    const stepLabels: Record<string, string> = {
      design: '🎨 Design',
      approval: '✅ Aprovação',
      printing: '🖨️ Impressão',
      cutting: '✂️ Corte',
      assembly: '🔨 Montagem',
      'quality-check': '🛡️ Controle de Qualidade',
      packaging: '📦 Embalagem',
    };

    Object.entries(steps).forEach(([key, step]) => {
      const icon = step.completed ? '✅' : '⏳';
      message += `${icon} ${stepLabels[key as keyof typeof stepLabels] || key}\n`;
    });
  }

  // Notas adicionais
  if (order.notes) {
    message += `\n📝 *Observações*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `${order.notes}\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📞 Dúvidas? Responda esta mensagem!\n`;
  message += `\nObrigado pela preferência! 🙏`;

  return message;
}

/**
 * Abrir WhatsApp com mensagem pré-formatada
 */
export function openWhatsApp(phone: string, message: string): void {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);

  // WhatsApp Web ou App dependendo do dispositivo
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const whatsappUrl = isMobile
    ? `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`
    : `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
}

/**
 * Abrir WhatsApp diretamente para o cliente do pedido
 */
export function openWhatsAppForOrder(order: Order): void {
  const message = generateOrderMessage(order);
  openWhatsApp(order.customerPhone, message);
}

/**
 * Gerar mensagem de lembrete de pagamento
 */
export function generatePaymentReminderMessage(order: Order): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (!order.payment || order.payment.remainingAmount <= 0) {
    return '';
  }

  let message = `🎨 *Papelaria Personalizada*\n\n`;
  message += `Olá, ${order.customerName}! 👋\n\n`;
  message += `📋 *Lembrete de Pagamento*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🏷️ Produto: ${order.productName}\n`;
  message += `💰 Valor total: ${formatCurrency(order.payment.totalAmount)}\n`;
  message += `✅ Já pago: ${formatCurrency(order.payment.paidAmount)}\n`;
  message += `⚠️ *Saldo restante: ${formatCurrency(order.payment.remainingAmount)}*\n\n`;
  message += `Aceitamos:\n`;
  message += `📱 PIX\n`;
  message += `💵 Dinheiro\n`;
  message += `💳 Cartão\n\n`;
  message += `📞 Qualquer dúvida, estou à disposição!\n`;
  message += `\nObrigado! 🙏`;

  return message;
}

/**
 * Gerar mensagem de permuta para o cliente
 */
export function generateExchangeMessage(order: Order, businessName = 'Papelaria Personalizada'): string {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const statusLabels: Record<string, string> = {
    pending:       '⏳ Pendente',
    'in-progress': '🔄 Em Produção',
    completed:     '✅ Concluído',
    cancelled:     '❌ Cancelado',
  };

  let msg = `🎨 *${businessName}*\n\n`;
  msg += `Olá, ${order.customerName}! 👋\n\n`;
  msg += `🔄 *Detalhes da Permuta*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🏷️ Produto: ${order.productName}\n`;
  msg += `💰 Custo: ${formatCurrency(order.price)}\n`;
  msg += `📅 Data de entrega: ${formatDate(order.deliveryDate)}\n`;
  msg += `📊 Status: ${statusLabels[order.status] || order.status}\n`;

  if (order.exchangeNotes) {
    msg += `\n📝 *Observações*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `${order.exchangeNotes}\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📞 Dúvidas? Responda esta mensagem!\n`;
  msg += `\nObrigado pela parceria! 🙏`;

  return msg;
}

/**
 * Gerar mensagem de resumo de todas as permutas de um cliente
 */
export function generateExchangeSummaryMessage(
  customerName: string,
  orders: Order[],
  businessName = 'Papelaria Personalizada',
): string {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const statusLabels: Record<string, string> = {
    pending:       '⏳ Pendente',
    'in-progress': '🔄 Em Produção',
    completed:     '✅ Concluído',
    cancelled:     '❌ Cancelado',
  };

  const totalCost = orders.reduce((s, o) => s + (o.price || 0), 0);

  let msg = `🎨 *${businessName}*\n\n`;
  msg += `Olá, ${customerName}! 👋\n\n`;
  msg += `🔄 *Resumo das Permutas*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  orders.forEach((o, idx) => {
    msg += `*${idx + 1}. ${o.productName}*\n`;
    msg += `   📅 ${formatDate(o.deliveryDate)}\n`;
    msg += `   💰 Custo: ${formatCurrency(o.price || 0)}\n`;
    msg += `   📊 ${statusLabels[o.status] || o.status}\n`;
    if (o.exchangeNotes) msg += `   📝 ${o.exchangeNotes}\n`;
    msg += `\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📦 Total de permutas: *${orders.length}*\n`;
  msg += `💰 Custo total: *${formatCurrency(totalCost)}*\n\n`;
  msg += `📞 Dúvidas? Responda esta mensagem!\n`;
  msg += `\nObrigado pela parceria! 🙏`;

  return msg;
}

/**
 * Abrir WhatsApp com mensagem de permuta
 */
export function openWhatsAppForExchange(order: Order, businessName?: string): void {
  const message = generateExchangeMessage(order, businessName);
  openWhatsApp(order.customerPhone, message);
}

/**
 * Gerar mensagem de atualização de status
 */
export function generateStatusUpdateMessage(order: Order): string {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
    });
  };

  const statusMessages: Record<string, { icon: string; title: string; text: string }> = {
    pending: {
      icon: '⏳',
      title: 'Pedido Recebido',
      text: 'Seu pedido foi registrado e em breve iniciaremos a produção!',
    },
    'in-progress': {
      icon: '🔄',
      title: 'Produção Iniciada',
      text: 'Ótimas notícias! Já iniciamos a produção do seu pedido!',
    },
    completed: {
      icon: '✅',
      title: 'Pedido Concluído',
      text: 'Seu pedido está pronto e disponível para retirada/entrega!',
    },
    cancelled: {
      icon: '❌',
      title: 'Pedido Cancelado',
      text: 'Seu pedido foi cancelado conforme solicitado.',
    },
  };

  const status = statusMessages[order.status] || statusMessages.pending;

  let message = `🎨 *Papelaria Personalizada*\n\n`;
  message += `Olá, ${order.customerName}! 👋\n\n`;
  message += `${status.icon} *${status.title}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `${status.text}\n\n`;
  message += `📋 *Detalhes*\n`;
  message += `🏷️ Produto: ${order.productName}\n`;
  message += `📦 Quantidade: ${order.quantity} unidades\n`;
  message += `📅 Entrega prevista: ${formatDate(order.deliveryDate)}\n\n`;

  if (order.status === 'completed' && order.payment && order.payment.remainingAmount > 0) {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };
    message += `⚠️ *Saldo pendente: ${formatCurrency(order.payment.remainingAmount)}*\n\n`;
  }

  message += `📞 Qualquer dúvida, estou à disposição!\n`;
  message += `\nObrigado pela preferência! 🙏`;

  return message;
}

export interface CatalogWhatsAppItem {
  name: string;
  price: number;
  quantity: number;
  leadTimeDays?: number;
  customName?: string;
  category?: string;
}

export interface CatalogOrderWhatsAppOptions {
  orderCode: string;
  businessName: string;
  items: CatalogWhatsAppItem[];
  subtotal: number;
  customerNotes?: string;
  greeting?: string;
  footer?: string;
  customizationLabel?: string;
}

/**
 * Gera mensagem dinâmica para finalização de sacola no Catálogo Público
 */
export function generateCatalogOrderWhatsAppMessage(opts: CatalogOrderWhatsAppOptions): string {
  const formatBrl = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const greeting = opts.greeting || `🌸 *Olá, ${opts.businessName}! Gostaria de confirmar esta encomenda pelo Catálogo:*`;
  const labelCustom = opts.customizationLabel || 'Personalização:';
  const footerMsg = opts.footer || 'Poderia me passar as opções de frete/retirada e a chave PIX para confirmar?';

  const maxLeadTime = opts.items.length > 0
    ? Math.max(0, ...opts.items.map((i) => (typeof i.leadTimeDays === 'number' && !isNaN(i.leadTimeDays) ? i.leadTimeDays : 0)))
    : 0;

  let msg = `🛍️ *NOVO PEDIDO DA LOJINHA* • \`#${opts.orderCode}\`\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `${greeting}\n\n`;
  msg += `📦 *ITENS ESCOLHIDOS:*\n`;

  opts.items.forEach((item, idx) => {
    msg += `*${idx + 1}️⃣ ${item.name}* (${item.quantity}x)\n`;
    msg += `   💰 ${formatBrl(item.price)} un.`;
    if (item.quantity > 1) {
      msg += ` = ${formatBrl(item.price * item.quantity)}`;
    }
    msg += `\n`;
    if (item.customName && item.customName.trim()) {
      msg += `   ✍️ *${labelCustom}* ${item.customName.trim()}\n`;
    }
    const lead = item.leadTimeDays !== undefined && item.leadTimeDays !== null ? Number(item.leadTimeDays) : 5;
    msg += lead > 0
      ? `   ⏳ *Prazo de confecção:* até ${lead} dias úteis\n\n`
      : `   ⏳ *Prazo:* Pronta entrega\n\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `✨ *Subtotal dos Produtos:* *${formatBrl(opts.subtotal)}*\n`;
  msg += `⏳ *Prazo Geral Estimado:* *${maxLeadTime > 0 ? `até ${maxLeadTime} dias úteis` : 'Pronta entrega'}*\n`;

  if (opts.customerNotes && opts.customerNotes.trim()) {
    msg += `📝 *Observações / Data do Evento:* ${opts.customerNotes.trim()}\n`;
  }

  msg += `\n📍 *DADOS PARA O ATENDIMENTO:*\n`;
  msg += `• Meu CEP ou bairro para cálculo do frete: \n`;
  msg += `• Como prefiro pagar: ( ) PIX  ( ) Cartão\n\n`;
  msg += `${footerMsg}`;

  return msg;
}

export interface ProductInquiryWhatsAppOptions {
  businessName: string;
  productName: string;
  price: number;
  category?: string;
  leadTimeDays?: number;
  customName?: string;
}

/**
 * Gera mensagem dinâmica para consulta direta sobre um produto individual
 */
export function generateProductInquiryWhatsAppMessage(opts: ProductInquiryWhatsAppOptions): string {
  const formatBrl = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const categoryText = opts.category && opts.category !== 'todos' ? ` (${opts.category})` : '';
  const lead = opts.leadTimeDays !== undefined && opts.leadTimeDays !== null ? Number(opts.leadTimeDays) : 5;
  const leadText = lead > 0 ? `até ${lead} dias úteis` : 'Pronta entrega';

  let msg = `🌸 *Olá, ${opts.businessName}!*\n\n`;
  msg += `Estive olhando o item *"${opts.productName}"*${categoryText} no valor de *${formatBrl(opts.price)}* no catálogo online.\n`;
  msg += `⏳ *Prazo estimado:* ${leadText}\n`;

  if (opts.customName && opts.customName.trim()) {
    msg += `✍️ *Ideia de Personalização/Nome:* "${opts.customName.trim()}"\n`;
  }

  msg += `\nGostaria de tirar uma dúvida sobre personalização, cores e disponibilidade para o meu evento! ✨`;

  return msg;
}

export interface BespokeConsultationWhatsAppOptions {
  businessName: string;
  category?: string;
  eventDate?: string;
  notes?: string;
}

/**
 * Gera mensagem dinâmica para consultoria sob medida e identidade visual exclusiva
 */
export function generateBespokeConsultationWhatsAppMessage(opts: BespokeConsultationWhatsAppOptions): string {
  let msg = `🌸 *Olá, ${opts.businessName}!*\n\n`;
  msg += `Gostaria de solicitar uma *consultoria personalizada* para um projeto exclusivo sob medida`;
  if (opts.category && opts.category.toLowerCase() !== 'todos' && opts.category.toLowerCase() !== 'geral') {
    msg += ` na categoria *${opts.category}*`;
  }
  msg += `.\n`;

  if (opts.eventDate && opts.eventDate.trim()) {
    msg += `📅 *Data prevista do evento:* ${opts.eventDate.trim()}\n`;
  }
  if (opts.notes && opts.notes.trim()) {
    msg += `📝 *Detalhes / Ideia inicial:* ${opts.notes.trim()}\n`;
  }

  msg += `\nPoderia me orientar sobre disponibilidade de agenda e opções de criação? ✨`;

  return msg;
}
