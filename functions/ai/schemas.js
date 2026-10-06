/**
 * Schemas e Declarações de Ferramentas para a API Gemini - Luisices
 */

const TOOLS_DECLARATIONS = [
  {
    name: 'extract_order_draft',
    description: 'Extrai informações de uma encomenda solicitada pelo cliente e monta um rascunho de pedido.',
    parameters: {
      type: 'OBJECT',
      properties: {
        customerName: { type: 'STRING', description: 'Nome do cliente' },
        customerPhone: { type: 'STRING', description: 'Telefone/WhatsApp do cliente' },
        productSummary: { type: 'STRING', description: 'Descrição resumida do item' },
        quantity: { type: 'NUMBER', description: 'Quantidade de peças' },
        totalPrice: { type: 'NUMBER', description: 'Valor total do pedido' },
        paidAmount: { type: 'NUMBER', description: 'Valor já pago (sinal)' },
        deliveryDate: { type: 'STRING', description: 'Data prometida de entrega (AAAA-MM-DD)' },
        theme: { type: 'STRING', description: 'Tema da festa ou personalização' },
        notes: { type: 'STRING', description: 'Observações de acabamento e produção' },
      },
      required: ['customerName', 'productSummary'],
    },
  },
  {
    name: 'generate_whatsapp_message',
    description: 'Prepara rascunho de mensagem para WhatsApp de cobrança de saldo, aviso de pedido pronto ou confirmação.',
    parameters: {
      type: 'OBJECT',
      properties: {
        recipientName: { type: 'STRING', description: 'Nome do cliente' },
        recipientPhone: { type: 'STRING', description: 'Telefone/WhatsApp do cliente' },
        orderNumber: { type: 'STRING', description: 'Número do pedido ou ID' },
        messageType: {
          type: 'STRING',
          enum: ['cobranca_saldo', 'pedido_pronto', 'confirmacao_pedido', 'lembrete_geral'],
          description: 'Tipo da mensagem',
        },
        customText: { type: 'STRING', description: 'Texto da mensagem a ser revisada' },
      },
      required: ['recipientName'],
    },
  },
  {
    name: 'query_customers',
    description: 'Pesquisa clientes no sistema por nome, telefone, cidade ou colaborador responsável.',
    parameters: {
      type: 'OBJECT',
      properties: {
        searchTerm: { type: 'STRING', description: 'Termo de busca (nome, telefone, cidade ou nome/email do colaborador)' },
        userIdentifier: { type: 'STRING', description: 'Filtrar clientes atendidos por um colaborador específico' },
        limit: { type: 'NUMBER', description: 'Limite de registros (padrão 15)' },
      },
    },
  },
  {
    name: 'calculate_pricing_estimate',
    description: 'Calcula estimativa de preço de venda e custos para um personalizado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productName: { type: 'STRING', description: 'Nome do produto' },
        quantity: { type: 'NUMBER', description: 'Quantidade de peças' },
        unitCostRaw: { type: 'NUMBER', description: 'Custo de matéria-prima por unidade' },
        customizationCost: { type: 'NUMBER', description: 'Custo de personalização/acabamento' },
        laborTimeMinutes: { type: 'NUMBER', description: 'Tempo de montagem em minutos' },
        setupTimeMinutes: { type: 'NUMBER', description: 'Tempo fixo de setup da arte em minutos' },
        profitMarginPercent: { type: 'NUMBER', description: 'Margem de lucro desejada (%)' },
      },
      required: ['productName'],
    },
  },
  {
    name: 'daily_briefing',
    description: 'Gera o resumo operacional do dia: atrasos, entregas de hoje e pedidos em produção.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_user_summary',
    description: 'Consulta colaboradores, equipe, lista de clientes atendidos, pedidos e desempenho por colaborador (exclusivo para administradores).',
    parameters: {
      type: 'OBJECT',
      properties: {
        userIdentifier: { type: 'STRING', description: 'Nome ou e-mail do colaborador' },
      },
    },
  },
  {
    name: 'get_financial_summary',
    description: 'Consulta faturamento, recebimentos, pendências e métricas financeiras por período ou mês específico.',
    parameters: {
      type: 'OBJECT',
      properties: {
        period: {
          type: 'STRING',
          description: 'Período desejado: "today", "yesterday", "week", "month" (mês atual), "last_month" (mês anterior), "year", "all" ou o nome/chave de um mês específico (ex: "setembro", "2026-09", "agosto").',
        },
        userIdentifier: { type: 'STRING', description: 'Filtrar por colaborador específico (admin)' },
      },
    },
  },
  {
    name: 'query_orders_view',
    description: 'Pesquisa pedidos por cliente, número, status ou termo de busca.',
    parameters: {
      type: 'OBJECT',
      properties: {
        searchTerm: { type: 'STRING', description: 'Cliente, número do pedido ou produto' },
        status: {
          type: 'STRING',
          enum: ['all', 'pending', 'in-progress', 'completed', 'cancelled'],
          description: 'Filtrar por status',
        },
        limit: { type: 'NUMBER', description: 'Limite de pedidos a retornar' },
      },
    },
  },
  {
    name: 'search_gallery_portfolio',
    description: 'Pesquisa projetos reais e fotos na galeria do ateliê.',
    parameters: {
      type: 'OBJECT',
      properties: {
        searchTerm: { type: 'STRING', description: 'Tema, categoria ou material da arte' },
        category: { type: 'STRING', description: 'Categoria específica' },
        limit: { type: 'NUMBER', description: 'Quantidade máxima de fotos' },
      },
    },
  },
];

const COPILOT_SYSTEM_INSTRUCTION = `# PAPEL & MISSÃO
Você é o Copiloto Inteligente do ateliê Luisices (papelaria afetiva, personalizados e brindes artesanais).
Auxilie a equipe operacional com consultas precisas, cobranças empáticas, orçamentos confiáveis, rascunhos de pedidos e suporte aos recursos do sistema.

# GUARDRAILS INVIOLÁVEIS (ZERO ALUCINAÇÃO)
1. Integridade Absoluta: NUNCA invente números, valores, saldos, datas, clientes ou status. Toda informação real DEVE vir das ferramentas integradas.
2. Tratamento de Ambiguidade: Se houver homônimos ou dados incompletos, aponte a ambiguidade e apresente as opções disponíveis.
3. Tom & Idioma: Português do Brasil, claro, profissional, acolhedor e direto ao ponto.

# DOMÍNIO FINANCEIRO & CRITÉRIOS DE DATAS
- Ao responder sobre composição de faturamento, datas ou cálculos:
  * Responda DIRETAMENTE à pergunta antes de expor métricas adicionais.
  * Especifique o período exato filtrado pela data de criação do pedido (\`createdAt\`).
  * Mantenha distinção rigorosa dos conceitos:
    - Faturamento Realizado: soma do valor total EXCLUSIVAMENTE dos pedidos CONCLUÍDOS (\`status: 'completed'\`) criados no período.
    - Volume Total Emitido: soma de TODOS os pedidos válidos criados no período (concluídos, em produção e pendentes).
    - Total Recebido: valores já quitados em caixa (sinais + quitações).
    - Pendente a Receber: saldo em aberto no período.
  * Se o Faturamento Concluído for R$ 0,00 mas houver pedidos em andamento, explicite com transparência (ex: "Faturamento Concluído: R$ 0,00 | Volume Emitido (X pedidos): R$ ... | Recebido: R$ ...").
  * NUNCA dê respostas evasivas sobre a base de cálculo.

# CONSULTAS DE EQUIPE & CLIENTES
- Ao perguntar sobre os CLIENTES de um colaborador (ex: "clientes do colaborador lagoona", "quem comprou com fulano?"):
  * LISTE NOMINALMENTE cada cliente atendido (nome, telefone se houver, total de pedidos e valores gastos).
  * NUNCA responda apenas com contagem seca ou resumo numérico quando a pergunta for sobre clientes.
- Ao perguntar sobre PEDIDOS ou PRODUTOS de um colaborador: detalhe os itens reais, datas e valores.
- Em auditorias financeiras gerais: apresente Volume Emitido, Faturamento Concluído, Total Recebido e distribuição por status (concluídos, em produção, pendentes e cancelados).

# GUIA OFICIAL ALEXA (VOZ & ECHOS)
Quando o usuário perguntar como usar a Alexa, criar pedidos ou parear voz:
- Invocação Oficial: *"Alexa, pedir para ateliê de testes..."*
- Pareamento Inicial (1ª vez):
  1. No Echo: a pessoa diz *"Alexa, pedir para ateliê de testes vincular minha voz"* (ou *"gerar o código"*).
  2. A Alexa dita um código numérico de 8 dígitos.
  3. O admin acessa no sistema **Configurações > Criação de Pedidos por Alexa**, digita o código, seleciona o colaborador e clica em **"Aprovar e Vincular Voz"**.
- Como Falar Pedidos (Comandos Diretos):
  * Ex: *"Alexa, pedir para ateliê de testes criar pedido de 50 cadernos para Amanda para sexta-feira"* ou *"Alexa, pedir para ateliê de testes anotar pedido de 30 canecas para Carlos por 600 reais"*.
  * Captura automática: Cliente, Produto/Qtd (com sugestão de preço do catálogo), Data de Entrega e Valor.
- Modos de Confirmação:
  * **Voz (\`voice_confirm\`)**: Alexa resume o pedido e a pessoa confirma na hora dizendo *"Sim"* ou *"Pode confirmar"*.
  * **App (\`app_approval\`)**: Enviado para o app; usuário revisa em **Configurações > Pedidos Falados Aguardando Sua Aprovação** e clica em **"Aprovar e Criar Pedido"** ou **"Descartar"** (com janela de até 24h/48h para aprovação).
- Consultas Rápidas: *"Alexa, pedir para ateliê de testes meus últimos pedidos"* ou *"status do pedido da Amanda"*.

# PADRÃO DE RESPOSTA
- Formatação em Markdown limpo e legível.
- Valores monetários sempre formatados em Real (R$ 0,00).
- Sem introduções ou despedidas prolixas; foco em resolutividade e agilidade.`;

const GALLERY_VISION_PROMPT = `Você é um especialista em catálogo de artigos personalizados, papelaria e brindes da marca Luisices.
Analise a imagem da arte produzida e retorne ESTRITAMENTE em formato JSON puro:
{
  "titleSuggested": "Título comercial conciso e descritivo",
  "aiDescription": "Descrição comercial rica em 2-3 frases destacando detalhes visuais, acabamento e ocasiões",
  "productType": "Tipo de produto (ex: Topo de Bolo, Caixinha Milk, Sacola Kraft, Caneca, etc.)",
  "colors": ["Cor 1", "Cor 2"],
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

const STORE_PRODUCT_VISION_PROMPT = `Você é um especialista em e-commerce e papelaria personalizada da Luisices.
Analise a foto do produto e gere o cadastro completo para a lojinha em JSON puro:
{
  "name": "Nome comercial atraente",
  "category": "Categoria sugerida",
  "description": "Texto completo formatado com seções, tópicos e emojis para o catálogo",
  "leadTimeDays": 5,
  "badge": "Lançamento, Mais Vendido ou Personalizado",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;

module.exports = {
  TOOLS_DECLARATIONS,
  COPILOT_SYSTEM_INSTRUCTION,
  GALLERY_VISION_PROMPT,
  STORE_PRODUCT_VISION_PROMPT,
};
