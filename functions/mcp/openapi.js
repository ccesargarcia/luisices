/**
 * Gerador Dinâmico da Especificação OpenAPI 3.0.3 para Plugins ChatGPT.
 */

const { TOOL_SCOPE_MAP, MCP_SCOPES } = require('./constants');

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
        totalPrice: {
          type: 'number',
          minimum: 0,
          maximum: 10000000,
          description: 'Valor total acertado.',
        },
        paidAmount: { type: 'number', minimum: 0, maximum: 10000000, description: 'Valor já pago, se informado.' },
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
    description: 'Fluxo seguro de criação: primeiro chame com confirmed=false, mostre a prévia e peça confirmação explícita; após o usuário confirmar, chame novamente com os mesmos dados e confirmed=true. Não trate bloqueio, prévia ou erro como gravação concluída; só informe sucesso quando o backend retornar success=true, orderId e orderNumber. Gere e preserve a mesma idempotencyKey nas duas chamadas. Não envie paidAmount nem paymentMethod salvo se o usuário disser explicitamente que já recebeu um sinal; informar pagamento inicial também exige o escopo payments:write. Gera número sequencial (#AAAA-0001), calcula o saldo e define o status como pendente.',
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
        totalPrice: {
          type: 'number',
          description: 'Valor total do pedido em reais (ex: 210.00).',
          minimum: 0,
          maximum: 10000000,
        },
        paidAmount: {
          type: 'number',
          description: 'Valor de entrada ou sinal efetivamente já recebido (ex: 100.00). Omita se não houve pagamento; exige payments:write.',
          default: 0,
          maximum: 10000000,
        },
        paymentMethod: {
          type: 'string',
          enum: ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia', 'outro'],
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
          description: 'Identificador único da operação gerado internamente pelo assistente (ex: UUID ou timestamp único). Não exponha esta chave técnica ao usuário.',
        },
        confirmed: {
          type: 'boolean',
          description: 'Obrigatório no fluxo conversacional: false retorna prévia sem gravar; true grava após confirmação explícita do usuário. Preserve os demais dados e a idempotencyKey entre as chamadas.',
        },
      },
    },
  },
  {
    name: 'get_order_edit_form',
    scope: 'orders:update',
    summary: 'Formulário para Editar Pedido',
    description: 'Carrega um formulário interativo para revisar e editar dados operacionais e o valor de um pedido. Aceita o número visível do pedido com ou sem # ou o ID interno. O valor pode ser informado como total do pedido ou preço unitário; neste caso o total é calculado pela quantidade. A gravação sempre exige prévia, confirmação explícita, versão atual e chave de idempotência.',
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
    description: 'Aceita número do pedido com ou sem # ou ID interno. Mostra uma prévia das alterações. Só grave após apresentar os campos ao usuário e receber confirmação explícita, repetindo os mesmos dados, expectedVersion e idempotencyKey com confirmed=true. Pode alterar dados operacionais e valor total ou unitário; o preço unitário é multiplicado pela quantidade final. Não registra nem altera pagamentos recebidos.',
    requestBody: {
      type: 'object',
      required: ['orderNumber'],
      properties: {
        orderNumber: { type: 'string', description: 'Número do pedido, por exemplo #2026-0042, ou ID do documento.' },
        customerName: { type: 'string', maxLength: 200, description: 'Novo nome do cliente, se for alterar.' },
        customerPhone: { type: 'string', maxLength: 50, description: 'Novo telefone/WhatsApp, se for alterar.' },
        productName: { type: 'string', maxLength: 300, description: 'Nova descrição do produto.' },
        quantity: { type: 'integer', minimum: 1, maximum: 10000, description: 'Nova quantidade.' },
        totalPrice: { type: 'number', minimum: 0, maximum: 10000000, description: 'Novo valor total do pedido em reais. Informe este campo OU unitPrice, nunca ambos.' },
        unitPrice: { type: 'number', minimum: 0, maximum: 1000000, description: 'Novo valor por unidade em reais. O backend calcula o total multiplicando pela quantidade final do pedido. Informe este campo OU totalPrice, nunca ambos.' },
        deliveryDate: { type: 'string', description: 'Novo prazo no formato AAAA-MM-DD ou DD/MM/AAAA.' },
        theme: { type: 'string', maxLength: 200, description: 'Novo tema do pedido.' },
        notes: { type: 'string', maxLength: 1000, description: 'Novas observações de produção.' },
        expectedVersion: { type: 'integer', minimum: 1, description: 'Versão obtida no formulário/consulta. Obrigatória ao alterar.' },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Chave única obrigatória ao alterar. Reutilize a mesma chave em caso de repetição.' },
        confirmed: { type: 'boolean', description: 'Use false para prévia. Use true somente depois que o usuário confirmar explicitamente as alterações apresentadas.' },
      },
    },
  },
  {
    name: 'update_order_status',
    scope: 'orders:update',
    summary: 'Atualizar Etapa de Produção',
    description: 'Avança pedido entre pendente, em produção e concluído. Retorna prévia e só grava com confirmação explícita, versão atual e chave de idempotência. Cancelamentos e reaberturas ficam fora deste fluxo.',
    requestBody: {
      type: 'object',
      required: ['orderNumber', 'status', 'expectedVersion', 'idempotencyKey'],
      properties: {
        orderNumber: { type: 'string', minLength: 1, maxLength: 128 },
        status: { type: 'string', enum: ['in-progress', 'completed'], description: 'Etapa de destino. O servidor valida a transição com o estado atual.' },
        expectedVersion: { type: 'integer', minimum: 1 },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$' },
        confirmed: { type: 'boolean', description: 'Use false para prévia e true somente após confirmação explícita.' },
      },
    },
  },
  {
    name: 'update_delivery_details',
    scope: 'orders:update',
    summary: 'Alterar Data ou Observação de Entrega',
    description: 'Apresenta prévia de uma alteração de entrega e só grava após confirmação, com controle de versão e idempotência.',
    requestBody: {
      type: 'object',
      required: ['orderNumber', 'expectedVersion', 'idempotencyKey'],
      properties: {
        orderNumber: { type: 'string', minLength: 1, maxLength: 128 },
        deliveryDate: { type: 'string', minLength: 10, maxLength: 10, description: 'Nova data (AAAA-MM-DD).' },
        notes: { type: 'string', maxLength: 1000, description: 'Observação operacional opcional da entrega.' },
        expectedVersion: { type: 'integer', minimum: 1 },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$' },
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
    description: 'Apresenta uma prévia do lançamento e atualiza o saldo e o histórico financeiro. Só registre após o usuário confirmar explicitamente o valor, pedido e forma de pagamento. Reenvie o mesmo idempotencyKey em caso de repetição da chamada.',
    requestBody: {
      type: 'object',
      required: ['orderNumber', 'amount', 'method', 'idempotencyKey'],
      properties: {
        orderNumber: { type: 'string', description: 'Número do pedido ou ID do documento.' },
        amount: { type: 'number', exclusiveMinimum: 0, description: 'Valor recebido em reais.' },
        method: { type: 'string', enum: ['pix', 'cash', 'credit', 'debit', 'transfer'], description: 'Forma de pagamento.' },
        notes: { type: 'string', maxLength: 300, description: 'Referência ou observação opcional.' },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Identificador único da operação. Mantenha o mesmo valor se a chamada for repetida.' },
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
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Chave única da operação. Reutilize a mesma chave em caso de repetição.' },
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
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$', description: 'Chave única da operação. Reutilize a mesma chave em caso de repetição.' },
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
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$' },
        confirmed: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'query_quotes',
    scope: 'quotes:read',
    summary: 'Consultar Orçamentos Enviados',
    description: 'Pesquisa orçamentos formais por cliente, status (pendente, aprovado, cancelado) ou termo de busca.',
    requestBody: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['all', 'pending', 'approved', 'cancelled', 'rejected'], default: 'all' },
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
        totalPrice: { type: 'number', minimum: 0, description: 'Valor total do orçamento.' },
        depositPercentage: { type: 'number', minimum: 0, maximum: 100, default: 50, description: 'Percentual de entrada/sinal exigido.' },
        paymentMethod: { type: 'string', enum: ['pix', 'cartao', 'dinheiro'], default: 'pix' },
        validUntil: { type: 'string', maxLength: 10, description: 'Validade da proposta no formato AAAA-MM-DD.' },
        notes: { type: 'string', maxLength: 1000 },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$' },
        confirmed: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'update_quote_status',
    scope: 'quotes:write',
    summary: 'Atualizar Status do Orçamento',
    description: 'Altera o status de um orçamento para aprovado ou cancelado, ou converte o orçamento aprovado em pedido.',
    requestBody: {
      type: 'object',
      required: ['quoteNumber', 'status', 'idempotencyKey'],
      properties: {
        quoteNumber: { type: 'string', description: 'Número do orçamento (ex: #ORC-0001) ou ID.' },
        status: { type: 'string', enum: ['approved', 'cancelled', 'rejected'] },
        convertToOrder: { type: 'boolean', default: false, description: 'Se true e status=approved, gera automaticamente o pedido na fila.' },
        deliveryDate: { type: 'string', maxLength: 10, description: 'Data de entrega caso o orçamento seja convertido em pedido.' },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]{8,128}$' },
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
      description: 'API de ferramentas de negócio para consulta de pedidos, clientes, precificação e orçamentos do ateliê Luisices.',
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
