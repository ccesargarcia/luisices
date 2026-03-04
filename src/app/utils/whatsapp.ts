import { Order } from '../types';

/**
 * Formatar número de telefone para WhatsApp (remover caracteres especiais)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove tudo que não é número
  return phone.replace(/\D/g, '');
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
    ? `whatsapp://send?phone=55${formattedPhone}&text=${encodedMessage}`
    : `https://web.whatsapp.com/send?phone=55${formattedPhone}&text=${encodedMessage}`;

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
