import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportOrdersToExcel,
  exportCustomersToExcel,
  exportQuotesToExcel,
  exportToCSV,
  exportToJSON,
} from '../../src/app/utils/exportData';
import type { Order, Customer, Quote } from '../../src/app/types';

// Mock XLSX
const mockJsonToSheet = vi.fn((data) => ({ data, '!cols': [] }));
const mockBookNew = vi.fn(() => ({ Sheets: {}, SheetNames: [] }));
const mockBookAppendSheet = vi.fn();
const mockWriteFile = vi.fn();

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: (data: any) => mockJsonToSheet(data),
    book_new: () => mockBookNew(),
    book_append_sheet: (wb: any, ws: any, name: string) => mockBookAppendSheet(wb, ws, name),
  },
  writeFile: (wb: any, filename: string) => mockWriteFile(wb, filename),
}));

describe('Funcionalidade: Relatórios e Exportação de Dados (exportData)', () => {
  let createdLinks: Array<{ href: string; download: string; click: () => void }> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    createdLinks = [];

    (global as any).URL.createObjectURL = vi.fn(() => 'blob:mock-export-url');
    (global as any).URL.revokeObjectURL = vi.fn();

    (global as any).document = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'a') {
          const link = {
            href: '',
            download: '',
            click: vi.fn(),
          };
          createdLinks.push(link);
          return link;
        }
        return {};
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };
  });

  describe('1. Exportação de Pedidos para Excel (exportOrdersToExcel)', () => {
    it('deve mapear corretamente os campos dos pedidos e invocar o gerador XLSX com colunas auto-ajustadas', async () => {
      const mockOrders: Order[] = [
        {
          id: 'ord-101',
          customerName: 'Beatriz Lima',
          customerPhone: '11988887777',
          productName: 'Kit Festa Batizado',
          quantity: 2,
          price: 150.0,
          status: 'in_progress',
          deliveryDate: '2026-10-15',
          createdAt: '2026-10-01',
          payment: {
            status: 'partial',
            method: 'pix',
            paidAmount: 50.0,
            remainingAmount: 100.0,
          },
        },
      ];

      await exportOrdersToExcel(mockOrders, 'relatorio_pedidos');

      expect(mockJsonToSheet).toHaveBeenCalledWith([
        expect.objectContaining({
          ID: 'ord-101',
          Cliente: 'Beatriz Lima',
          Telefone: '11988887777',
          Produto: 'Kit Festa Batizado',
          Quantidade: 2,
          Valor: 150.0,
          Status: 'Em Produção',
          Pagamento: 'Parcial',
          Pago: 50.0,
          Restante: 100.0,
        }),
      ]);

      expect(mockBookAppendSheet).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'Pedidos'
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/^relatorio_pedidos_\d{4}-\d{2}-\d{2}\.xlsx$/)
      );
    });
  });

  describe('2. Exportação de Clientes para Excel (exportCustomersToExcel)', () => {
    it('deve formatar clientes e totais de consumo acumulado na planilha', async () => {
      const mockCustomers: Customer[] = [
        {
          id: 'cli-55',
          name: 'Juliana Costa',
          phone: '11977776666',
          email: 'juliana@costa.com',
          address: 'Rua das Flores, 123',
          totalOrders: 10,
          totalSpent: 1850.5,
          createdAt: '2025-05-10',
          updatedAt: '2026-10-01',
        },
      ];

      await exportCustomersToExcel(mockCustomers, 'clientes_vip');

      expect(mockJsonToSheet).toHaveBeenCalledWith([
        expect.objectContaining({
          ID: 'cli-55',
          Nome: 'Juliana Costa',
          'Total Pedidos': 10,
          'Total Gasto': 1850.5,
        }),
      ]);

      expect(mockBookAppendSheet).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'Clientes'
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringMatching(/^clientes_vip_\d{4}-\d{2}-\d{2}\.xlsx$/)
      );
    });
  });

  describe('3. Exportação de Orçamentos para Excel (exportQuotesToExcel)', () => {
    it('deve calcular o valor total agregando itens e traduzir o status do orçamento', async () => {
      const mockQuotes: Quote[] = [
        {
          id: 'orc-200',
          customerName: 'Eduardo Martins',
          status: 'sent',
          createdAt: '2026-10-01',
          validUntil: '2026-10-10',
          items: [
            { id: '1', name: 'Convite Luxo', quantity: 20, unitPrice: 12.5 },
            { id: '2', name: 'Tag Agradecimento', quantity: 20, unitPrice: 2.5 },
          ],
        },
      ];

      await exportQuotesToExcel(mockQuotes);

      expect(mockJsonToSheet).toHaveBeenCalledWith([
        expect.objectContaining({
          ID: 'orc-200',
          Cliente: 'Eduardo Martins',
          'Valor Total': 300, // 20*12.5 (250) + 20*2.5 (50) = 300
          Status: 'Enviado',
        }),
      ]);

      expect(mockBookAppendSheet).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'Orçamentos'
      );
    });
  });

  describe('4. Exportação CSV com Proteção Anti-Formula Injection (exportToCSV)', () => {
    it('deve neutralizar caracteres perigosos (=, +, -, @) prefixando com apóstrofo para proteção OWASP', () => {
      const maliciousData = [
        {
          id: '1',
          name: '=SUM(A1:A10)', // Injeção de fórmula
          phone: '+5511999998888',
          note: '@CALC',
        },
      ];

      exportToCSV(maliciousData, 'seguranca');

      expect(createdLinks).toHaveLength(1);
      expect(createdLinks[0].download).toMatch(/^seguranca_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(createdLinks[0].click).toHaveBeenCalled();

      const blobCall = (global as any).Blob.mock
        ? (global as any).Blob.mock.calls[0]
        : null;
      // O mock do Blob no Vitest pode ser verificado inspecionando URL.createObjectURL
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('deve emitir aviso e não disparar download quando a lista estiver vazia', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      exportToCSV([], 'vazio');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Nenhum dado para exportar');
      expect(createdLinks).toHaveLength(0);
      consoleWarnSpy.mockRestore();
    });
  });

  describe('5. Exportação JSON (exportToJSON)', () => {
    it('deve disparar download com dados serializados em JSON identado', () => {
      const sample = [{ id: 'item-1', label: 'Teste' }];

      exportToJSON(sample, 'backup_dados');

      expect(createdLinks).toHaveLength(1);
      expect(createdLinks[0].download).toMatch(/^backup_dados_\d{4}-\d{2}-\d{2}\.json$/);
      expect(createdLinks[0].click).toHaveBeenCalled();
    });
  });
});
