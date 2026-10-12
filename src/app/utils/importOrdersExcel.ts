/**
 * Utilitários para Importação de Pedidos via Planilha Excel (.xlsx, .xls, .csv)
 *
 * Suporta:
 * 1. Download de modelo de planilha oficial estruturada com instruções.
 * 2. Parsing resiliente com sinônimos automáticos de cabeçalhos.
 * 3. Normalização de datas (DD/MM/AAAA, ISO, números seriais do Excel).
 * 4. Normalização de moedas (R$ 1.500,50, 1500.50, etc.).
 * 5. Validação com avisos e erros detalhados linha por linha.
 * 6. Criação em lote com associação/cadastro de clientes e auditoria financeira atômica.
 */

import { Order, OrderStatus, PaymentStatus, PaymentMethod, Tag } from '../types';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { updateReviewedImportRow } from './importOrdersReview';
import { TAG_COLORS } from './tagColors';

export interface ParsedOrderRow {
  rowIndex: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  productName: string;
  quantity: number;
  price: number;
  deliveryDate: string; // YYYY-MM-DD
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod?: PaymentMethod | null;
  notes?: string;
  tags?: Tag[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
  rawData: Record<string, any>;
}

export interface ExcelParseResult {
  totalRows: number;
  validRows: ParsedOrderRow[];
  invalidRows: ParsedOrderRow[];
  allRows: ParsedOrderRow[];
  headersFound: string[];
}

export interface ImportProgress {
  current: number;
  total: number;
  currentCustomer?: string;
  statusText: string;
}

export interface ImportExecutionResult {
  total: number;
  successCount: number;
  errorCount: number;
  createdOrderIds: string[];
  createdCustomerIds: string[];
  errors: Array<{ rowIndex: number; customerName: string; error: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalização e Dicionário de Sinônimos de Colunas
// ─────────────────────────────────────────────────────────────────────────────

function normalizeHeaderKey(key: string): string {
  return String(key || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]/g, ''); // remove espaços e pontuação
}

const HEADER_ALIASES = {
  customerName: [
    'cliente',
    'nomedocliente',
    'nomecliente',
    'customer',
    'customername',
    'nome',
    'comprador',
  ],
  customerPhone: [
    'telefone',
    'celular',
    'whatsapp',
    'zap',
    'fone',
    'tel',
    'phone',
    'contato',
    'telefonedocliente',
  ],
  customerEmail: [
    'email',
    'emaildocliente',
    'mail',
    'correio',
    'correioeletronico',
  ],
  productName: [
    'produto',
    'nomedoproduto',
    'item',
    'descricao',
    'descricaodoproduto',
    'servico',
    'product',
    'produtoitem',
  ],
  quantity: [
    'quantidade',
    'qtd',
    'quant',
    'qnt',
    'qty',
    'itens',
    'unidades',
    'numerodeitens',
  ],
  price: [
    'valortotal',
    'valor',
    'preco',
    'precototal',
    'total',
    'valortotalr',
    'precor',
    'price',
    'valordopedido',
  ],
  deliveryDate: [
    'datadeentrega',
    'entrega',
    'prazo',
    'previsao',
    'dataentrega',
    'previsaodeentrega',
    'deliverydate',
    'datadoevento',
  ],
  status: [
    'status',
    'statusdopedido',
    'situacao',
    'situacaodopedido',
    'statuspedido',
    'fase',
    'etapa',
  ],
  paymentStatus: [
    'statusdopagamento',
    'statuspagamento',
    'pagamento',
    'situacaopagamento',
    'paymentstatus',
  ],
  paidAmount: [
    'valorpago',
    'pago',
    'valoradimplido',
    'entrada',
    'sinal',
    'adiantamento',
    'paid',
    'valorpagor',
  ],
  paymentMethod: [
    'formadepagamento',
    'metododepagamento',
    'meiodepagamento',
    'metodo',
    'forma',
    'paymentmethod',
    'tipodepagamento',
  ],
  notes: [
    'observacoes',
    'obs',
    'detalhes',
    'notas',
    'anotacoes',
    'notes',
    'observacao',
    'informacoesadicionais',
  ],
  tags: [
    'tags',
    'etiquetas',
    'categorias',
    'categoria',
    'marcador',
    'marcadores',
    'rotulos',
  ],
};

function matchField(normalizedKey: string): keyof typeof HEADER_ALIASES | null {
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalizedKey)) {
      return field as keyof typeof HEADER_ALIASES;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsers Específicos
// ─────────────────────────────────────────────────────────────────────────────

export function parseCurrencyValue(raw: any): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') {
    return isNaN(raw) ? 0 : Math.round(Math.max(0, raw) * 100) / 100;
  }

  const str = String(raw).trim();
  // Remove símbolos monetários e espaços
  let cleaned = str.replace(/[R$\s]/gi, '');

  // Trata formato brasileiro vs americano:
  // Se contiver ponto e vírgula (ex: 1.250,50): remove ponto e troca vírgula por ponto
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Apenas vírgula (ex: 150,50): substitui vírgula por ponto
    cleaned = cleaned.replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(Math.max(0, num) * 100) / 100;
}

export function parseQuantityValue(raw: any): number {
  if (raw === null || raw === undefined || raw === '') return 1;
  if (typeof raw === 'number') {
    const val = Math.floor(raw);
    return val > 0 ? val : 1;
  }
  const clean = String(raw).replace(/\D/g, '');
  const num = parseInt(clean, 10);
  return isNaN(num) || num <= 0 ? 1 : num;
}

export function parseDateValue(raw: any): { dateStr: string; isFallback: boolean } {
  const today = new Date().toISOString().split('T')[0];
  if (!raw) {
    return { dateStr: today, isFallback: true };
  }

  // 1. Data nativa Date do JS
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return { dateStr: raw.toISOString().split('T')[0], isFallback: false };
  }

  // 2. Número de série de data do Excel (ex: 45567)
  if (typeof raw === 'number' && raw > 30000 && raw < 80000) {
    // Excel epoch 1900 bug: 25569 dias de diferença até 1970
    const ms = Math.round((raw - 25569) * 86400 * 1000);
    const date = new Date(ms);
    if (!isNaN(date.getTime())) {
      return { dateStr: date.toISOString().split('T')[0], isFallback: false };
    }
  }

  const str = String(raw).trim();

  // 3. Formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return { dateStr: str.slice(0, 10), isFallback: false };
  }

  // 4. Formato Brasileiro DD/MM/AAAA ou DD-MM-AAAA
  const brMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    const isoDate = `${year}-${month}-${day}`;
    const testDate = new Date(`${isoDate}T12:00:00Z`);
    if (!isNaN(testDate.getTime())) {
      return { dateStr: isoDate, isFallback: false };
    }
  }

  return { dateStr: today, isFallback: true };
}

export function parseOrderStatusValue(raw: any): OrderStatus {
  if (!raw) return 'pending';
  const clean = String(raw).trim().toLowerCase();

  if (clean.includes('produ') || clean.includes('andamento') || clean.includes('fazendo')) {
    return 'in-progress';
  }
  if (clean.includes('conclu') || clean.includes('pronto') || clean.includes('entregue') || clean.includes('finaliz')) {
    return 'completed';
  }
  if (clean.includes('cancel')) {
    return 'cancelled';
  }
  return 'pending';
}

export function parsePaymentStatusValue(raw: any, paidAmount: number, totalAmount: number): PaymentStatus {
  if (raw) {
    const clean = String(raw).trim().toLowerCase();
    if (clean.includes('pago') || clean.includes('quit') || clean.includes('liquid')) {
      return 'paid';
    }
    if (clean.includes('parcial') || clean.includes('entrada') || clean.includes('sinal')) {
      return 'partial';
    }
    if (clean.includes('pend') || clean.includes('aberto')) {
      return 'pending';
    }
  }

  // Dedução inteligente a partir dos valores
  if (paidAmount >= totalAmount && totalAmount > 0) {
    return 'paid';
  }
  if (paidAmount > 0 && paidAmount < totalAmount) {
    return 'partial';
  }
  return 'pending';
}

export function parsePaymentMethodValue(raw: any): PaymentMethod | null {
  if (!raw) return null;
  const clean = String(raw).trim().toLowerCase();

  if (clean.includes('pix')) return 'pix';
  if (clean.includes('dinheiro') || clean.includes('especie') || clean.includes('cash')) return 'cash';
  if (clean.includes('debito') || clean.includes('débito')) return 'debit';
  if (clean.includes('credito') || clean.includes('crédito') || clean.includes('cartao') || clean.includes('cartão')) return 'credit';
  if (clean.includes('transf') || clean.includes('ted') || clean.includes('doc')) return 'transfer';

  return null;
}

export function parseTagsValue(raw: any): Tag[] {
  if (!raw) return [];
  const str = String(raw).trim();
  if (!str) return [];

  const tokens = str.split(/[,;\/|]/).map(t => t.trim()).filter(Boolean);
  return tokens.map((name, idx) => {
    const colorObj = TAG_COLORS[idx % TAG_COLORS.length];
    return {
      name,
      color: colorObj ? colorObj.value : '#6785a8',
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Leitura e Validação do Arquivo Excel (SheetJS)
// ─────────────────────────────────────────────────────────────────────────────

function parseImportedMoney(raw: unknown): number {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return raw < 0 ? raw : Math.round(raw * 100) / 100;
  if (typeof raw !== 'string') return NaN;
  let clean = raw.trim().replace(/R\$|\$|\s/g, '');
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.lastIndexOf(',') > clean.lastIndexOf('.') ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(/,/g, '');
  } else clean = clean.replace(',', '.');
  return /^-?\d+(\.\d{1,2})?$/.test(clean) ? Number(clean) : NaN;
}

export const MAX_ORDER_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_ORDER_IMPORT_ROWS = 1000;

export async function parseOrdersExcelFile(file: File | ArrayBuffer): Promise<ExcelParseResult> {
  const fileSize = file instanceof File ? file.size : file.byteLength;
  if (fileSize > MAX_ORDER_IMPORT_BYTES) throw new Error('A planilha deve ter no máximo 10 MB.');
  const XLSX = await import('xlsx');

  let arrayBuffer: ArrayBuffer;
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }

  const bytes = new Uint8Array(arrayBuffer);
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  const isOle = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((value, index) => bytes[index] === value);
  const extension = file instanceof File ? file.name.toLowerCase().split('.').pop() : null;
  if (extension && !['xlsx', 'xls', 'csv'].includes(extension)) throw new Error('Formato inválido. Use um arquivo .xlsx, .xls ou .csv.');
  if ((extension === 'xlsx' && !isZip) || (extension === 'xls' && !isOle)) throw new Error('O conteúdo do arquivo não corresponde ao formato Excel informado.');
  if (extension === 'csv' || (!isZip && !isOle)) {
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
    const preview = new TextDecoder(encoding).decode(bytes.slice(0, 512)).replace(/^\uFEFF/, '').trimStart();
    if (isZip || isOle || preview.includes('\0') || preview.startsWith('<')) throw new Error('Arquivo CSV inválido. Conteúdo HTML, XML ou binário não é aceito.');
  }

  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    sheetRows: MAX_ORDER_IMPORT_ROWS + 2,
    cellFormula: false,
    cellHTML: false,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('A planilha está vazia e não contém abas utilizáveis.');
  }

  // Localiza aba "Pedidos" preferencialmente ou a primeira aba
  const sheetName = workbook.SheetNames.find(n => /pedidos/i.test(n)) || firstSheetName;
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('Não foi possível ler os dados da aba selecionada.');
  }

  const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'] || 'A1');
  if (range.e.r - range.s.r > MAX_ORDER_IMPORT_ROWS) throw new Error('A planilha deve conter no máximo 1.000 pedidos. Divida o arquivo para importar.');
  if (range.e.c - range.s.c + 1 > 64) throw new Error('A planilha contém colunas demais. Use o modelo de importação.');

  const rawJsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: true,
    dateNF: 'yyyy-mm-dd',
  });

  if (rawJsonRows.length === 0) {
    return {
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      allRows: [],
      headersFound: [],
    };
  }

  if (rawJsonRows.length > MAX_ORDER_IMPORT_ROWS) throw new Error('A planilha deve conter no máximo 1.000 pedidos. Divida o arquivo para importar.');
  if (Object.keys(rawJsonRows[0] || {}).length > 64) throw new Error('A planilha contém colunas demais. Use o modelo de importação.');

  // Mapear cabeçalhos encontrados para os campos padrão
  const headersFound = Object.keys(rawJsonRows[0] || {});
  const headerMap = new Map<string, keyof typeof HEADER_ALIASES>();

  for (const h of headersFound) {
    const norm = normalizeHeaderKey(h);
    const matched = matchField(norm);
    if (matched) {
      headerMap.set(h, matched);
    }
  }

  const allRows: ParsedOrderRow[] = [];

  rawJsonRows.forEach((row, index) => {
    const rowIndex = index + 2; // Linha 1 = cabeçalho no Excel
    const mapped: Record<string, any> = {};

    for (const [colName, val] of Object.entries(row)) {
      const fieldKey = headerMap.get(colName);
      if (fieldKey) {
        mapped[fieldKey] = val;
      }
    }

    const customerName = String(mapped.customerName || '').trim();
    const customerPhone = String(mapped.customerPhone || '').trim();
    const customerEmail = mapped.customerEmail ? String(mapped.customerEmail).trim() : undefined;
    const productName = String(mapped.productName || '').trim();
    const quantity = parseQuantityValue(mapped.quantity);
    const price = parseImportedMoney(mapped.price);
    const { dateStr: deliveryDate, isFallback: isDateFallback } = parseDateValue(mapped.deliveryDate);
    const status = parseOrderStatusValue(mapped.status);
    const paidAmount = parseImportedMoney(mapped.paidAmount);
    const paymentStatus = parsePaymentStatusValue(mapped.paymentStatus, paidAmount, price);
    const paymentMethod = parsePaymentMethodValue(mapped.paymentMethod);
    const notes = mapped.notes ? String(mapped.notes).trim() : undefined;
    const tags = parseTagsValue(mapped.tags);

    const remainingAmount = Math.max(0, Math.round((price - paidAmount) * 100) / 100);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validações obrigatórias
    if (!customerName) {
      errors.push('Nome do cliente é obrigatório.');
    }
    if (!productName) {
      errors.push('Nome do produto é obrigatório.');
    }
    if (price <= 0) {
      warnings.push('Valor total do pedido é R$ 0,00.');
    }
    if (!customerPhone) {
      warnings.push('Telefone do cliente não informado.');
    }
    if (isDateFallback && mapped.deliveryDate) {
      warnings.push(`Data de entrega inválida (${mapped.deliveryDate}); ajustada para a data de hoje.`);
    }

    const isValid = errors.length === 0;

    const reviewed = updateReviewedImportRow({
      rowIndex,
      customerName,
      customerPhone,
      customerEmail,
      productName,
      quantity,
      price,
      deliveryDate,
      status,
      paymentStatus,
      paidAmount,
      remainingAmount,
      paymentMethod,
      notes,
      tags,
      isValid,
      errors,
      warnings,
      rawData: row,
    }, {});
    if (mapped.quantity !== undefined && mapped.quantity !== null && mapped.quantity !== '') {
      const suppliedQuantity = String(mapped.quantity).trim();
      if (!/^\d+\s*(unidades?|un|x)?$/i.test(suppliedQuantity) || !(quantity > 0 && Number(suppliedQuantity.replace(/[^0-9]/g, '')) > 0)) reviewed.errors.push('Quantidade informada na planilha é inválida. Use um número inteiro maior que zero.');
    }
    reviewed.isValid = reviewed.errors.length === 0;
    reviewed.warnings.push(...warnings.filter(warning => !reviewed.warnings.includes(warning)));
    allRows.push(reviewed);
  });

  const validRows = allRows.filter(r => r.isValid);
  const invalidRows = allRows.filter(r => !r.isValid);

  return {
    totalRows: allRows.length,
    validRows,
    invalidRows,
    allRows,
    headersFound,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Geração e Download de Planilha Modelo (.xlsx)
// ─────────────────────────────────────────────────────────────────────────────

export async function buildOrderImportTemplateWorkbook() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Aba 1: Pedidos Modelo
  const sampleData = [
    {
      'Cliente *': 'Mariana Souza Silva',
      'Telefone': '(11) 98765-4321',
      'Email': 'mariana.silva@email.com',
      'Produto *': 'Agenda 2027 Personalizada Floral',
      'Quantidade *': 2,
      'Valor Total (R$) *': 180.0,
      'Data de Entrega': '25/11/2026',
      'Status do Pedido': 'Pendente',
      'Status do Pagamento': 'Parcial',
      'Valor Pago (R$)': 90.0,
      'Forma de Pagamento': 'Pix',
      'Observações': 'Nome na capa: Mari Silva. Miolo pautado com elástico dourado.',
      'Tags': 'Agenda, Natal, Luxo',
    },
    {
      'Cliente *': 'Lucas Fernandes Costa',
      'Telefone': '(21) 97123-4567',
      'Email': 'lucas.costa@email.com',
      'Produto *': 'Caixas Milk Lembrancinha Batizado',
      'Quantidade *': 20,
      'Valor Total (R$) *': 240.0,
      'Data de Entrega': '15/12/2026',
      'Status do Pedido': 'Em Produção',
      'Status do Pagamento': 'Pago',
      'Valor Pago (R$)': 240.0,
      'Forma de Pagamento': 'Cartão de Crédito',
      'Observações': 'Fita de cetim branca com aplique em lamicote dourado.',
      'Tags': 'Batizado, Lembrancinha',
    },
    {
      'Cliente *': 'Beatriz Oliveira Santos',
      'Telefone': '(31) 99888-7766',
      'Email': '',
      'Produto *': 'Topo de Bolo Shaker 3D Borboletas',
      'Quantidade *': 1,
      'Valor Total (R$) *': 65.0,
      'Data de Entrega': '05/11/2026',
      'Status do Pedido': 'Pendente',
      'Status do Pagamento': 'Pendente',
      'Valor Pago (R$)': 0.0,
      'Forma de Pagamento': 'Pix',
      'Observações': 'Nome: Beatriz 15 anos. Paleta lilás e rosé.',
      'Tags': 'Topo de Bolo, 15 Anos',
    },
  ];

  const wsOrders = XLSX.utils.json_to_sheet(sampleData);
  wsOrders['!cols'] = [
    { wch: 26 }, // Cliente
    { wch: 18 }, // Telefone
    { wch: 26 }, // Email
    { wch: 36 }, // Produto
    { wch: 14 }, // Quantidade
    { wch: 18 }, // Valor Total
    { wch: 16 }, // Data Entrega
    { wch: 18 }, // Status
    { wch: 20 }, // Status Pagamento
    { wch: 16 }, // Valor Pago
    { wch: 20 }, // Forma Pagamento
    { wch: 45 }, // Observações
    { wch: 25 }, // Tags
  ];
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Pedidos');

  // Aba 2: Instruções Detalhadas
  const instructions = [
    ['INSTRUÇÕES DE PREENCHIMENTO DA PLANILHA DE PEDIDOS - LUISICES'],
    [''],
    ['Coluna', 'Obrigatório?', 'Formatos Aceitos', 'Exemplo e Observações'],
    ['Cliente *', 'SIM', 'Texto', 'Nome completo ou primeiro nome da cliente.'],
    ['Telefone', 'Não', 'Telefone ou WhatsApp', '(11) 98765-4321 — Permite localizar cliente existente ou criar novo.'],
    ['Email', 'Não', 'E-mail válido', 'cliente@email.com'],
    ['Produto *', 'SIM', 'Texto', 'Descrição do item ou conjunto encomendado.'],
    ['Quantidade *', 'SIM', 'Número inteiro', 'Padrão 1 caso deixe em branco.'],
    ['Valor Total (R$) *', 'SIM', 'Número ou R$ 150,00', 'Preço total do pedido. Aceita 150.00 ou 150,00.'],
    ['Data de Entrega', 'Não', 'DD/MM/AAAA ou AAAA-MM-DD', 'Caso deixe vazio, será preenchido com a data de hoje.'],
    ['Status do Pedido', 'Não', 'Pendente, Em Produção, Concluído, Cancelado', 'Padrão: Pendente se não informado.'],
    ['Status do Pagamento', 'Não', 'Pendente, Parcial, Pago', 'Calculado automaticamente se Valor Pago for informado.'],
    ['Valor Pago (R$)', 'Não', 'Número ou R$ 50,00', 'Valor que já foi recebido adiantado ou sinal.'],
    ['Forma de Pagamento', 'Não', 'Pix, Dinheiro, Cartão de Crédito, Débito, Transferência', 'Meio utilizado para o pagamento.'],
    ['Observações', 'Não', 'Texto livre', 'Cores, nomes na capa, tema, detalhes artesanais.'],
    ['Tags', 'Não', 'Palavras separadas por vírgula', 'Ex: Agenda, Casamento, Urgente.'],
    [''],
    ['DICAS IMPORTANTES:'],
    ['1. Não altere o nome dos cabeçalhos na primeira linha da aba Pedidos.'],
    ['2. Linhas sem o nome do cliente ou sem o produto serão identificadas com erro e não serão importadas.'],
    ['3. O sistema cria automaticamente o cadastro do cliente caso ele ainda não exista na sua lista.'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 32 },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

  return wb;
}

export async function downloadOrderImportTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = await buildOrderImportTemplateWorkbook();
  XLSX.writeFile(wb, 'modelo_importacao_pedidos_luisices.xlsx');
}

// ─────────────────────────────────────────────────────────────────────────────
// Execução do Lote de Importação
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecuteImportOptions {
  autoCreateCustomer?: boolean;
  onProgress?: (progress: ImportProgress) => void;
}

export async function executeOrdersImport(
  rowsToImport: ParsedOrderRow[],
  userId: string,
  options: ExecuteImportOptions = {}
): Promise<ImportExecutionResult> {
  if (!Array.isArray(rowsToImport) || rowsToImport.length === 0 || rowsToImport.length > MAX_ORDER_IMPORT_ROWS) throw new Error('Selecione entre 1 e 1.000 pedidos para importar.');
  if (!userId || typeof userId !== 'string') throw new Error('Usuário inválido para importação.');
  const checkedRows = rowsToImport.map(row => updateReviewedImportRow(row, {}));
  const invalidRow = checkedRows.find(row => !row.isValid);
  if (invalidRow) throw new Error(`Linha ${invalidRow.rowIndex}: ${invalidRow.errors.join(' ')}`);
  rowsToImport = checkedRows;
  const { autoCreateCustomer = true, onProgress } = options;

  const result: ImportExecutionResult = {
    total: rowsToImport.length,
    successCount: 0,
    errorCount: 0,
    createdOrderIds: [],
    createdCustomerIds: [],
    errors: [],
  };

  // 1. Carrega clientes existentes para correspondência rápida em memória
  let existingCustomers: any[] = [];
  try {
    existingCustomers = await firebaseCustomerService.getCustomers(userId);
  } catch (err) {
    console.warn('[executeOrdersImport] Erro ao carregar clientes existentes para cache:', err);
  }

  // Mapas por telefone limpo e por nome minúsculo
  const phoneToCustomerMap = new Map<string, any>();
  const nameToCustomerMap = new Map<string, any>();

  existingCustomers.forEach(c => {
    if (c.phone) {
      const cleanPhone = c.phone.replace(/\D/g, '');
      if (cleanPhone) phoneToCustomerMap.set(cleanPhone, c);
    }
    if (c.name) {
      nameToCustomerMap.set(c.name.trim().toLowerCase(), c);
    }
  });

  const total = rowsToImport.length;

  for (let i = 0; i < total; i++) {
    const row = rowsToImport[i];

    onProgress?.({
      current: i + 1,
      total,
      currentCustomer: row.customerName,
      statusText: `Importando pedido ${i + 1} de ${total}: ${row.customerName}...`,
    });

    try {
      let customerId: string | undefined = undefined;
      const cleanPhone = row.customerPhone ? row.customerPhone.replace(/\D/g, '') : '';
      const lowerName = row.customerName.trim().toLowerCase();

      // Procura cliente existente
      let matchedCustomer = null;
      if (cleanPhone && phoneToCustomerMap.has(cleanPhone)) {
        matchedCustomer = phoneToCustomerMap.get(cleanPhone);
      } else if (!cleanPhone && nameToCustomerMap.has(lowerName)) {
        matchedCustomer = nameToCustomerMap.get(lowerName);
      }

      if (matchedCustomer) {
        customerId = matchedCustomer.id;
      } else if (autoCreateCustomer && row.customerName) {
        try {
          const newCustomerId = await firebaseCustomerService.createCustomer(userId, {
            name: row.customerName,
            phone: row.customerPhone || '',
            email: row.customerEmail || undefined,
            notes: 'Cadastrado automaticamente via importação de pedidos do Excel.',
            status: 'active',
          });
          customerId = newCustomerId;
          result.createdCustomerIds.push(newCustomerId);

          // Atualiza mapas em memória para evitar duplicatas em linhas subsequentes
          const dummyCustomer = { id: newCustomerId, name: row.customerName, phone: row.customerPhone };
          if (cleanPhone) phoneToCustomerMap.set(cleanPhone, dummyCustomer);
          nameToCustomerMap.set(lowerName, dummyCustomer);
        } catch (createCustErr: any) {
          throw new Error(`Não foi possível cadastrar o cliente desta linha: ${createCustErr?.message || 'operação não autorizada ou indisponível'}`);
        }
      }

      // Monta estrutura de pagamento
      const payment = {
        status: row.paymentStatus,
        method: row.paymentMethod || null,
        totalAmount: row.price,
        paidAmount: row.paidAmount,
        remainingAmount: row.remainingAmount,
        paymentDate: row.paidAmount > 0 ? new Date().toISOString() : null,
        notes: row.paidAmount > 0 ? 'Registrado via importação de planilha Excel.' : null,
        history: row.paidAmount > 0 && row.paymentMethod ? [
          {
            amount: row.paidAmount,
            date: new Date().toISOString(),
            method: row.paymentMethod,
            notes: 'Valor adiantado registrado via importação Excel',
          }
        ] : null,
      };

      const orderPayload: Partial<Order> = {
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        customerId: customerId || undefined,
        productName: row.productName,
        quantity: row.quantity,
        price: row.price,
        status: row.status,
        deliveryDate: row.deliveryDate,
        notes: row.notes || null,
        tags: row.tags && row.tags.length > 0 ? row.tags : null,
        payment,
        source: 'store', // Origem reconhecida para pedidos do ateliê
      };

      const createdOrder = await firebaseOrderService.createOrder(orderPayload);
      result.successCount++;
      result.createdOrderIds.push(createdOrder.id);
    } catch (err: any) {
      console.error(`[executeOrdersImport] Erro na linha ${row.rowIndex}:`, err);
      result.errorCount++;
      result.errors.push({
        rowIndex: row.rowIndex,
        customerName: row.customerName,
        error: err?.message || 'Falha desconhecida ao cadastrar pedido.',
      });
    }
  }

  return result;
}
