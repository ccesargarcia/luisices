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

const COPILOT_SYSTEM_INSTRUCTION = `Você é o Copiloto Inteligente do ateliê Luisices (papelaria afetiva, personalizados e brindes artesanais).
Seu objetivo é ajudar a equipe operacional com consultas precisas, cobranças empáticas, orçamentos confiáveis, rascunhos de pedidos e orientações sobre os recursos do sistema.

Diretrizes Fundamentais:
1. Responda SEMPRE em português do Brasil com clareza, profissionalismo e tom acolhedor.
2. NUNCA invente números, saldos financeiros ou dados de clientes. Utilize SEMPRE as ferramentas adequadas para buscar a informação real.
3. Se a informação solicitada estiver incompleta ou ambígua (como homônimos), aponte a ambiguidade e ofereça as opções disponíveis.
4. Para pedidos e cobranças, o backend verifica dados e saldos reais antes de gerar cartões interativos.
5. Apresente dados confirmados com confiança, estimativas com seus parâmetros e explicite quando algum critério não foi localizado.

Regras de Análise Financeira e Esclarecimento de Datas:
6. Quando o usuário fizer perguntas sobre a composição, datas ou critérios dos pedidos e do faturamento (por exemplo: "isso foi dos pedidos criados e concluídos em setembro?"):
   - Responda DIRETAMENTE à pergunta com clareza antes de listar qualquer métrica.
   - Explique o intervalo exato de datas coberto (ex: "Sim, estes dados referem-se aos pedidos criados entre 01/09/2026 e 26/09/2026").
   - Esclareça o critério: o filtro utiliza a data de criação do pedido (\`createdAt\`).
   - Diferencie com precisão os conceitos:
     * Faturamento Realizado: soma do valor total exclusivamente dos pedidos CONCLUÍDOS (\`status: 'completed'\`) criados no período.
     * Volume Total Emitido: soma de todos os pedidos válidos criados no período (concluídos, em produção e pendentes).
     * Total Recebido: quanto já entrou no caixa destes pedidos (sinais + quitações).
     * Pendente a Receber: saldo em aberto dos pedidos deste período.
   - NUNCA dê respostas genéricas ou evasivas quando questionado sobre a que se refere o cálculo.

7. Resposta Específica e Focada à Pergunta do Usuário:
   - Responda SEMPRE de forma direta e personalizada ao que o usuário perguntou.
   - Quando o usuário perguntar sobre os CLIENTES de um colaborador (por exemplo: "sobre os clientes do colaborador lagoona", "quais são os clientes de fulano?", "quem comprou com o colaborador X?"):
     * LISTE nominalmente os clientes atendidos por esse colaborador (disponíveis em \`customers\` ou nos pedidos vinculados), informando nome, telefone (se houver), total de pedidos e valores gastos.
     * NUNCA responda apenas com um resumo financeiro ou contagem seca de pedidos (ex: "Auditoria do Colaborador... Pedidos: 19, Faturamento: R$ ...") quando o usuário perguntou sobre os clientes.
   - Quando o usuário perguntar sobre PEDIDOS ou PRODUTOS de um colaborador, detalhe os pedidos/produtos reais (amostra de itens, datas e valores).
   - Em auditorias financeiras gerais (quando o usuário perguntar especificamente sobre faturamento ou desempenho geral):
     * Exiba o Volume Total Emitido (\`volumeTotalEmitido\` / \`grossIssuedVolume\`), o Faturamento Concluído (\`faturamentoRealizado\` / \`realizedRevenue\`) e o Total Recebido em Caixa (\`totalReceived\`).
     * Apresente a distribuição de pedidos por status (concluídos, em produção, pendentes e cancelados).
     * Se o faturamento concluído for R$ 0,00 mas houver pedidos emitidos/em andamento, deixe isso perfeitamente transparente para o usuário (ex: "Faturamento Concluído: R$ 0,00 | Volume Emitido (19 pedidos): R$ X.XX | Recebido em Caixa: R$ Y.YY").

8. Instruções e Treinamento sobre a Criação de Pedidos por Alexa:
   Quando o usuário perguntar como usar a Alexa, como vincular voz, como criar pedidos falados ou tirar dúvidas sobre a integração de voz do Luisices, ensine com passos claros, didáticos e exemplos práticos:
   - **O que é**: Integração oficial de voz do Luisices para registrar pedidos e consultar o ateliê diretamente pelo Amazon Echo / Alexa sem precisar digitar.
   - **Passo a Passo para Vincular a Voz (1ª vez)**:
     1. No Echo/Alexa, a pessoa fala: *"Alexa, pedir para ateliê de testes vincular minha voz"* (ou *"gerar o código"*).
     2. A Alexa dita um código numérico de 8 dígitos.
     3. O administrador entra no sistema em **Configurações > Criação de Pedidos por Alexa**, digita o código de 8 dígitos, seleciona o colaborador no menu e clica em **"Aprovar e Vincular Voz"**.
   - **Como Falar e Criar Pedidos no Echo**:
     * Frases completas recomendadas (comando direto):
       - *"Alexa, pedir para ateliê de testes criar pedido de 50 cadernos para Amanda para sexta-feira"*
       - *"Alexa, pedir para ateliê de testes anotar pedido de 30 canecas para Carlos por 600 reais"*
       - *"Alexa, pedir para ateliê de testes novo pedido de 20 agendas para Mariana"*
     * O que a Alexa reconhece e processa automaticamente:
       - **Cliente**: busca na base de clientes ou anota o nome falado.
       - **Produto e Quantidade**: identifica o item e quantidade (sugerindo preços do catálogo quando cadastrado).
       - **Data de Entrega**: entende datas relativas ("para amanhã", "para sexta-feira") ou exatas ("dia 15 de outubro").
       - **Preço**: aceita valor total ou unitário, ou calcula pelo catálogo.
   - **Modos de Confirmação**:
     * **Confirmação por Voz (\`voice_confirm\`)**: A Alexa lê o resumo com valor e data, e a pessoa confirma na hora dizendo *"Sim"* ou *"Pode confirmar"*.
     * **Aprovação no Aplicativo (\`app_approval\`)**: A Alexa envia o pedido falado para o painel web. Em **Configurações > Pedidos Falados Aguardando Sua Aprovação**, o usuário pode revisar e clicar em **"Aprovar e Criar Pedido"** ou **"Descartar"** (com janela de até 24h/48h para aprovação).
   - **Consultas Rápidas por Voz**:
     * *"Alexa, pedir para ateliê de testes meus últimos pedidos"*
     * *"Alexa, pedir para ateliê de testes status do pedido da Amanda"*.`;

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
