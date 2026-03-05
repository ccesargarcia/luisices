/**
 * Export Utilities
 * 
 * Funções para exportar dados em diferentes formatos (Excel, CSV, JSON)
 */

import * as XLSX from 'xlsx';
import { Order, Customer, Quote } from '../types';
import { formatCurrency } from './currency';
import { formatDate } from './date';

// ========== EXCEL EXPORT ==========

export function exportOrdersToExcel(orders: Order[], filename = 'pedidos') {
  const data = orders.map(order => ({
    'ID': order.id,
    'Cliente': order.customerName,
    'Telefone': order.customerPhone || '',
    'Produto': order.productName,
    'Quantidade': order.quantity,
    'Valor': order.price,
    'Status': translateStatus(order.status),
    'Pagamento': translatePaymentStatus(order.payment?.status),
    'Pago': order.payment?.paidAmount || 0,
    'Restante': order.payment?.remainingAmount || 0,
    'Entrega': formatDate(order.deliveryDate),
    'Criado em': formatDate(order.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');

  // Ajustar largura das colunas
  const maxWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      ...data.map(row => String(row[key as keyof typeof row]).length)
    ) + 2
  }));
  worksheet['!cols'] = maxWidths;

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportCustomersToExcel(customers: Customer[], filename = 'clientes') {
  const data = customers.map(customer => ({
    'ID': customer.id,
    'Nome': customer.name,
    'Telefone': customer.phone || '',
    'Email': customer.email || '',
    'Endereço': customer.address || '',
    'Total Pedidos': customer.totalOrders || 0,
    'Total Gasto': customer.totalSpent || 0,
    'Criado em': formatDate(customer.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

  const maxWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      ...data.map(row => String(row[key as keyof typeof row]).length)
    ) + 2
  }));
  worksheet['!cols'] = maxWidths;

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportQuotesToExcel(quotes: Quote[], filename = 'orcamentos') {
  const data = quotes.map(quote => ({
    'ID': quote.id,
    'Cliente': quote.customerName,
    'Telefone': quote.customerPhone || '',
    'Email': quote.customerEmail || '',
    'Valor Total': quote.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
    'Status': translateQuoteStatus(quote.status),
    'Válido até': quote.validUntil ? formatDate(quote.validUntil) : '',
    'Criado em': formatDate(quote.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orçamentos');

  const maxWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      ...data.map(row => String(row[key as keyof typeof row]).length)
    ) + 2
  }));
  worksheet['!cols'] = maxWidths;

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ========== CSV EXPORT ==========

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: Record<keyof T, string>
) {
  if (data.length === 0) {
    console.warn('Nenhum dado para exportar');
    return;
  }

  const keys = Object.keys(data[0]) as (keyof T)[];
  const headerRow = headers
    ? keys.map(key => headers[key] || String(key)).join(',')
    : keys.join(',');

  const rows = data.map(row =>
    keys.map(key => {
      const value = row[key];
      // Escapar vírgulas e aspas
      const stringValue = String(value == null ? '' : value);
      return stringValue.includes(',') || stringValue.includes('"')
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue;
    }).join(',')
  );

  const csv = [headerRow, ...rows].join('\n');
  downloadFile(csv, `${filename}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

// ========== JSON EXPORT ==========

export function exportToJSON<T>(data: T[], filename: string) {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

// ========== HELPERS ==========

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em Produção',
    ready: 'Pronto',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  };
  return map[status] || status;
}

function translatePaymentStatus(status?: string): string {
  if (!status) return '';
  const map: Record<string, string> = {
    pending: 'Pendente',
    partial: 'Parcial',
    paid: 'Pago',
  };
  return map[status] || status;
}

function translateQuoteStatus(status: string): string {
  const map: Record<string, string> = {
    draft: 'Rascunho',
    sent: 'Enviado',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
  };
  return map[status] || status;
}
