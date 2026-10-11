import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseCurrencyValue,
  parseQuantityValue,
  parseDateValue,
  parseOrderStatusValue,
  parsePaymentStatusValue,
  parsePaymentMethodValue,
  parseTagsValue,
  parseOrdersExcelFile,
  downloadOrderImportTemplate,
  executeOrdersImport,
  ParsedOrderRow,
} from '../../../src/app/utils/importOrdersExcel';
import { firebaseOrderService } from '../../../src/services/firebaseOrderService';
import { firebaseCustomerService } from '../../../src/services/firebaseCustomerService';

describe('Importação de Pedidos via Excel (importOrdersExcel)', () => {
  describe('1. Parsers Unitários e Resiliência de Dados', () => {
    it('deve converter corretamente valores monetários em formato brasileiro e número', () => {
      expect(parseCurrencyValue('R$ 1.500,50')).toBe(1500.5);
      expect(parseCurrencyValue('1.250,00')).toBe(1250);
      expect(parseCurrencyValue('150,75')).toBe(150.75);
      expect(parseCurrencyValue('150.75')).toBe(150.75);
      expect(parseCurrencyValue(250)).toBe(250);
      expect(parseCurrencyValue(null)).toBe(0);
      expect(parseCurrencyValue('')).toBe(0);
      expect(parseCurrencyValue(-10)).toBe(0);
    });

    it('deve converter corretamente quantidades e tratar valores inválidos ou zerados', () => {
      expect(parseQuantityValue(5)).toBe(5);
      expect(parseQuantityValue('10')).toBe(10);
      expect(parseQuantityValue('3 unidades')).toBe(3);
      expect(parseQuantityValue(0)).toBe(1);
      expect(parseQuantityValue(null)).toBe(1);
      expect(parseQuantityValue('')).toBe(1);
    });

    it('deve converter datas em formato brasileiro DD/MM/AAAA, ISO e serial do Excel', () => {
      expect(parseDateValue('25/12/2026').dateStr).toBe('2026-12-25');
      expect(parseDateValue('25/12/2026').isFallback).toBe(false);

      expect(parseDateValue('05-11-2026').dateStr).toBe('2026-11-05');
      expect(parseDateValue('05-11-2026').isFallback).toBe(false);

      expect(parseDateValue('2026-10-15').dateStr).toBe('2026-10-15');
      expect(parseDateValue('2026-10-15').isFallback).toBe(false);

      // Serial Excel (ex: 46377 = 2026-12-21 aproximadamente)
      const serialRes = parseDateValue(46377);
      expect(serialRes.isFallback).toBe(false);
      expect(serialRes.dateStr).toContain('2026');

      // Vazio ou nulo gera fallback para hoje
      const today = new Date().toISOString().split('T')[0];
      expect(parseDateValue('').dateStr).toBe(today);
      expect(parseDateValue('').isFallback).toBe(true);
      expect(parseDateValue(null).isFallback).toBe(true);
    });

    it('deve mapear status de produção com tolerância a variações textuais', () => {
      expect(parseOrderStatusValue('Pendente')).toBe('pending');
      expect(parseOrderStatusValue('Em Produção')).toBe('in-progress');
      expect(parseOrderStatusValue('producao')).toBe('in-progress');
      expect(parseOrderStatusValue('Concluído')).toBe('completed');
      expect(parseOrderStatusValue('Finalizado')).toBe('completed');
      expect(parseOrderStatusValue('Pronto')).toBe('completed');
      expect(parseOrderStatusValue('Cancelado')).toBe('cancelled');
      expect(parseOrderStatusValue(null)).toBe('pending');
    });

    it('deve deduzir e mapear status de pagamento e métodos', () => {
      expect(parsePaymentStatusValue('Pago', 100, 100)).toBe('paid');
      expect(parsePaymentStatusValue('Parcial', 50, 100)).toBe('partial');
      expect(parsePaymentStatusValue('Pendente', 0, 100)).toBe('pending');

      // Dedução automática quando a coluna de status vier vazia
      expect(parsePaymentStatusValue('', 150, 150)).toBe('paid');
      expect(parsePaymentStatusValue('', 50, 100)).toBe('partial');
      expect(parsePaymentStatusValue('', 0, 100)).toBe('pending');

      expect(parsePaymentMethodValue('Pix')).toBe('pix');
      expect(parsePaymentMethodValue('Cartão de Crédito')).toBe('credit');
      expect(parsePaymentMethodValue('Débito')).toBe('debit');
      expect(parsePaymentMethodValue('Dinheiro')).toBe('cash');
      expect(parsePaymentMethodValue('Transferência')).toBe('transfer');
      expect(parsePaymentMethodValue(null)).toBe(null);
    });

    it('deve converter tags separadas por vírgula em array com cores', () => {
      const tags = parseTagsValue('Casamento, Agenda, Luxo');
      expect(tags).toHaveLength(3);
      expect(tags[0].name).toBe('Casamento');
      expect(tags[0].color).toBeDefined();
      expect(tags[1].name).toBe('Agenda');
      expect(tags[2].name).toBe('Luxo');

      expect(parseTagsValue('')).toEqual([]);
      expect(parseTagsValue(null)).toEqual([]);
    });
  });

  describe('2. Parsing de Planilha em Memória e Sinônimos de Cabeçalho', () => {
    it('deve ler e validar linhas com sinônimos de cabeçalho e sinalizar erros', async () => {
      const XLSX = await import('xlsx');

      // Cria planilha em buffer com nomes alternativos de colunas
      const sample = [
        {
          'Nome': 'Carla Mendes',
          'Celular': '(11) 99999-8888',
          'Item': 'Kit Festa Safari',
          'Qtd': 3,
          'Preço': '450,00',
          'Prazo': '20/11/2026',
          'Situação': 'Em Produção',
          'Valor Pago': '150,00',
          'Forma': 'Pix',
          'Obs': 'Cores pastéis',
          'Etiquetas': 'Festa, Infantil',
        },
        {
          // Linha inválida: sem cliente e sem produto
          'Nome': '',
          'Celular': '11999999999',
          'Item': '',
          'Preço': '100,00',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sample);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const parsed = await parseOrdersExcelFile(buffer);

      expect(parsed.totalRows).toBe(2);
      expect(parsed.validRows).toHaveLength(1);
      expect(parsed.invalidRows).toHaveLength(1);

      const valid = parsed.validRows[0];
      expect(valid.customerName).toBe('Carla Mendes');
      expect(valid.customerPhone).toBe('(11) 99999-8888');
      expect(valid.productName).toBe('Kit Festa Safari');
      expect(valid.quantity).toBe(3);
      expect(valid.price).toBe(450);
      expect(valid.paidAmount).toBe(150);
      expect(valid.remainingAmount).toBe(300);
      expect(valid.status).toBe('in-progress');
      expect(valid.paymentStatus).toBe('partial');
      expect(valid.paymentMethod).toBe('pix');
      expect(valid.notes).toBe('Cores pastéis');
      expect(valid.tags).toHaveLength(2);

      const invalid = parsed.invalidRows[0];
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors).toContain('Nome do cliente é obrigatório.');
      expect(invalid.errors).toContain('Nome do produto é obrigatório.');
    });
  });

  describe('3. Geração de Planilha Modelo', () => {
    it('deve gerar o template Excel com as abas de Pedidos e Instruções sem erros', async () => {
      const { buildOrderImportTemplateWorkbook } = await import('../../../src/app/utils/importOrdersExcel');
      const wb = await buildOrderImportTemplateWorkbook();

      expect(wb.SheetNames).toContain('Pedidos');
      expect(wb.SheetNames).toContain('Instruções');

      const ordersSheet = wb.Sheets['Pedidos'];
      expect(ordersSheet).toBeDefined();

      const instructionsSheet = wb.Sheets['Instruções'];
      expect(instructionsSheet).toBeDefined();
    });
  });

  describe('4. Execução em Lote (executeOrdersImport)', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('deve criar clientes automaticamente se não existirem e gravar os pedidos', async () => {
      const mockRows: ParsedOrderRow[] = [
        {
          rowIndex: 2,
          customerName: 'Fernanda Lima',
          customerPhone: '(11) 98888-1111',
          customerEmail: 'fernanda@teste.com',
          productName: 'Planner 2027 Floral',
          quantity: 1,
          price: 130.0,
          deliveryDate: '2026-11-10',
          status: 'pending',
          paymentStatus: 'paid',
          paidAmount: 130.0,
          remainingAmount: 0,
          paymentMethod: 'pix',
          notes: 'Capa dura com wire-o bronze',
          tags: [{ name: 'Planner', color: '#6785a8' }],
          isValid: true,
          errors: [],
          warnings: [],
          rawData: {},
        },
      ];

      vi.spyOn(firebaseCustomerService, 'getCustomers').mockResolvedValue([]);
      const createCustomerSpy = vi
        .spyOn(firebaseCustomerService, 'createCustomer')
        .mockResolvedValue('cust-fernanda-123');

      const createOrderSpy = vi
        .spyOn(firebaseOrderService, 'createOrder')
        .mockResolvedValue({
          id: 'ord-imported-1',
          customerName: 'Fernanda Lima',
          orderNumber: '#2026-0099',
        } as any);

      const progressSteps: any[] = [];
      const res = await executeOrdersImport(mockRows, 'uid-user-1', {
        autoCreateCustomer: true,
        onProgress: (p) => progressSteps.push(p),
      });

      expect(res.total).toBe(1);
      expect(res.successCount).toBe(1);
      expect(res.errorCount).toBe(0);
      expect(res.createdCustomerIds).toContain('cust-fernanda-123');
      expect(res.createdOrderIds).toContain('ord-imported-1');

      expect(createCustomerSpy).toHaveBeenCalledWith(
        'uid-user-1',
        expect.objectContaining({
          name: 'Fernanda Lima',
          phone: '(11) 98888-1111',
          email: 'fernanda@teste.com',
        })
      );

      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'Fernanda Lima',
          customerId: 'cust-fernanda-123',
          productName: 'Planner 2027 Floral',
          price: 130.0,
          status: 'pending',
          payment: expect.objectContaining({
            status: 'paid',
            totalAmount: 130.0,
            paidAmount: 130.0,
            remainingAmount: 0,
          }),
        })
      );

      expect(progressSteps.length).toBeGreaterThan(0);
    });

    it('deve reutilizar cliente existente encontrado por telefone limpo', async () => {
      const mockRows: ParsedOrderRow[] = [
        {
          rowIndex: 2,
          customerName: 'Juliana Paes',
          customerPhone: '(21) 97777-6666',
          productName: 'Caneca Personalizada',
          quantity: 2,
          price: 90.0,
          deliveryDate: '2026-11-20',
          status: 'in-progress',
          paymentStatus: 'pending',
          paidAmount: 0,
          remainingAmount: 90.0,
          isValid: true,
          errors: [],
          warnings: [],
          rawData: {},
        },
      ];

      vi.spyOn(firebaseCustomerService, 'getCustomers').mockResolvedValue([
        {
          id: 'existing-cust-id',
          name: 'Juliana Paes',
          phone: '21977776666',
          userId: 'uid-user-1',
          createdAt: '2026-01-01',
        } as any,
      ]);

      const createCustomerSpy = vi.spyOn(firebaseCustomerService, 'createCustomer');
      const createOrderSpy = vi.spyOn(firebaseOrderService, 'createOrder').mockResolvedValue({
        id: 'ord-juliana-1',
      } as any);

      const res = await executeOrdersImport(mockRows, 'uid-user-1');

      expect(res.successCount).toBe(1);
      expect(createCustomerSpy).not.toHaveBeenCalled();
      expect(createOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'existing-cust-id',
          customerName: 'Juliana Paes',
        })
      );
    });
  });
});
