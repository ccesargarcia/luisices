import { beforeEach, describe, expect, it, vi } from 'vitest';

const { doc, autoTable } = vi.hoisted(() => {
  const doc: Record<string, any> = {
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((value: string) => [value]),
    save: vi.fn(),
    lastAutoTable: { finalY: 60 },
  };
  const autoTable = vi.fn((target: any, options: any) => {
    target.lastAutoTable = { finalY: options.startY + 20 };
  });
  return { doc, autoTable };
});

vi.mock('jspdf', () => ({ jsPDF: vi.fn(() => doc) }));
vi.mock('jspdf-autotable', () => ({ default: autoTable }));

import { exportQuotePDF } from '../../src/app/utils/exportPdf';

describe('Exportação de orçamento em PDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doc.lastAutoTable = { finalY: 60 };
  });

  it('exporta subtotais arredondados, desconto percentual e total persistido', async () => {
    await exportQuotePDF({
      id: 'quote-1',
      quoteNumber: 'ORC-0001',
      customerName: 'Cliente PDF',
      customerPhone: '11999999999',
      status: 'sent',
      createdAt: '2026-10-01T12:00:00.000Z',
      deliveryDate: '2026-10-20',
      items: [
        { name: 'Caderno', quantity: 2, unitPrice: 15 },
        { name: 'Tag', quantity: 1, unitPrice: 5 },
      ],
      discount: 10,
      discountType: 'percent',
      totalPrice: 31.5,
    } as any, 'Ateliê Teste');

    const [, table] = autoTable.mock.calls[0];
    expect(table.body).toEqual([
      ['Caderno', 2, expect.stringContaining('15,00'), expect.stringContaining('30,00')],
      ['Tag', 1, expect.stringContaining('5,00'), expect.stringContaining('5,00')],
    ]);

    const printedText = doc.text.mock.calls.map(([value]) => String(value)).join('\n');
    expect(printedText).toMatch(/Subtotal:.*35,00/);
    expect(printedText).toMatch(/Desconto:.*3,50/);
    expect(printedText).toMatch(/Total:.*31,50/);
    expect(doc.save).toHaveBeenCalledWith('orcamento-ORC-0001.pdf');
  });

  it('exporta desconto fixo como valor monetário', async () => {
    await exportQuotePDF({
      id: 'quote-2',
      quoteNumber: 'ORC-0002',
      customerName: 'Cliente PDF',
      status: 'draft',
      createdAt: '2026-10-01',
      items: [{ name: 'Produto', quantity: 1, unitPrice: 50 }],
      discount: 7.25,
      discountType: 'fixed',
      totalPrice: 42.75,
    } as any);

    const printedText = doc.text.mock.calls.map(([value]) => String(value)).join('\n');
    expect(printedText).toMatch(/Subtotal:.*50,00/);
    expect(printedText).toMatch(/Desconto:.*7,25/);
    expect(printedText).toMatch(/Total:.*42,75/);
  });
});
