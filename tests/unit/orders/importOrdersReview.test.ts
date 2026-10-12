import { describe, it, expect } from 'vitest';
import { updateReviewedImportRow, getSelectedImportRows } from '../../../src/app/utils/importOrdersReview';
import type { ParsedOrderRow } from '../../../src/app/utils/importOrdersExcel';
const row: ParsedOrderRow = { rowIndex: 2, customerName: 'Ana', customerPhone: '11999999999', productName: 'Convites', quantity: 10, price: 100, deliveryDate: '2026-10-20', status: 'pending', paymentStatus: 'partial', paidAmount: 30, remainingAmount: 70, isValid: true, errors: [], warnings: [], rawData: { Cliente: 'Ana' } };
describe('Revisão da importação', () => {
  it('usa os valores editados, recalcula o saldo e preserva a linha original', () => {
    const edited = updateReviewedImportRow(row, { customerName: '  Beatriz  ', price: 150, paidAmount: 40 });
    expect(edited.customerName).toBe('Beatriz');expect(edited.remainingAmount).toBe(110);expect(edited.isValid).toBe(true);
    expect(row.price).toBe(100);expect(row.customerName).toBe('Ana');expect(row.remainingAmount).toBe(70);
  });
  it('permite corrigir uma linha inválida e retira os erros antigos', () => {
    const edited = updateReviewedImportRow({ ...row, customerName: '', isValid: false, errors: ['Nome do cliente é obrigatório.'] }, { customerName: 'Ana' });
    expect(edited.isValid).toBe(true);expect(edited.errors).toEqual([]);
  });
  it.each([{quantity:0},{quantity:1.5},{price:-1},{price:NaN},{paidAmount:101},{deliveryDate:'2026-02-30'},{customerEmail:'inválido'},{customerName:''},{productName:''}])('impede dados inválidos após edição: %j', changes => {
    expect(updateReviewedImportRow(row, changes).isValid).toBe(false);
  });
  it('detecta status de pagamento incompatível com os valores', () => {
    expect(updateReviewedImportRow(row, { paymentStatus: 'paid' }).isValid).toBe(false);
    expect(updateReviewedImportRow(row, { paymentStatus: 'pending' }).isValid).toBe(false);
    expect(updateReviewedImportRow(row, { paymentStatus: 'paid', paidAmount: 100 }).remainingAmount).toBe(0);
  });
  it('seleciona somente linhas marcadas, mantendo dados editados e a ordem da planilha', () => {
    const edited = updateReviewedImportRow(row, { productName: 'Convites revisados' });
    const rows = [edited, { ...row, rowIndex: 3 }, { ...row, rowIndex: 4 }];
    const selected = getSelectedImportRows(rows, new Set([4, 2]));
    expect(selected.map(row => row.rowIndex)).toEqual([2, 4]);expect(selected[0].productName).toBe('Convites revisados');
    expect(getSelectedImportRows(rows, new Set())).toEqual([]);
  });
});
