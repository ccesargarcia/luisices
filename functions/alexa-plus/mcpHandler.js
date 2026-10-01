/**
 * Processador de Protocolo MCP (Model Context Protocol) JSON-RPC 2.0.
 * Conecta o orquestrador do Alexa+ às ferramentas de negócio do Luisices.
 */

const { MCP_TOOLS, handleToolCall } = require('./tools');

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = {
  name: 'luisices-alexa-plus-addon',
  version: '1.0.0',
  description: 'Add-on oficial do Ateliê Luisices para criação de pedidos, consulta de preços e gestão no Alexa+.',
};

/**
 * Processa uma única mensagem JSON-RPC 2.0 do protocolo MCP
 */
async function processMcpMessage(message, context = {}) {
  if (!message || typeof message !== 'object') {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request: Payload deve ser um objeto JSON.' },
    };
  }

  const { jsonrpc, id, method, params } = message;

  // 1. Suporte a Ping
  if (method === 'ping') {
    return { jsonrpc: '2.0', id: id !== undefined ? id : null, result: {} };
  }

  // 2. Handshake / Inicialização MCP
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: id !== undefined ? id : null,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: {
            listChanged: false,
          },
          resources: {},
          prompts: {},
        },
        serverInfo: SERVER_INFO,
      },
    };
  }

  // 3. Notificação pós-inicialização
  if (method === 'notifications/initialized') {
    return null; // Notificações JSON-RPC não retornam resposta
  }

  // 4. Listagem de ferramentas disponíveis
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: id !== undefined ? id : null,
      result: {
        tools: MCP_TOOLS,
      },
    };
  }

  // 5. Execução de Ferramenta (`tools/call`)
  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    if (!toolName || typeof toolName !== 'string') {
      return {
        jsonrpc: '2.0',
        id: id !== undefined ? id : null,
        error: { code: -32602, message: 'Parâmetro inválido: "name" da ferramenta é obrigatório.' },
      };
    }

    try {
      const data = await handleToolCall(toolName, toolArgs, context);
      const textMessage = data?.message || (typeof data === 'string' ? data : JSON.stringify(data));

      return {
        jsonrpc: '2.0',
        id: id !== undefined ? id : null,
        result: {
          content: [
            {
              type: 'text',
              text: textMessage,
            },
          ],
          isError: false,
          data,
        },
      };
    } catch (err) {
      console.warn(`[AlexaPlusMcp] Erro ao executar ferramenta "${toolName}":`, err.message);
      return {
        jsonrpc: '2.0',
        id: id !== undefined ? id : null,
        result: {
          content: [
            {
              type: 'text',
              text: `Erro ao executar ${toolName}: ${err.message}`,
            },
          ],
          isError: true,
          error: err.message,
        },
      };
    }
  }

  // Método não suportado
  return {
    jsonrpc: '2.0',
    id: id !== undefined ? id : null,
    error: { code: -32601, message: `Method not found: Método "${method}" não é suportado pelo servidor MCP.` },
  };
}

/**
 * Handler principal HTTP do endpoint MCP
 */
async function handleMcpHttpRequest(req, res, context = {}) {
  // Configura cabeçalhos de CORS e JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Origin-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // GET: Health check e metadados rápidos
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      server: SERVER_INFO,
      protocolVersion: PROTOCOL_VERSION,
      availableTools: MCP_TOOLS.map((t) => t.name),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Method Not Allowed: Utilize POST para requisições MCP.' },
    });
  }

  const payload = req.body;

  // Suporte a lote (batch) de mensagens JSON-RPC
  if (Array.isArray(payload)) {
    const responses = [];
    for (const msg of payload) {
      const resp = await processMcpMessage(msg, context);
      if (resp !== null) {
        responses.push(resp);
      }
    }
    return res.status(200).json(responses);
  }

  // Requisição única
  const response = await processMcpMessage(payload, context);
  if (response === null) {
    return res.status(204).end();
  }

  return res.status(200).json(response);
}

module.exports = {
  PROTOCOL_VERSION,
  SERVER_INFO,
  processMcpMessage,
  handleMcpHttpRequest,
};
