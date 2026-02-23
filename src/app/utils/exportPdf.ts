import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quote, Order } from '../types';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function formatDate(iso: string) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

const STATUS_LABELS_QUOTE: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  expired: 'Expirado',
};

const STATUS_LABELS_ORDER: Record<string, string> = {
  pending: 'Pendente',
  'in-progress': 'Em Produção',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  transfer: 'Transferência',
};

// ─── shared header ────────────────────────────────────────────────────────────
function drawHeader(doc: jsPDF, title: string, number: string, statusLabel: string, businessName: string) {
  const pageW = doc.internal.pageSize.getWidth();

  // top bar
  doc.setFillColor(30, 30, 40);
  doc.rect(0, 0, pageW, 18, 'F');

  // business name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(businessName || 'Empresa', 10, 11);

  // title right-side
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${title}  ·  ${number}  ·  ${statusLabel}`, pageW - 10, 11, { align: 'right' });

  doc.setTextColor(30, 30, 40);
  return 26; // y position after header
}

// ─── row helper ───────────────────────────────────────────────────────────────
function row(doc: jsPDF, label: string, value: string, yLeft: number, xLeft = 10, xRight = 55) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text(label, xLeft, yLeft);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 40);
  doc.text(value, xRight, yLeft);
}

// ─── Quote PDF ────────────────────────────────────────────────────────────────
export function exportQuotePDF(quote: Quote, businessName?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawHeader(doc, 'Orçamento', quote.quoteNumber, STATUS_LABELS_QUOTE[quote.status] ?? quote.status, businessName ?? 'Empresa');

  // ── Client info ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 40);
  doc.text('CLIENTE', 10, y);
  y += 5;

  row(doc, 'Nome:', quote.customerName, y); y += 5;
  row(doc, 'Telefone:', quote.customerPhone, y); y += 5;
  if (quote.deliveryDate) { row(doc, 'Entrega:', formatDate(quote.deliveryDate), y); y += 5; }
  if (quote.validUntil)   { row(doc, 'Válido até:', formatDate(quote.validUntil), y); y += 5; }
  if (quote.paymentCondition) { row(doc, 'Pagamento:', quote.paymentCondition, y); y += 5; }
  if (quote.deliveryType) {
    const dlv = quote.deliveryType === 'pickup' ? 'Retirada na loja'
      : `Entrega${quote.deliveryAddress ? ' — ' + quote.deliveryAddress : ''}`;
    row(doc, 'Modalidade:', dlv, y); y += 5;
  }
  y += 3;

  // ── Items table ──
  const subtotals = quote.items.map(i => i.quantity * i.unitPrice);
  const rawTotal  = subtotals.reduce((s, v) => s + v, 0);

  autoTable(doc, {
    startY: y,
    head: [['Produto / Serviço', 'Qtd', 'Preço Unit.', 'Subtotal']],
    body: quote.items.map((item, i) => [
      item.name,
      item.quantity,
      formatCurrency(item.unitPrice),
      formatCurrency(subtotals[i]),
    ]),
    styles:     { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 30, 40], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 10, right: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // Discount + total block
  const summaryX = pageW - 10;

  if (quote.discount != null && quote.discount > 0) {
    const discountAmt = quote.discountType === 'percent'
      ? rawTotal * (quote.discount / 100)
      : quote.discount;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 130);
    doc.text(`Subtotal: ${formatCurrency(rawTotal)}`, summaryX, y, { align: 'right' }); y += 5;
    doc.setTextColor(22, 163, 74);
    doc.text(`Desconto: -${formatCurrency(discountAmt)}`, summaryX, y, { align: 'right' }); y += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 40);
  doc.text(`Total: ${formatCurrency(quote.totalPrice)}`, summaryX, y, { align: 'right' });
  y += 8;

  // Tags
  if (quote.tags && quote.tags.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 110);
    doc.text('Tags: ' + quote.tags.map(t => t.name).join(', '), 10, y);
    y += 5;
  }

  // Notes
  if (quote.notes) {
    y += 2;
    doc.setFillColor(245, 245, 248);
    const noteLines = doc.splitTextToSize(quote.notes, pageW - 20) as string[];
    const noteH = noteLines.length * 4 + 6;
    doc.rect(10, y, pageW - 20, noteH, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 90);
    doc.text(noteLines, 14, y + 4);
    y += noteH + 4;
  }

  // Approved alert
  if (quote.status === 'approved' && quote.orderNumber) {
    y += 3;
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(10, y, pageW - 20, 9, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(`✓  Pedido ${quote.orderNumber} gerado a partir deste orçamento.`, 14, y + 6);
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200, 200, 210);
  doc.line(10, pageH - 12, pageW - 10, pageH - 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 170);
  doc.text(`Documento gerado em ${new Date().toLocaleDateString('pt-BR')}`, 10, pageH - 7);
  doc.text(quote.quoteNumber, pageW - 10, pageH - 7, { align: 'right' });

  doc.save(`orcamento-${quote.quoteNumber}.pdf`);
}

// ─── Order PDF ────────────────────────────────────────────────────────────────
export function exportOrderPDF(order: Order, businessName?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const docNum = order.orderNumber ?? `#${order.id.slice(0, 6)}`;
  let y = drawHeader(doc, 'Pedido', docNum, STATUS_LABELS_ORDER[order.status] ?? order.status, businessName ?? 'Empresa');

  // ── Client & order info ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 40);
  doc.text('INFORMAÇÕES DO PEDIDO', 10, y);
  y += 5;

  row(doc, 'Cliente:', order.customerName, y); y += 5;
  row(doc, 'Telefone:', order.customerPhone, y); y += 5;
  row(doc, 'Pedido:',   docNum, y); y += 5;
  row(doc, 'Criado em:', formatDate(order.createdAt), y); y += 5;
  row(doc, 'Entrega:', formatDate(order.deliveryDate), y); y += 5;
  y += 3;

  // ── Product table ──
  const productRows = order.productName
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const match = s.match(/^(.+?)\s*\((\d+)x\)$/);
      return match ? [match[1].trim(), match[2]] : [s, String(order.quantity)];
    });

  autoTable(doc, {
    startY: y,
    head: [['Produto / Serviço', 'Qtd']],
    body: productRows,
    styles:     { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 30, 40], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'center', cellWidth: 20 } },
    margin: { left: 10, right: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 40);
  doc.text(`Total: ${formatCurrency(order.price)}`, pageW - 10, y, { align: 'right' });
  y += 8;

  // ── Payment info ──
  if (order.payment) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PAGAMENTO', 10, y); y += 5;

    const payStatus = order.payment.status === 'paid' ? 'Pago' : order.payment.status === 'partial' ? 'Parcial' : 'Pendente';
    row(doc, 'Status:', payStatus, y); y += 5;
    if (order.payment.method) {
      row(doc, 'Método:', PAYMENT_METHOD_LABELS[order.payment.method] ?? order.payment.method, y); y += 5;
    }
    row(doc, 'Pago:', formatCurrency(order.payment.paidAmount), y); y += 5;
    if (order.payment.remainingAmount > 0) {
      row(doc, 'Restante:', formatCurrency(order.payment.remainingAmount), y); y += 5;
    }
    y += 3;
  }

  // ── Exchange / Permuta ──
  if (order.isExchange) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PERMUTA / PARCERIA', 10, y); y += 5;
    if (order.exchangeNotes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 90);
      const lines = doc.splitTextToSize(order.exchangeNotes, pageW - 20) as string[];
      doc.text(lines, 10, y);
      y += lines.length * 4 + 4;
    }
    if (order.exchangeItems && order.exchangeItems.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Item recebido', 'Qtd', 'Valor estimado']],
        body: order.exchangeItems.map(i => [
          i.name,
          i.quantity,
          i.value ? formatCurrency(i.quantity * i.value) : '-',
        ]),
        styles:     { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold' },
        margin: { left: 10, right: 10 },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }
  }

  // ── Tags ──
  if (order.tags && order.tags.length > 0) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 110);
    doc.text('Tags: ' + order.tags.map(t => t.name).join(', '), 10, y);
    y += 5;
  }

  // ── Notes ──
  if (order.notes) {
    y += 2;
    doc.setFillColor(245, 245, 248);
    const noteLines = doc.splitTextToSize(order.notes, pageW - 20) as string[];
    const noteH = noteLines.length * 4 + 6;
    doc.rect(10, y, pageW - 20, noteH, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 90);
    doc.text(noteLines, 14, y + 4);
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200, 200, 210);
  doc.line(10, pageH - 12, pageW - 10, pageH - 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 170);
  doc.text(`Documento gerado em ${new Date().toLocaleDateString('pt-BR')}`, 10, pageH - 7);
  doc.text(docNum, pageW - 10, pageH - 7, { align: 'right' });

  doc.save(`pedido-${docNum}.pdf`);
}
