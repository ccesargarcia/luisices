/**
 * Gerador Dinâmico da Especificação OpenAPI 3.0.3 para Plugins ChatGPT.
 */

const { TOOL_SCOPE_MAP, MCP_SCOPES } = require('./constants');

const MONEY_TEXT_PATTERN = '^(?:R\\$\\s*)?(?:\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:[,.]\\d{1,2})?|[,.]\\d{1,2})$';

function moneyInput(description, { minimum = 0, maximum, exclusiveMinimum } = {}) {
  const numeric = { type: 'number' };
  if (minimum !== undefined) numeric.minimum = minimum;
  if (maximum !== undefined) numeric.maximum = maximum;
  if (exclusiveMinimum !== undefined) numeric.exclusiveMinimum = exclusiveMinimum;
  const string = { type: 'string', pattern: MONEY_TEXT_PATTERN };
  return {
    anyOf: [numeric, string],
    'x-accept-localized-money': true,
    ...(minimum !== undefined ? { minimum } : {}),
    ...(maximum !== undefined ? { maximum } : {}),
    ...(exclusiveMinimum !== undefined ? { exclusiveMinimum } : {}),
    description: `${description} Aceita número ou valor digitado como 25,50, 25.50 ou 1.234,56.`,
  };
}

/**
 * Definição padronizada de cada ferramenta com schemas de entrada e saída.
 */
const TOOLS_METADATA = [
  {
    name: 'query_orders_view',
    scope: 'orders:read',
    summary: 'Consultar Fila de Pedidos & Produção',
    description: 'Consulta pedidos por status (em_producao, pendente, concluido, entregue), termo de busca ou data de entrega.',
    requestBody: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'todos', 'pendente', 'em_producao', 'concluido', 'entregue', 'atrasado'],
          description: 'Filtro por status do pedido. Padrão: todos.',
        },
        searchTerm: {
          type: 'string',
          maxLength: 200,
          description: 'Busca por nome do cliente, número do pedido ou resumo do produto.',
        },
        startDate: {
          type: 'string',
          maxLength: 10,
          description: 'Data inicial no formato AAAA-MM-DD.',
        },
        endDate: {
          type: 'string',
          maxLength: 10,
          description: 'Data final no formato AAAA-MM-DD.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Quantidade máxima de pedidos retornados (máximo 50). Padrão: 15.',
          default: 15,
        },
      },
    },
  },
  {
    name: 'daily_briefing',
    scope: 'orders:read',
    summary: 'Raio-X Operacional do Dia',
    description: 'Retorna entregas previstas para hoje, pedidos em atraso, contagem em produção e pagamentos pendentes.',
    requestBody: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          maxLength: 10,
          description: 'Data de referência (AAAA-MM-DD). Se omitida, utiliza a data de hoje.',
        },
      },
    },
  },
  {
    name: 'query_customers',
    scope: 'customers:read',
    summary: 'Consultar Clientes & Contatos',
    description: 'Pesquisa clientes por nome, telefone WhatsApp ou cidade. Para localizar clientes atendidos por um colaborador, informe userIdentifier.',
    requestBody: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          maxLength: 200,
          description: 'Nome, número de telefone ou cidade do cliente.',
        },
        userIdentifier: { type: 'string', maxLength: 200, description: 'Identificador de colaborador, disponível apenas conforme as permissões do usuário.' },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Limite de clientes a retornar (máximo 50).',
          default: 10,
        },
      },
    },
  },
  {
    name: 'get_customer_history',
    scope: 'customers:read',
    summary: 'Consultar Histórico do Cliente',
    description: 'Retorna dados básicos e pedidos autorizados associados a um cliente. Valores e pagamentos só aparecem se a sessão também possuir pagamentos:read.',
    requestBody: {
      type: 'object',
      required: ['customerId'],
      properties: {
        customerId: { type: 'string', minLength: 1, maxLength: 128, description: 'ID do cliente obtido em query_customers.' },
        limit: { type: 'integer', minimum: 1, maximum: 20, default: 10, description: 'Máximo de pedidos recentes a retornar.' },
      },
    },
  },
  {
    name: 'query_delivery_schedule',
    scope: 'orders:read',
    summary: 'Consultar Agenda de Entregas',
    description: 'Lista entregas em um intervalo de até 31 dias, respeitando o acesso do usuário aos pedidos.',
    requestBody: {
      type: 'object',
      required: ['startDate', 'endDate'],
      properties: {
        startDate: { type: 'string', minLength: 10, maxLength: 10, description: 'Data inicial inclusiva (AAAA-MM-DD).' },
        endDate: { type: 'string', minLength: 10, maxLength: 10, description: 'Data final inclusiva (AAAA-MM-DD), até 31 dias após o início.' },
        status: { type: 'string', enum: ['all', 'pending', 'in-progress', 'completed', 'cancelled'], default: 'all' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
    },
  },
  {
    name: 'get_financial_summary',
    scope: 'financial:read',
    summary: 'Resumo Financeiro & Faturamento',
    description: 'Retorna métricas de faturamento realizado, total recebido, valores pendentes e ticket médio no período.',
    requestBody: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Período desejado: "hoje", "esta_semana", "mes" (padrão), "mes_anterior", "ano", ou mês específico como "setembro".',
          default: 'mes',
        },
        userIdentifier: {
          type: 'string',
          maxLength: 200,
          description: 'Filtrar por colaborador específico (apenas administradores).',
        },
      },
    },
  },
  {
    name: 'calculate_pricing_estimate',
    scope: 'pricing:estimate',
    summary: 'Calculadora de Precificação & Custos',
    description: 'Calcula estimativa usando os campos por unidade do motor. Para compatibilidade, materialsCost (materiais totais do lote), laborHours (horas totais do lote) e targetMarginPercent são aceitos e convertidos explicitamente.',
    requestBody: {
      type: 'object',
      required: ['productName', 'quantity'],
      properties: {
        productName: {
          type: 'string',
          description: 'Nome ou tipo do produto (ex: "Caixa Cartonada 15x15", "Convite Luxo").',
        },
        quantity: {
          type: 'integer',
          minimum: 1,
          maximum: 100000,
          description: 'Quantidade de peças desejadas.',
        },
        unitCostRaw: { type: 'number', minimum: 0, maximum: 10000000, description: 'Custo de matéria-prima por unidade (alias legado).' },
        rawMaterialsCost: { type: 'number', minimum: 0, maximum: 10000000, description: 'Custo de matéria-prima por unidade.' },
        materialsCost: {
          type: 'number',
          minimum: 0,
          maximum: 10000000,
          description: 'Custo total do lote; convertido em custo unitário dividindo por quantity.',
        },
        customizationCost: { type: 'number', minimum: 0, maximum: 10000000, description: 'Custo de personalização por unidade.' },
        laborTimeMinutes: { type: 'number', minimum: 0, maximum: 60000, description: 'Tempo de mão de obra por unidade, em minutos.' },
        laborHours: {
          type: 'number',
          minimum: 0,
          maximum: 1000,
          description: 'Horas totais de mão de obra do lote; convertidas para minutos por unidade dividindo por quantity.',
        },
        setupTimeMinutes: { type: 'number', minimum: 0, maximum: 600000, description: 'Tempo de preparação do lote, em minutos.' },
        profitMarginPercent: { type: 'number', minimum: 0, maximum: 95, description: 'Margem de lucro em porcentagem.' },
        targetMarginPercent: {
          type: 'number',
          minimum: 0,
          maximum: 95,
          description: 'Alias legado para profitMarginPercent.',
        },
        paymentFeePercent: { type: 'number', minimum: 0, maximum: 100, description: 'Taxa de pagamento em porcentagem.' },
        wasteMarginPercent: { type: 'number', minimum: 0, maximum: 1000, description: 'Percentual de perdas.' },
      },
    },
  },
  {
    name: 'generate_whatsapp_message',
    scope: 'whatsapp:compose',
    summary: 'Gerar Rascunho de Mensagem WhatsApp',
    description: 'Monta texto de mensagem personalizado para enviar ao cliente (cobrança de saldo, pedido pronto ou confirmação).',
    requestBody: {
      type: 'object',
      required: ['recipientName'],
      properties: {
        recipientName: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description: 'Nome do cliente.',
        },
        recipientPhone: {
          type: 'string',
          maxLength: 50,
          description: 'Telefone/WhatsApp do cliente.',
        },
        orderNumber: {
          type: 'string',
          maxLength: 100,
          description: 'Número do pedido.',
        },
        messageType: {
          type: 'string',
          enum: ['cobranca_saldo', 'pedido_pronto', 'confirmacao_pedido', 'lembrete_geral'],
          description: 'Tipo de mensagem.',
        },
        customText: {
          type: 'string',
          maxLength: 2000,
          description: 'Observações específicas a incluir no texto.',
        },
      },
    },
  },
  {
    name: 'get_order_form',
    scope: 'orders:draft',
    summary: 'Obter Formulário Estruturado de Pedido',
    description: 'Retorna o modelo de formulário padronizado em Markdown para coleta guiada dos dados do cliente e do pedido de papelaria personalizada.',
    requestBody: {
      type: 'object',
      properties: {
        customerName: {
          type: 'string',
          maxLength: 200,
          description: 'Nome do cliente se já informado.',
        },
        productCategory: {
          type: 'string',
          maxLength: 100,
          description: 'Categoria opcional do produto (ex: "caixas_milk", "festa_infantil", "convites", "corporativo").',
        },
      },
    },
  },
  {
    name: 'extract_order_draft',
    scope: 'orders:draft',
    summary: 'Montar Rascunho de Pedido',
    description: 'Extrai dados informados por cliente em conversa e estrutura um rascunho de pedido para conferência. Para efetivar e registrar o pedido no sistema, execute a ação create_order.',
    requestBody: {
      type: 'object',
      properties: {
        customerName: {
          type: 'string',
          maxLength: 200,
          description: 'Nome do cliente.',
        },
        customerPhone: {
          type: 'string',
          maxLength: 50,
          description: 'Telefone do cliente.',
        },
        productSummary: {
          type: 'string',
          maxLength: 1000,
          description: 'Descrição dos itens encomendados.',
        },
        productName: { type: 'string', maxLength: 1000, description: 'Alias para a descrição dos itens.' },
        quantity: {
          type: 'integer',
          minimum: 1,
          maximum: 100000,
          description: 'Quantidade.',
        },
        totalPrice: moneyInput('Valor total acertado.', { minimum: 0, maximum: 10000000 }),
        paidAmount: moneyInput('Valor já pago, se informado.', { minimum: 0, maximum: 10000000 }),
        deliveryDate: {
          type: 'string',
          maxLength: 10,
          description: 'Data prometida de entrega (AAAA-MM-DD).',
        },
        theme: {
          type: 'string',
          maxLength: 200,
          description: 'Tema ou paleta de cores.',
        },
        notes: {
          type: 'string',
          maxLength: 2000,
          description: 'Observações de acabamento.',
        },
      },
    },
  },
  {
    name: 'create_order',
    scope: 'orders:create',
    summary: 'Criar e Registrar Novo Pedido no Sistema',
    description: 'Mostre uma prévia e peça confirmação explícita antes de registrar. Só informe sucesso quando o pedido tiver sido salvo. Se repetir a chamada após uma falha, preserve os dados enviados. Não mencione os mecanismos internos usados para evitar duplicidade. Não envie paidAmount nem paymentMethod salvo se o usuário disser explicitamente que já recebeu um sinal. Gera número sequencial (#AAAA-0001), calcula o saldo e define o status como pendente.',
    requestBody: {
      type: 'object',
      required: ['customerName', 'productName', 'quantity', 'totalPrice', 'deliveryDate', 'idempotencyKey'],
      properties: {
        customerName: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description: 'Nome completo ou primeiro nome do cliente.',
        },
        customerPhone: {
          type: 'string',
          maxLength: 50,
          description: 'Telefone ou WhatsApp do cliente para contato.',
        },
        productName: {
          type: 'string',
          minLength: 1,
          maxLength: 500,
          description: 'Nome e descrição do produto encomendado (ex: "30 Caixas Milk Personalizadas", "Topo de Bolo").',
        },
        quantity: {
          type: 'integer',
          description: 'Quantidade encomendada (mínimo 1).',
          minimum: 1,
          maximum: 100000,
        },
        totalPrice: moneyInput('Valor total do pedido em reais.', { minimum: 0, maximum: 10000000 }),
        paidAmount: { ...moneyInput('Valor de entrada ou sinal efetivamente já recebido. Omita se não houve pagamento; exige payments:write.', { minimum: 0, maximum: 10000000 }), default: 0 },
        paymentMethod: {
          type: 'string',
          enum: ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia', 'cash', 'credit', 'debit', 'transfer', 'outro'],
          description: 'Forma do pagamento inicial já recebido. Omita quando ainda não houve pagamento; exige payments:write.',
        },
        deliveryDate: {
          type: 'string',
          maxLength: 10,
          description: 'Data limite prometida para entrega no formato AAAA-MM-DD (ou DD/MM/AAAA).',
        },
        theme: {
          type: 'string',
          maxLength: 200,
          description: 'Tema da festa ou personalização (ex: "Safari Baby", "Jardim Encantado").',
        },
        notes: {
          type: 'string',
          maxLength: 2000,
          description: 'Observações de produção, personalização ou instruções especiais.',
        },
        tags: {
          type: 'array',
          maxItems: 20,
          items: { type: 'string', maxLength: 50 },
          description: 'Tags adicionais para organizar o pedido (a tag "ChatGPT" é adicionada automaticamente).',
        },
        idempotencyKey: {
          type: 'string',
          minLength: 8,
          maxLength: 128,
          pattern: '^[A-Za-z0-9._:-]{8,128}$',
          description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.',
        },
        confirmed: {
          type: 'boolean',
          description: 'Use false para preparar a prévia e true somente após confirmação explícita. Preserve os mesmos dados entre as chamadas.',
        },
      },
    },
  },
  {
    name: 'get_order_edit_form',
    scope: 'orders:update',
    summary: 'Abrir edição de pedido',
    description: 'Carrega o pedido e apresenta de imediato todas as opções editáveis: cliente, telefone, itens (produto, quantidade e preço unitário), prazo, tema, observações e etapa de produção. Não pergunte qual campo ou item a pessoa quer editar antes de mostrar essas opções. Convide a pessoa a alterar um ou vários campos na mesma solicitação e use o formulário visual quando disponível. O total é recalculado pelos itens; pagamentos existentes são preservados. Alterações exigem prévia e confirmação explícita.',
    requestBody: {
      type: 'object',
      required: ['orderNumber'],
      properties: {
        orderNumber: { type: 'string', minLength: 1, maxLength: 100, description: 'Número mostrado ao usuário (ex.: #2026-0042 ou 2026-0042) ou ID interno do documento.' },
      },
    },
  },
  {
    name: 'update_order',
    scope: 'orders:update',
    summary: 'Editar um Pedido Existente',
    description: 'Mostra uma prévia das alterações. Só grave após apresentar as mudanças e receber confirmação explícita; preserve os mesmos dados caso precise repetir a chamada. REGRA PARA ADICIONAR OU ALTERAR PRODUTOS: Se o usuário pedir para adicionar um novo item ou alterar produtos, NUNCA concatene o novo item no campo productName; em vez disso, consulte get_order_edit_form e envie a lista completa no campo items (preservando os existingIndex dos itens existentes e incluindo o novo item com seu name, quantity e unitPrice). O total e a quantidade geral são recalculados automaticamente pelos itens. Não registra nem altera pagamentos recebidos. Não mencione controles internos de concorrência ou de repetição.',
    requestBody: {
      type: 'object',
      required: ['orderNumber'],
      properties: {
        orderNumber: { type: 'string', description: 'Número do pedido, por exemplo #2026-0042, ou ID do documento.' },
        customerName: { type: 'string', maxLength: 200, description: 'Novo nome do cliente, se for alterar.' },
        customerPhone: { type: 'string', maxLength: 50, description: 'Novo telefone/WhatsApp, se for alterar.' },
        productName: { type: 'string', maxLength: 300, description: 'Descrição do produto principal para pedidos simples de item único. NÃO utilize este campo para adicionar itens ao pedido nem para listar múltiplos produtos; para adicionar ou alterar itens use sempre o array items.' },
        quantity: { type: 'integer', minimum: 1, maximum: 10000, description: 'Nova quantidade.' },
        totalPrice: moneyInput('Novo valor total do pedido em reais. Informe este campo OU unitPrice, nunca ambos.', { minimum: 0, maximum: 10000000 }),
        unitPrice: moneyInput('Novo valor por unidade em reais. O backend calcula o total multiplicando pela quantidade final do pedido. Informe este campo OU totalPrice, nunca ambos.', { minimum: 0, maximum: 1000000 }),
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 10,
          description: 'Substitui a lista de itens do pedido (até 10 itens). Use sempre este campo para adicionar itens a um pedido ou editar produtos individuais. Para adicionar um item a um pedido existente: consulte get_order_edit_form, inclua os itens existentes (mantendo seu existingIndex, name, quantity e unitPrice) e adicione o novo item com seu name, quantity e unitPrice (sem existingIndex). Não combine com quantidade geral, totalPrice ou unitPrice.',
          items: {
            type: 'object',
            required: ['name', 'quantity', 'unitPrice'],
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 300 },
              quantity: { type: 'integer', minimum: 1, maximum: 10000 },
              unitPrice: moneyInput('Preço unitário deste item em reais.', { minimum: 0, maximum: 1000000 }),
              price: moneyInput('Opcional: subtotal exato deste item em reais. Se informado, preserva centavos exatos de itens legados.', { minimum: 0, maximum: 10000000 }),
              existingIndex: { type: 'integer', minimum: 0, maximum: 49, description: 'Campo interno: índice do item carregado por get_order_edit_form. Preserve ao editar um item existente; omita para item novo.' },
            },
          },
        },
        deliveryDate: { type: 'string', description: 'Novo prazo no formato AAAA-MM-DD ou DD/MM/AAAA.' },
        theme: { type: 'string', maxLength: 200, description: 'Novo tema do pedido.' },
        notes: { type: 'string', maxLength: 1000, description: 'Novas observações de produção.' },
        expectedVersion: { type: 'integer', minimum: 1, description: 'Versão obtida no formulário/consulta. Obrigatória ao alterar.' },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.' },
        confirmed: { type: 'boolean', description: 'Use false para prévia. Use true somente depois que o usuário confirmar explicitamente as alterações apresentadas.' },
      },
    },
  },
  {
    name: 'add_order_item',
    scope: 'orders:update',
    summary: 'Adicionar Item a um Pedido Existente',
    description: 'Adiciona um novo produto/item individualmente a um pedido existente, preservando todos os itens atuais e recalculando o total e a quantidade automaticamente. Mostra uma prévia das alterações antes de gravar. Só grave após apresentar as mudanças e receber confirmação explícita do usuário.',
    requestBody: {
      type: 'object',
      required: ['orderNumber', 'name', 'quantity', 'unitPrice'],
      properties: {
        orderNumber: { type: 'string', description: 'Número do pedido, por exemplo #2026-0042, ou ID do documento.' },
        name: { type: 'string', minLength: 1, maxLength: 300, description: 'Nome ou descrição do novo item a ser adicionado.' },
        quantity: { type: 'integer', minimum: 1, maximum: 10000, description: 'Quantidade do novo item (número inteiro >= 1).' },
        unitPrice: moneyInput('Preço unitário do novo item em reais (ex: 44,00 ou 44).', { minimum: 0, maximum: 1000000 }),
        price: moneyInput('Opcional: subtotal do item em reais caso queira fixar um valor total específico.', { minimum: 0, maximum: 10000000 }),
        expectedVersion: { type: 'integer', minimum: 1, description: 'Versão atual do pedido obtida na prévia. Opcional na prévia (confirmed=false); OBRIGATÓRIA ao confirmar (confirmed=true) para garantir controle de concorrência e evitar sobrescrever alterações concorrentes.' },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.' },
        confirmed: { type: 'boolean', description: 'Use false (padrão) para gerar a prévia com o item adicionado e o novo total. Use true somente após o usuário confirmar explicitamente.' },
      },
    },
  },
  {
    name: 'update_order_status',
    scope: 'orders:update',
    summary: 'Atualizar Etapa de Produção',
    description: 'Avança o pedido entre pendente, em produção e concluído. Mostre a prévia e só salve após confirmação explícita. Não mencione controles internos de concorrência ou de repetição. Cancelamentos e reaberturas ficam fora deste fluxo.',
    requestBody: {
      type: 'object',
      required: ['orderNumber', 'status', 'expectedVersion', 'idempotencyKey'],
      properties: {
        orderNumber: { type: 'string', minLength: 1, maxLength: 128 },
        status: { type: 'string', enum: ['in-progress', 'completed'], description: 'Etapa de destino. O servidor valida a transição com o estado atual.' },
        expectedVersion: { type: 'integer', minimum: 1 },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.' },
        confirmed: { type: 'boolean', description: 'Use false para prévia e true somente após confirmação explícita.' },
      },
    },
  },
  {
    name: 'update_delivery_details',
    scope: 'orders:update',
    summary: 'Alterar Data ou Observação de Entrega',
    description: 'Apresenta uma prévia da alteração de entrega e só grava após confirmação explícita.',
    requestBody: {
      type: 'object',
      required: ['orderNumber', 'expectedVersion', 'idempotencyKey'],
      properties: {
        orderNumber: { type: 'string', minLength: 1, maxLength: 128 },
        deliveryDate: { type: 'string', minLength: 10, maxLength: 10, description: 'Nova data (AAAA-MM-DD).' },
        notes: { type: 'string', maxLength: 1000, description: 'Observação operacional opcional da entrega.' },
        expectedVersion: { type: 'integer', minimum: 1 },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.' },
        confirmed: { type: 'boolean', description: 'Use false para prévia e true após confirmação explícita.' },
      },
    },
  },
  {
    name: 'query_order_payments',
    scope: 'payments:read',
    summary: 'Consultar Pagamentos de um Pedido',
    description: 'Consulta valores, saldo e histórico de pagamentos do pedido no escopo autorizado do usuário.',
    requestBody: {
      type: 'object',
      required: ['orderNumber'],
      properties: {
        orderNumber: { type: 'string', description: 'Número do pedido ou ID do documento.' },
      },
    },
  },
  {
    name: 'register_order_payment',
    scope: 'payments:write',
    summary: 'Registrar Pagamento Recebido',
    description: 'Apresenta uma prévia do lançamento e atualiza o saldo e o histórico financeiro. Só registre após a pessoa confirmar o valor, o pedido e a forma de pagamento. Se precisar repetir a chamada, preserve os dados internamente; não explique esse procedimento à pessoa.',
    requestBody: {
      type: 'object',
      required: ['orderNumber', 'amount', 'method', 'idempotencyKey'],
      properties: {
        orderNumber: { type: 'string', description: 'Número do pedido ou ID do documento.' },
        amount: moneyInput('Valor recebido em reais.', { exclusiveMinimum: 0 }),
        method: { type: 'string', enum: ['pix', 'cash', 'credit', 'debit', 'transfer'], description: 'Forma de pagamento.' },
        notes: { type: 'string', maxLength: 300, description: 'Referência ou observação opcional.' },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.' },
        confirmed: { type: 'boolean', description: 'Use false para prévia. Use true somente depois que o usuário confirmar explicitamente o lançamento.' },
      },
    },
  },
  {
    name: 'create_customer',
    scope: 'customers:create',
    summary: 'Cadastrar Cliente',
    description: 'Apresenta uma prévia do cadastro. Só salve após mostrar os dados e receber confirmação explícita. Se já houver cliente com o telefone, use update_customer para editar o cadastro existente.',
    requestBody: {
      type: 'object',
      required: ['name', 'idempotencyKey'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 200, description: 'Nome completo do cliente.' },
        phone: { type: 'string', maxLength: 50, description: 'Telefone ou WhatsApp.' },
        email: { type: 'string', maxLength: 254, description: 'E-mail.' },
        street: { type: 'string', maxLength: 200, description: 'Rua ou avenida.' },
        number: { type: 'string', maxLength: 30, description: 'Número do endereço.' },
        complement: { type: 'string', maxLength: 100, description: 'Complemento.' },
        city: { type: 'string', maxLength: 100, description: 'Cidade.' },
        state: { type: 'string', maxLength: 50, description: 'Estado ou UF.' },
        zipCode: { type: 'string', maxLength: 20, description: 'CEP.' },
        notes: { type: 'string', maxLength: 1000, description: 'Observações sobre o atendimento.' },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.' },
        confirmed: { type: 'boolean', description: 'Use false para prévia. Use true somente depois que o usuário confirmar explicitamente o cadastro.' },
      },
    },
  },
  {
    name: 'update_customer',
    scope: 'customers:update',
    summary: 'Editar Cliente',
    description: 'Apresenta uma prévia das alterações. Só salve após mostrar os dados e receber confirmação explícita. Atualiza apenas campos fornecidos e preserva os demais.',
    requestBody: {
      type: 'object',
      required: ['customerId', 'idempotencyKey'],
      properties: {
        customerId: { type: 'string', description: 'ID retornado por query_customers.' },
        name: { type: 'string', minLength: 1, maxLength: 200, description: 'Novo nome.' },
        phone: { type: 'string', maxLength: 50, description: 'Novo telefone ou WhatsApp.' },
        email: { type: 'string', maxLength: 254, description: 'Novo e-mail.' },
        street: { type: 'string', maxLength: 200, description: 'Rua ou avenida.' },
        number: { type: 'string', maxLength: 30, description: 'Número do endereço.' },
        complement: { type: 'string', maxLength: 100, description: 'Complemento.' },
        city: { type: 'string', maxLength: 100, description: 'Cidade.' },
        state: { type: 'string', maxLength: 50, description: 'Estado ou UF.' },
        zipCode: { type: 'string', maxLength: 20, description: 'CEP.' },
        notes: { type: 'string', maxLength: 1000, description: 'Observações sobre o atendimento.' },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.' },
        confirmed: { type: 'boolean', description: 'Use false para prévia. Use true somente depois que o usuário confirmar explicitamente as alterações.' },
      },
    },
  },
  {
    name: 'search_gallery_portfolio',
    scope: 'gallery:read',
    summary: 'Consultar Portfólio / Acervo',
    description: 'Pesquisa itens e fotos produzidos no acervo do ateliê.',
    requestBody: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'Termo de busca (tema, tipo de peça ou técnica).',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Quantidade máxima (padrão 8).',
          default: 8,
        },
      },
    },
  },
  {
    name: 'get_user_summary',
    scope: 'team:read',
    summary: 'Auditar Desempenho da Equipe',
    description: 'Consulta pedidos e produtividade de um colaborador específico (restrito a administradores).',
    requestBody: {
      type: 'object',
      required: ['userIdentifier'],
      properties: {
        userIdentifier: {
          type: 'string',
          description: 'Nome, email ou identificador do colaborador.',
        },
      },
    },
  },
  {
    name: 'calculate_artisan_pricing',
    scope: 'pricing:estimate',
    summary: 'Calculadora de Precificação Avançada de Artesanato',
    description: 'Calcula sugestão de preço usando Markup sobre Custo ou Margem sobre Venda, insumos do estoque, horas de trabalho, custos fixos, taxa de pagamento e sugestão de sinal/entrada (30%, 50%, 100%).',
    requestBody: {
      type: 'object',
      required: ['productName', 'quantity'],
      properties: {
        productName: { type: 'string', description: 'Nome do produto artesanal ou encomenda.' },
        quantity: { type: 'integer', minimum: 1, maximum: 100000, description: 'Quantidade encomendada.' },
        pricingMode: { type: 'string', enum: ['margem', 'markup'], default: 'margem', description: 'Modo de precificação: margem (% de margem de lucro sobre o preço de venda - PADRÃO DO SISTEMA) ou markup (multiplicador sobre o custo).' },
        markupPercent: { type: 'number', minimum: 0, maximum: 1000, default: 100, description: 'Percentual de markup sobre o custo total (ex: 100% dobra o custo).' },
        profitMarginPercent: { type: 'number', minimum: 0, maximum: 95, default: 50, description: 'Percentual de margem de lucro sobre a venda.' },
        items: {
          type: 'array',
          description: 'Lista de insumos utilizados na composição do produto.',
          items: {
            type: 'object',
            required: ['name', 'quantity', 'unitCost'],
            properties: {
              name: { type: 'string', description: 'Nome do insumo ou matéria-prima.' },
              quantity: { type: 'number', minimum: 0.001, description: 'Quantidade consumida.' },
              unitCost: { type: 'number', minimum: 0, description: 'Custo unitário do insumo.' },
            },
          },
        },
        laborTimeMinutes: { type: 'number', minimum: 0, maximum: 60000, description: 'Tempo total de confecção em minutos.' },
        hourlyRate: { type: 'number', minimum: 0, maximum: 10000, description: 'Valor da hora de trabalho do artesão (R$/hora).' },
        paymentMethod: { type: 'string', enum: ['pix', 'cartao', 'dinheiro'], default: 'pix', description: 'Forma de pagamento prevista.' },
        depositOption: { type: 'string', enum: ['50', '30', '100', 'custom'], default: '50', description: 'Opção de sinal/entrada para início da confecção.' },
      },
    },
  },
  {
    name: 'list_supplies',
    scope: 'supplies:read',
    summary: 'Consultar Insumos & Estoque do Ateliê',
    description: 'Retorna matérias-primas e insumos cadastrados no estoque do ateliê com preço pago, custo unitário e estoque disponível.',
    requestBody: {
      type: 'object',
      properties: {
        searchTerm: { type: 'string', maxLength: 200, description: 'Filtro por nome ou categoria do insumo.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 50, description: 'Limite de insumos a retornar.' },
      },
    },
  },
  {
    name: 'list_pricing_models',
    scope: 'pricing:models:read',
    summary: 'Listar Modelos Salvos & Receitas',
    description: 'Lista modelos e receitas de composição salvas no ateliê para reutilização na calculadora.',
    requestBody: {
      type: 'object',
      properties: {
        searchTerm: { type: 'string', maxLength: 200, description: 'Filtro por nome do produto ou categoria.' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
    },
  },
  {
    name: 'get_pricing_model',
    scope: 'pricing:models:read',
    summary: 'Consultar Detalhes de Modelo Salvo',
    description: 'Obtém a composição completa de insumos, custos e parâmetro de margem/markup de um modelo de produto salvo.',
    requestBody: {
      type: 'object',
      required: ['modelId'],
      properties: {
        modelId: { type: 'string', description: 'ID do modelo/receita de precificação.' },
      },
    },
  },
  {
    name: 'save_pricing_model',
    scope: 'pricing:models:write',
    summary: 'Salvar ou Atualizar Modelo de Precificação',
    description: 'Cria ou atualiza uma receita/modelo de produto salvo com seus insumos e método de cálculo.',
    requestBody: {
      type: 'object',
      required: ['productName', 'idempotencyKey'],
      properties: {
        modelId: { type: 'string', description: 'ID para atualização. Se omitido, cria um novo modelo.' },
        productName: { type: 'string', minLength: 1, maxLength: 200, description: 'Nome da composição / modelo.' },
        category: { type: 'string', maxLength: 100, default: 'papelaria_festa' },
        pricingMethod: { type: 'string', enum: ['markup_on_cost', 'margin_on_sale'], default: 'markup_on_cost' },
        profitMarginPercent: { type: 'number', minimum: 0, maximum: 1000, default: 100 },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['supplyName', 'quantity', 'unitCost'],
            properties: {
              supplyId: { type: 'string' },
              supplyName: { type: 'string' },
              quantity: { type: 'number', minimum: 0.001 },
              unitCost: { type: 'number', minimum: 0 },
            },
          },
        },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.' },
        confirmed: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'query_quotes',
    scope: 'quotes:read',
    summary: 'Consultar Orçamentos Enviados',
    description: 'Pesquisa orçamentos formais por cliente, status (rascunho, enviado, pendente, aprovado, recusado/cancelado) ou termo de busca.',
    requestBody: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['all', 'draft', 'sent', 'pending', 'approved', 'rejected', 'cancelled', 'expired'], default: 'all' },
        searchTerm: { type: 'string', maxLength: 200, description: 'Nome do cliente ou número do orçamento (#ORC-...).' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
    },
  },
  {
    name: 'create_quote',
    scope: 'quotes:write',
    summary: 'Criar Novo Orçamento Formal',
    description: 'Gera e registra um orçamento formal com número sequencial (#ORC-0001), valor total, cálculo de entrada/sinal e parcelas.',
    requestBody: {
      type: 'object',
      required: ['customerName', 'productName', 'quantity', 'totalPrice', 'idempotencyKey'],
      properties: {
        customerName: { type: 'string', minLength: 1, maxLength: 200, description: 'Nome do cliente.' },
        customerPhone: { type: 'string', maxLength: 50, description: 'Telefone/WhatsApp do cliente.' },
        productName: { type: 'string', minLength: 1, maxLength: 500, description: 'Nome e itens da encomenda.' },
        quantity: { type: 'integer', minimum: 1, default: 1 },
        totalPrice: moneyInput('Valor total do orçamento.', { minimum: 0 }),
        depositPercentage: { type: 'number', minimum: 0, maximum: 100, default: 50, description: 'Percentual de entrada/sinal exigido.' },
        paymentMethod: { type: 'string', enum: ['pix', 'cartao', 'dinheiro'], default: 'pix' },
        validUntil: { type: 'string', maxLength: 10, description: 'Validade da proposta no formato AAAA-MM-DD.' },
        notes: { type: 'string', maxLength: 1000 },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.' },
        confirmed: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'update_quote_status',
    scope: 'quotes:write',
    summary: 'Atualizar Status do Orçamento',
    description: 'Altera o status de um orçamento (draft, sent, approved, rejected, cancelled, expired), ou converte o orçamento aprovado em pedido.',
    requestBody: {
      type: 'object',
      required: ['quoteNumber', 'status', 'idempotencyKey'],
      properties: {
        quoteNumber: { type: 'string', description: 'Número do orçamento (ex: #ORC-0001) ou ID.' },
        status: { type: 'string', enum: ['draft', 'sent', 'approved', 'rejected', 'cancelled', 'expired'] },
        convertToOrder: { type: 'boolean', default: false, description: 'Se true e status=approved, gera automaticamente o pedido na fila.' },
        deliveryDate: { type: 'string', maxLength: 10, description: 'Data de entrega caso o orçamento seja convertido em pedido.' },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Campo interno: gere e preencha em silêncio; nunca peça, mostre ou explique este valor à pessoa.' },
        confirmed: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'list_store_products',
    scope: 'store:read',
    summary: 'Consultar Produtos da Lojinha Virtual',
    description: 'Consulta o catálogo de produtos cadastrados na vitrine virtual / loja online.',
    requestBody: {
      type: 'object',
      properties: {
        searchTerm: { type: 'string', maxLength: 200 },
        category: { type: 'string', maxLength: 100 },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
    },
  },
];

// MCP publishes JSON Schema (2020-12), where exclusiveMinimum is numeric.
// OpenAPI 3.0.3 uses the older boolean form, so translate only in that output.
function toOpenApi30Schema(schema) {
  const converted = { ...schema };

  if (typeof converted.exclusiveMinimum === 'number') {
    converted.minimum = converted.exclusiveMinimum;
    converted.exclusiveMinimum = true;
  }
  if (typeof converted.exclusiveMaximum === 'number') {
    converted.maximum = converted.exclusiveMaximum;
    converted.exclusiveMaximum = true;
  }
  if (converted.properties && typeof converted.properties === 'object') {
    converted.properties = Object.fromEntries(
      Object.entries(converted.properties).map(([key, value]) => [key, toOpenApi30Schema(value)])
    );
  }
  if (converted.items && typeof converted.items === 'object') {
    converted.items = toOpenApi30Schema(converted.items);
  }
  if (Array.isArray(converted.anyOf)) {
    converted.anyOf = converted.anyOf.map((entry) => toOpenApi30Schema(entry));
  }

  return converted;
}

/**
 * Gera a especificação OpenAPI 3.0.3 dinâmica.
 * @param {string} baseUrl - URL base da Cloud Function
 * @param {string[]} [allowedScopes] - Se informado, filtra apenas as ferramentas autorizadas para a chave
 */
function buildOpenApiSchema(baseUrl, allowedScopes = null) {
  const paths = {};

  // Filtra as ferramentas se houver lista de escopos permitidos
  const filteredTools = TOOLS_METADATA.filter((tool) => {
    if (!allowedScopes) return true;
    if (allowedScopes.includes('*')) return true;
    return allowedScopes.includes(tool.scope);
  });

  filteredTools.forEach((tool) => {
    paths[`/tools/${tool.name}`] = {
      post: {
        operationId: tool.name,
        summary: tool.summary,
        description: `${tool.description} (Escopo necessário: ${tool.scope})`,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: Boolean(tool.requestBody && Array.isArray(tool.requestBody.required) && tool.requestBody.required.length > 0),
          content: {
            'application/x-www-form-urlencoded': {
              schema: toOpenApi30Schema({ ...tool.requestBody, additionalProperties: false }),
            },
            'application/json': {
              schema: toOpenApi30Schema({ ...tool.requestBody, additionalProperties: false }),
            },
          },
        },
        responses: {
          '200': {
            description: 'Operação executada com sucesso.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    tool: { type: 'string' },
                    timestamp: { type: 'string' },
                    summary: { type: 'string', description: 'Resumo amigável em linguagem natural pronto para exibir ao usuário sem jargões técnicos.' },
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Parâmetros inválidos.',
          },
          '401': {
            description: 'Não autenticado ou chave inválida.',
          },
          '403': {
            description: 'Permissão negada para esta ferramenta ou chave desativada.',
          },
          '429': {
            description: 'Limite de requisições excedido.',
          },
          '500': {
            description: 'Erro interno ao processar operação.',
          },
        },
      },
    };
  });

  return {
    openapi: '3.0.3',
    info: {
      title: 'Luisices - Copiloto de Ateliê (ChatGPT & MCP Tools)',
      description: 'API de ferramentas de negócio para consulta de pedidos, clientes, precificação e orçamentos do ateliê Luisices. DIRETRIZES DE COMUNICAÇÃO: Responda sempre em tom profissional, acolhedor e comercial de ateliê de papelaria afetiva, sem citar nomes técnicos de funções, chaves JSON, IDs internos ou status em inglês. Priorize o campo "summary" retornado em cada resposta para formular sua mensagem ao usuário de maneira fluida e amigável.',
      version: '1.0.0',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Servidor de Ferramentas Luisices',
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
    paths,
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key (lui_...)',
          description: 'Chave de acesso gerada no painel de configurações do Luisices (lui_dev_... ou lui_live_...).',
        },
      },
    },
  };
}

module.exports = {
  TOOLS_METADATA,
  buildOpenApiSchema,
};
