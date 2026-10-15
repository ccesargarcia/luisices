# 📄 Documentação Oficial da API de Integração: ChatGPT Actions & Model Context Protocol (MCP)

**Sistema:** Luisices — Gestão Integrada de Ateliê de Papelaria Personalizada  
**Módulo:** `functions/mcp` & `functions/ai`  
**Versão da API:** `1.0.0`  
**Padrões Suportados:** OpenAPI 3.0.3, MCP JSON-RPC 2.0, OAuth 2.1 (RFC 9728 / RFC 8414)
**Ambiente de Produção:** `https://api.luisices.com.br/chatGptToolsEndpoint`  
**Ambiente de Desenvolvimento:** `https://api.dev.luisices.com.br/chatGptToolsEndpoint`  

---

## 📑 Sumário

1. [Visão Geral e Arquitetura](#1-visão-geral-e-arquitetura)
2. [Desenhos de Arquitetura e Fluxos (Diagramas)](#2-desenhos-de-arquitetura-e-fluxos-diagramas)
3. [Segurança, Autenticação e Autorização](#3-segurança-autenticação-e-autorização)
4. [Endpoints de Descoberta e Infraestrutura](#4-endpoints-de-descoberta-e-infraestrutura)
5. [Catálogo Detalhado de Ferramentas (Tools)](#5-catálogo-detalhado-de-ferramentas-tools)
   * [1. query_orders_view (Consultar Fila de Pedidos)](#1-query_orders_view)
   * [2. daily_briefing (Raio-X Operacional do Dia)](#2-daily_briefing)
   * [3. query_customers (Consultar Clientes)](#3-query_customers)
   * [4. get_financial_summary (Resumo Financeiro & DRE)](#4-get_financial_summary)
   * [5. calculate_pricing_estimate (Calculadora de Precificação)](#5-calculate_pricing_estimate)
   * [6. generate_whatsapp_message (Rascunho WhatsApp)](#6-generate_whatsapp_message)
   * [7. get_order_form (Formulário Estruturado de Pedido)](#7-get_order_form)
   * [8. extract_order_draft (Montar Rascunho de Pedido)](#8-extract_order_draft)
   * [9. create_order (Criar e Registrar Pedido Oficial)](#9-create_order)
   * [10. search_gallery_portfolio (Consultar Portfólio/Acervo)](#10-search_gallery_portfolio)
   * [11. get_user_summary (Desempenho de Colaboradores)](#11-get_user_summary)
6. [Suporte Nativo ao Protocolo MCP (JSON-RPC 2.0)](#6-suporte-nativo-ao-protocolo-mcp-json-rpc-20)
7. [Tabela de Erros HTTP e Tratamento](#7-tabela-de-erros-http-e-tratamento)
8. [Massa de Dados Fictícios e Guia de Testes](#8-massa-de-dados-fictícios-e-guia-de-testes)

---

## 1. Visão Geral e Arquitetura

O módulo de integração **ChatGPT Actions & MCP** do Luisices transforma a inteligência artificial da OpenAI e de clientes MCP (Cursor, Claude Desktop, assistentes autônomos) em um **copiloto operacional em tempo real** para o ateliê.

A API permite realizar consultas de estoque, fila de produção, relatórios financeiros, cálculo de precificação com margem de lucro, geração de mensagens personalizadas e criação de pedidos oficiais diretamente a partir de comandos em linguagem natural.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENTES EXTERNOS                              │
│  ┌───────────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│  │ ChatGPT Custom GPTs   │   │ Claude Desktop  │   │ Cursor IDE /    │  │
│  │ (OpenAPI / Actions)   │   │ (MCP JSON-RPC)  │   │ Agentes MCP     │  │
│  └───────────┬───────────┘   └────────┬────────┘   └────────┬────────┘  │
└──────────────┼────────────────────────┼─────────────────────┼───────────┘
               │ OAuth 2.1 / Bearer     │ MCP JSON-RPC 2.0    │ REST / POST
               ▼                        ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       CLOUDFLARE EDGE WORKER                            │
│           (Injeção de Cabeçalhos de Segurança & WAF Rate-Limit)          │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ x-origin-secret
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               FIREBASE CLOUD FUNCTIONS v2 (Node.js 22)                  │
│                      chatGptToolsEndpoint                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. Origin Protection & Autenticação (validador de Chaves/Tokens)   │  │
│  │ 2. Router Dinâmico (OAuth 2.1, OpenAPI Spec, MCP RPC, REST)        │  │
│  │ 3. Validador Granular de Escopos (MCP_SCOPES) & RBAC               │  │
│  │ 4. Executores de Ferramentas (AiToolsExecutor / Idempotency)       │  │
│  │ 5. Gravação de Logs de Auditoria Assíncronos (mcpAuditLogs)        │  │
│  └────────────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           FIREBASE FIRESTORE                            │
│      [orders] [customers] [mcpApiKeys] [mcpAuditLogs] [products]        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Desenhos de Arquitetura e Fluxos (Diagramas)

### 2.1 Fluxo de Autenticação OAuth 2.1 / PKCE no ChatGPT Actions

```
┌───────────┐                ┌────────────────────────┐              ┌──────────────────────┐
│  ChatGPT  │                │ Luisices OAuth Server  │              │  Usuário / Ateliê    │
└─────┬─────┘                └───────────┬────────────┘              └──────────┬───────────┘
      │                                  │                                      │
      │  1. GET /.well-known/oauth-authorization-server                         │
      ├─────────────────────────────────>│                                      │
      │  2. Retorna Metadados (authorize, token, scopes)                        │
      │<─────────────────────────────────┤                                      │
      │                                  │                                      │
      │  3. POST /oauth/register (Dynamic Client Registration)                  │
      ├─────────────────────────────────>│                                      │
      │  4. Retorna client_id                                                   │
      │<─────────────────────────────────┤                                      │
      │                                  │                                      │
      │  5. Redireciona para /oauth/authorize?response_type=code...             │
      ├────────────────────────────────────────────────────────────────────────>│
      │                                  │  6. Exibe tela de login & aceite     │
      │                                  │<─────────────────────────────────────┤
      │  7. Redireciona com authorization_code                                  │
      │<────────────────────────────────────────────────────────────────────────┤
      │                                  │                                      │
      │  8. POST /oauth/token (code + code_verifier PKCE)                       │
      ├─────────────────────────────────>│                                      │
      │  9. Emite access_token opaco / Bearer                                     │
      │<─────────────────────────────────┤                                      │
```

---

#### Validações e consentimento OAuth

O registro dinâmico aceita clientes públicos (`token_endpoint_auth_method=none`) e exige `redirect_uris` cadastrados. Cada callback é comparado por igualdade exata. HTTPS é obrigatório; HTTP só é aceito para loopback com porta explícita. Clientes desconhecidos e callbacks diferentes são recusados antes de mostrar o consentimento.

A tela de autorização abre `dev.luisices.com.br/oauth-consent` ou `luisices.com.br/oauth-consent`. O navegador autentica pelo Firebase Authentication da aplicação e envia ao endpoint OAuth somente um Firebase ID token no cabeçalho `Authorization`; o backend verifica assinatura, expiração e revogação (`verifyIdToken(..., true)`). UID e e-mail enviados no corpo são ignorados. O código só é criado após a identidade e o perfil atual passarem pelas verificações MCP. A solicitação registrada no servidor fixa cliente, callback, escopos, `state` e challenge S256 e só pode ser consumida uma vez.

A página escolhe o endpoint por domínio oficial, build local ou projeto Firebase explicitamente configurado como DEV. Hosts locais e previews sem sinal de ambiente reconhecido mostram erro e não enviam credenciais; parâmetros da URL não alteram o destino.

O endpoint de token exige `client_id`, `redirect_uri` e `code_verifier`; o cliente e o callback precisam corresponder ao código original. Código e refresh token são consumidos/rotacionados em transações Firestore. Refresh preserva cliente e escopos. Escopos administrativos são recusados para perfis comuns; escopos ausentes em tokens antigos resultam em nenhuma permissão. Clientes registrados com o método `none` não devem enviar segredo de cliente.

As chamadas OAuth usam limites Firestore compartilhados entre instâncias: 120 chamadas MCP por usuário/hora; 30 inícios de autorização e 30 confirmações de consentimento por IP/hora; 120 trocas/renovações de token por IP/hora; e 60 registros dinâmicos por IP/hora. Os limites MCP seguem o UID, mesmo após renovar token. O controle de chamadas MCP não depende de rate limit em memória nem de regra da Cloudflare.

Clientes dinâmicos existentes com callback HTTPS cadastrado podem continuar usando seu `client_id`. O identificador interno legado `chatgpt-mcp` permanece definido explicitamente e aceita somente `https://chatgpt.com/aip/g-mcp/oauth/callback`. Códigos emitidos antes desta alteração e refresh tokens legados sem issuer/audience precisam iniciar nova autorização. Access tokens legados só continuam válidos quando issuer/audience do token e da sessão, sessão e cliente conferem; sessões sem issuer/audience ou de outro ambiente exigem reconexão OAuth. Tokens sem escopos persistidos ficam sem permissões de ferramenta.

---

### 2.2 Ciclo de Vida de Execução de uma Ferramenta (Ação REST / MCP)

```

```
┌───────────┐          ┌──────────────────────┐        ┌──────────────────┐       ┌───────────────┐
│  Cliente  │          │ chatGptToolsEndpoint │        │ AiToolsExecutor  │       │   Firestore   │
└─────┬─────┘          └──────────┬───────────┘        └────────┬─────────┘       └───────┬───────┘
      │                           │                             │                         │
      │ 1. POST /tools/create_order                           │                         │
      ├──────────────────────────>│                             │                         │
      │    Authorization: Bearer  │                             │                         │
      │    X-Idempotency-Key...   │                             │                         │
      │                           │ 2. Valida Origem & Chave    │                         │
      │                           │    Checa Rate Limit & Scope │                         │
      │                           ├────────────────────────────>│                         │
      │                           │                             │ 3. Checa Idempotência   │
      │                           │                             ├────────────────────────>│
      │                           │                             │    Calcula Hash SHA-256 │
      │                           │                             │<────────────────────────┤
      │                           │                             │                         │
      │                           │                             │ 4. Executa Regra Negócio│
      │                           │                             │    Aplica Alerta >R$500 │
      │                           │                             ├────────────────────────>│
      │                           │                             │    Grava Pedido #2026-..│
      │                           │                             │<────────────────────────┤
      │                           │                             │                         │
      │                           │ 5. Grava mcpAuditLogs (async│                         │
      │                           ├─────────────────────────────┴────────────────────────>│
      │                           │                                                       │
      │ 6. Retorna JSON 200 OK    │                                                       │
      │<──────────────────────────┤                                                       │
```

---

## 3. Segurança, Autenticação e Autorização

### 3.1 Tipos de Autenticação Aceitos

A API suporta dois métodos equivalentes de autenticação no cabeçalho `Authorization`:

1. **Chave Privada de API (`lui_...`):**
   * Sintaxe: `Authorization: Bearer <ACCESS_TOKEN>` (Produção) ou `Authorization: Bearer <ACCESS_TOKEN>` (Desenvolvimento).
   * Geradas e gerenciadas no painel de configurações do Luisices na coleção `mcpApiKeys`.
2. **Token de Acesso OAuth 2.1 (JWT):**
   * Sintaxe: `Authorization: Bearer <ACCESS_TOKEN>`
   * Emitidos através do fluxo OAuth 2.1 com suporte a PKCE (`/oauth/authorize` e `/oauth/token`).

---

### 3.2 Matriz de Escopos Granulares (`MCP_SCOPES`)

| Identificador do Escopo | Módulo | Descrição / Permissões | Requer Admin? | Padrão Concedido |
| :--- | :--- | :--- | :---: | :---: |
| `orders:read` | Pedidos & Produção | Consultar fila de produção, pedidos do dia e status | Não | Sim |
| `orders:draft` | Pedidos & Produção | Gerar rascunhos de pedidos e obter formulários | Não | Não |
| `orders:create` | Pedidos & Produção | Registrar novos pedidos oficiais no sistema | Não | Sim |
| `customers:read` | Clientes | Buscar histórico e dados de contato de clientes | Não | Sim |
| `financial:read` | Financeiro | Acesso a faturamento, ticket médio e DRE | **Sim** | Não |
| `team:read` | Equipe | Auditar produtividade e pedidos por colaborador | **Sim** | Não |
| `pricing:estimate` | Precificação | Calculadora de preços, insumos e margem | Não | Sim |
| `whatsapp:compose` | WhatsApp | Gerar textos de mensagens de cobrança e avisos | Não | Sim |
| `gallery:read` | Galeria | Buscar itens e fotos do acervo do ateliê | Não | Sim |

---

### 3.3 Mecanismos de Proteção e Resiliência

* **Proteção de Origem (Origin Protection):** Requisições originadas via Cloudflare Worker devem conter o cabeçalho `x-origin-secret`. Requisições diretas de Ações do ChatGPT contendo uma chave `lui_...` válida são liberadas automaticamente.
* **Rate Limiting:** Limite padrão de **60 requisições por hora por chave/usuário**. Exceder o limite resulta em erro `429 Too Many Requests`.
* **Cache em Memória (15s):** A validação de chaves e configurações globais possui cache volátil de 15 segundos para alta performance em rajadas de chamadas.
* **Trava de Risco Financeiro (> R$ 500,00):** Pedidos com valor total superior a R$ 500,00 criados via ChatGPT/MCP recebem automaticamente a flag `requiresFinancialApproval: true` e as tags `Aprovação Financeira` e `Valor Alto`. O assistente é instruído a alertar o usuário no chat.
* **Proteção contra Duplicatas (Idempotência):** Suporte ao cabeçalho `X-Idempotency-Key` ou parâmetro `idempotencyKey`. Caso omitido em `create_order`, o sistema calcula um hash SHA-256 determinístico composto por `uid + cliente + produto + total + dataEntrega`. Tentar reexecutar um pedido idêntico dentro de 24 horas retorna o pedido já existente sem duplicar registros no banco.
* **Auditoria Contínua (`mcpAuditLogs`):** Todas as invocações (sucesso ou erro) são registradas assincronamente no Firestore contendo tempo de execução (ms), protocolo, usuário, ferramenta e número do pedido gerado.

---

## 4. Endpoints de Descoberta e Infraestrutura

### 4.1 Discovery da Aplicação

| Método | Caminho (Path) | Descrição | Exemplo de Uso |
| :--- | :--- | :--- | :--- |
| `GET` | `/.well-known/ai-plugin.json` | Manifesto oficial do Plugin ChatGPT | Descoberta do Plugin pelo ChatGPT |
| `GET` | `/openapi.json` | Especificação OpenAPI 3.0.3 dinâmica | Leitura do Schema pelo ChatGPT / Custom GPT |
| `GET` | `/.well-known/oauth-protected-resource` | Metadados de Recurso Protegido (RFC 9728) | Descoberta de Recursos OAuth 2.1 |
| `GET` | `/.well-known/openid-configuration` | Configuração do Servidor de Autorização | Descoberta de endpoints OAuth |
| `GET` | `/health` | Checagem de integridade e status da API | Monitoramento e Liveness Check |

---

### 4.2 Exemplo de Resposta: `GET /health`

**Requisição:**
```http
GET /chatGptToolsEndpoint/health HTTP/1.1
Host: api.luisices.com.br
Accept: application/json
```

**Resposta `200 OK`:**
```json
{
  "status": "online",
  "service": "Luisices MCP & ChatGPT Tools Endpoint",
  "version": "1.0.0",
  "environment": "papelaria-dashboard",
  "schemaUrl": "https://api.luisices.com.br/chatGptToolsEndpoint/openapi.json",
  "pluginManifestUrl": "https://api.luisices.com.br/chatGptToolsEndpoint/.well-known/ai-plugin.json"
}
```

---

## 5. Catálogo Detalhado de Ferramentas (Tools)

Todas as ferramentas executadas via REST são chamadas via método **`POST`** para a URL `/tools/{nome_da_ferramenta}`.

---

### <a id="1-query_orders_view"></a>1. `query_orders_view` — Consultar Fila de Pedidos & Produção

* **Escopo Requerido:** `orders:read`
* **Descrição:** Consulta a fila de pedidos cadastrados com suporte a filtros por status, busca por texto ou intervalo de datas de entrega.

#### Parâmetros de Entrada (`application/json`):
| Campo | Tipo | Obrigatório | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `status` | `string` | Não | `"todos"` | Enums: `"todos"`, `"pendente"`, `"em_producao"`, `"concluido"`, `"entregue"`, `"atrasado"`. |
| `searchTerm` | `string` | Não | - | Filtra por nome do cliente, número do pedido (ex: `#2026-0042`) ou produto. |
| `startDate` | `string` | Não | - | Data inicial de entrega no formato `AAAA-MM-DD`. |
| `endDate` | `string` | Não | - | Data final de entrega no formato `AAAA-MM-DD`. |
| `limit` | `integer` | Não | `15` | Máximo de registros retornados (limite máximo: 20). |

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/query_orders_view HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "status": "em_producao",
  "searchTerm": "Cliente Exemplo",
  "limit": 5
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "query_orders_view",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "totalFound": 1,
    "statusFilter": "em_producao",
    "orders": [
      {
        "id": "ORD-2026-0189",
        "orderNumber": "#2026-0189",
        "customerName": "Cliente Exemplo",
        "customerPhone": "<TELEFONE_FICTICIO>",
        "productName": "Kit Festa Luxo Safari Baby 3D (30 Caixas)",
        "quantity": 30,
        "totalPrice": 450.00,
        "paidAmount": 225.00,
        "remainingBalance": 225.00,
        "status": "em_producao",
        "paymentStatus": "parcialmente_pago",
        "deliveryDate": "2026-10-25",
        "theme": "Safari Baby",
        "tags": ["ChatGPT", "Urgente", "Festa Infantil"]
      }
    ]
  }
}
```

---

### <a id="2-daily_briefing"></a>2. `daily_briefing` — Raio-X Operacional do Dia

* **Escopo Requerido:** `orders:read`
* **Descrição:** Fornece um panorama completo das operações do ateliê para a data especificada (ou hoje), incluindo entregas previstas, pedidos em atraso, contagem em produção e saldos pendentes a receber.

#### Parâmetros de Entrada:
| Campo | Tipo | Obrigatório | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `date` | `string` | Não | Data atual | Data de referência em formato `AAAA-MM-DD`. |

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/daily_briefing HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "date": "2026-10-13"
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "daily_briefing",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "referenceDate": "2026-10-13",
    "deliveriesTodayCount": 3,
    "overdueCount": 1,
    "inProductionCount": 8,
    "pendingPaymentTotal": 1380.00,
    "deliveriesToday": [
      {
        "orderNumber": "#2026-0175",
        "customerName": "Cliente Exemplo B",
        "productName": "50 Convites de Casamento Clássicos em Papel Linho",
        "deliveryDate": "2026-10-13",
        "status": "em_producao",
        "remainingBalance": 350.00
      }
    ],
    "overdueOrders": [
      {
        "orderNumber": "#2026-0160",
        "customerName": "Cliente Exemplo C",
        "productName": "Topo de Bolo Acrílico Personalizado Bodas de Prata",
        "deliveryDate": "2026-10-11",
        "daysOverdue": 2
      }
    ]
  }
}
```

---

### <a id="3-query_customers"></a>3. `query_customers` — Consultar Clientes & Contatos

* **Escopo Requerido:** `customers:read`
* **Descrição:** Busca clientes cadastrados no banco de dados por nome, telefone WhatsApp ou cidade.

#### Parâmetros de Entrada:
| Campo | Tipo | Obrigatório | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `searchTerm` | `string` | Não | - | Nome, telefone ou cidade para filtrar. |
| `limit` | `integer` | Não | `10` | Quantidade máxima de clientes retornados. |

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/query_customers HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "searchTerm": "telefone-de-exemplo",
  "limit": 5
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "query_customers",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "totalFound": 1,
    "customers": [
      {
        "id": "CUST-9842",
        "name": "Cliente Exemplo",
        "phone": "<TELEFONE_FICTICIO>",
        "city": "São Paulo",
        "state": "SP",
        "totalOrdersCount": 4,
        "totalSpent": 1820.00,
        "lastOrderDate": "2026-10-10"
      }
    ]
  }
}
```

---

### <a id="4-get_financial_summary"></a>4. `get_financial_summary` — Resumo Financeiro & DRE (Admin)

* **Escopo Requerido:** `financial:read`
* **Exige Perfil de Administrador:** **Sim**
* **Descrição:** Fornece o balanço financeiro, faturamento bruto, total efetivamente recebido, valores pendentes a receber e ticket médio para o período selecionado.

#### Parâmetros de Entrada:
| Campo | Tipo | Obrigatório | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `period` | `string` | Não | `"mes"` | Valore aceitos: `"hoje"`, `"esta_semana"`, `"mes"`, `"mes_anterior"`, `"ano"`. |
| `userIdentifier` | `string` | Não | - | Opcional: filtrar faturamento gerado por colaborador específico. |

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/get_financial_summary HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "period": "mes"
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "get_financial_summary",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "periodLabel": "Outubro / 2026",
    "totalOrders": 42,
    "grossRevenue": 18450.00,
    "totalReceived": 12300.00,
    "totalPending": 6150.00,
    "averageTicket": 439.28,
    "paymentMethodsBreakdown": {
      "pix": 14200.00,
      "cartao_credito": 3250.00,
      "dinheiro": 1000.00
    }
  }
}
```

---

### <a id="5-calculate_pricing_estimate"></a>5. `calculate_pricing_estimate` — Calculadora de Precificação

* **Escopo Requerido:** `pricing:estimate`
* **Descrição:** Realiza a estimativa de preço de venda ideal com base no custo de materiais/insumos, tempo de mão de obra/máquina e margem de lucro desejada.

#### Parâmetros de Entrada:
| Campo | Tipo | Obrigatório | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `productName` | `string` | **Sim** | - | Nome do produto (ex: `"Caixa Milk 3D Shaker"`). |
| `quantity` | `integer` | **Sim** | - | Quantidade de peças. |
| `materialsCost` | `number` | Não | `0` | Custo total dos materiais empregados em R$. |
| `laborHours` | `number` | Não | `0` | Horas estimadas de trabalho/corte/montagem. |
| `targetMarginPercent` | `number` | Não | `40` | Margem de lucro desejada (%). |

Para compatibilidade, `materialsCost` é o custo total dos materiais do lote e é dividido por `quantity`; `laborHours` é o total de horas do lote e é convertido em minutos por unidade. `targetMarginPercent` é alias de `profitMarginPercent`. Os campos nativos por unidade são `rawMaterialsCost`, `laborTimeMinutes` e `profitMarginPercent`; valores conflitantes entre alias e campo nativo são rejeitados. Custos negativos/não finitos, quantidade fora de 1–100.000, margem acima de 95%, mais de 1.000 horas de mão de obra por lote, taxas acima de 100% ou perdas acima de 1.000% são rejeitados. Entradas omitidas seguem padrões/configurações atuais e são identificadas na lista de premissas do resultado.

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/calculate_pricing_estimate HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "productName": "Caixa Milk Luxo Shaker - Tema Sereia",
  "quantity": 20,
  "materialsCost": 45.00,
  "laborHours": 2.5,
  "targetMarginPercent": 45
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "calculate_pricing_estimate",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "productName": "Caixa Milk Luxo Shaker - Tema Sereia",
    "quantity": 20,
    "costBreakdown": {
      "materialsTotal": 45.00,
      "laborTotal": 75.00,
      "totalCost": 120.00,
      "unitCost": 6.00
    },
    "pricingSuggestion": {
      "targetMarginPercent": 45,
      "suggestedTotalSellingPrice": 218.18,
      "suggestedUnitPrice": 10.90,
      "estimatedNetProfit": 98.18
    }
  }
}
```

---

### <a id="6-generate_whatsapp_message"></a>6. `generate_whatsapp_message` — Gerar Rascunho de Mensagem WhatsApp

* **Escopo Requerido:** `whatsapp:compose`
* **Descrição:** Cria um texto amigável e profissional pré-formatado para envio ao cliente via WhatsApp (cobrança de saldo, aviso de pedido pronto ou confirmação).

#### Parâmetros de Entrada:
| Campo | Tipo | Obrigatório | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `recipientName` | `string` | **Sim** | - | Nome do cliente. |
| `recipientPhone` | `string` | Não | - | Telefone/WhatsApp com DDD. |
| `orderNumber` | `string` | Não | - | Número do pedido (ex: `#2026-0189`). |
| `messageType` | `string` | Não | `"confirmacao_pedido"` | Enums: `"cobranca_saldo"`, `"pedido_pronto"`, `"confirmacao_pedido"`, `"lembrete_geral"`. |
| `customText` | `string` | Não | - | Instruções adicionais para incorporar à mensagem. |

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/generate_whatsapp_message HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "recipientName": "Cliente Exemplo",
  "recipientPhone": "<TELEFONE_FICTICIO>",
  "orderNumber": "#2026-0189",
  "messageType": "pedido_pronto",
  "customText": "Retirada disponível no ateliê até as 18h."
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "generate_whatsapp_message",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "recipientPhone": "<TELEFONE_FICTICIO>",
    "messageType": "pedido_pronto",
    "messageText": "Olá, Cliente Exemplo! ✨ Tudo bem?\n\nPassando para avisar que o seu pedido *#2026-0189* (Kit Festa Luxo Safari Baby 3D) ficou pronto com todo o carinho e já está disponível para retirada no ateliê!\n\n📍 *Observação:* Retirada disponível no ateliê até as 18h.\n\nQualquer dúvida, estamos à disposição! 🎨✂️"
  }
}
```

---

### <a id="7-get_order_form"></a>7. `get_order_form` — Obter Formulário Estruturado de Pedido

* **Escopo Requerido:** `orders:draft`
* **Descrição:** Retorna um formulário limpo em Markdown com a estrutura oficial para coleta guiada dos dados de encomenda junto ao cliente no chat.

#### Parâmetros de Entrada:
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `customerName` | `string` | Não | Nome do cliente se já conhecido na conversa. |
| `productCategory` | `string` | Não | Categoria do produto (ex: `"festa_infantil"`, `"casamento"`). |

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/get_order_form HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "customerName": "Cliente Exemplo",
  "productCategory": "festa_infantil"
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "get_order_form",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "formTitle": "Formulário Estruturado de Pedido - Luisices Ateliê",
    "formMarkdown": "📋 **Formulário de Pedido — Luisices Ateliê** para **Cliente Exemplo**\n*Por favor, preencha ou confirme os campos abaixo:*\n\n1. **Nome Completo do Cliente:** Cliente Exemplo\n2. **Telefone / WhatsApp:** \n3. **Descrição dos Produtos / Peças:** \n4. **Quantidade de Peças:** \n5. **Tema / Cores / Personagem:** \n6. **Data Prometida para Entrega (AAAA-MM-DD):** \n7. **Valor Total Combinado (R$):** \n8. **Valor do Sinal / Entrada (R$):** \n9. **Forma de Pagamento (Pix/Cartão/Dinheiro):** \n10. **Observações de Acabamento:** "
  }
}
```

---

### <a id="8-extract_order_draft"></a>8. `extract_order_draft` — Montar Rascunho de Pedido

* **Escopo Requerido:** `orders:draft`
* **Descrição:** Extrai os dados informados em linguagem natural pelo cliente ou atendente e consolida um rascunho formatado antes de registrar o pedido oficialmente.

#### Parâmetros de Entrada:
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `customerName` | `string` | **Sim** | Nome do cliente. |
| `productSummary` | `string` | **Sim** | Descrição legível dos produtos encomendados. |
| `customerPhone` | `string` | Não | WhatsApp do cliente. |
| `quantity` | `integer` | Não | Quantidade de itens. |
| `totalPrice` | `number` | Não | Valor total negociado. |
| `deliveryDate` | `string` | Não | Data no formato `AAAA-MM-DD`. |
| `theme` | `string` | Não | Tema ou paleta. |
| `notes` | `string` | Não | Observações de produção. |

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/extract_order_draft HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "customerName": "Cliente Exemplo",
  "customerPhone": "<TELEFONE_FICTICIO>",
  "productSummary": "20 Caixas Pyramide 3D + 1 Topo de Bolo Shaker",
  "quantity": 21,
  "totalPrice": 280.00,
  "deliveryDate": "2026-11-20",
  "theme": "Jardim Encantado"
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "extract_order_draft",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "preparationStatus": "draft_prepared",
    "customerName": "Cliente Exemplo",
    "customerPhone": "<TELEFONE_FICTICIO>",
    "productSummary": "20 Caixas Pyramide 3D + 1 Topo de Bolo Shaker",
    "quantity": 21,
    "totalPrice": 280.00,
    "deliveryDate": "2026-11-20",
    "theme": "Jardim Encantado",
    "draftSummaryMarkdown": "🔍 **Rascunho do Pedido Pronto para Conferência:**\n* **Cliente:** Cliente Exemplo (<TELEFONE_FICTICIO>)\n* **Itens:** 20 Caixas Pyramide 3D + 1 Topo de Bolo Shaker (21 peças)\n* **Tema:** Jardim Encantado\n* **Data de Entrega:** 20/11/2026\n* **Valor Total:** R$ 280,00\n\n> ⚠️ Para gravar este pedido oficialmente na fila de produção, execute a ação `create_order`."
  }
}
```

---

### <a id="9-create_order"></a>9. `create_order` — Criar e Registrar Pedido Oficial (com Idempotência & Alertas)

* **Escopo Requerido:** `orders:create`
* **Descrição:** Grava oficialmente um novo pedido no banco de dados Firestore do ateliê. Gera o número sequencial `#2026-XXXX`, vincula o cliente, calcula o saldo pendente, atribui a tag `"ChatGPT"`, aplica regras de idempotência e aciona a trava financeira se o total for maior que R$ 500,00.

#### Parâmetros de Entrada:
| Campo | Tipo | Obrigatório | Padrão | Descrição |
| :--- | :--- | :---: | :---: | :--- |
| `customerName` | `string` | **Sim** | - | Nome do cliente. |
| `productName` | `string` | **Sim** | - | Nome/descrição do item encomendado. |
| `quantity` | `integer` | **Sim** | - | Quantidade (mínimo 1). |
| `totalPrice` | `number` | **Sim** | - | Valor total em R$. |
| `deliveryDate` | `string` | **Sim** | - | Data de entrega prometida (`AAAA-MM-DD`). Não aceita datas passadas. |
| `customerPhone` | `string` | Não | - | Telefone do cliente. |
| `paidAmount` | `number` | Não | `0.00` | Valor de entrada/sinal já pago. |
| `paymentMethod` | `string` | Não | `"pix"` | Enums: `"pix"`, `"cartao_credito"`, `"cartao_debito"`, `"dinheiro"`, `"transferencia"`. |
| `theme` | `string` | Não | - | Tema ou cores. |
| `notes` | `string` | Não | - | Instruções especiais de personalização. |
| `idempotencyKey` | `string` | Não | Hash SHA-256 | Chave única opcional para evitar duplicação em tentativas repetidas. |

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/create_order HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
X-Idempotency-Key: msp-ord-20261013-001
Content-Type: application/json

{
  "customerName": "Cliente Exemplo",
  "customerPhone": "<TELEFONE_FICTICIO>",
  "productName": "Kit Pegue e Monte Safari 3D (50 peças)",
  "quantity": 50,
  "totalPrice": 650.00,
  "paidAmount": 300.00,
  "paymentMethod": "pix",
  "deliveryDate": "2026-11-15",
  "theme": "Safari Baby",
  "notes": "Nome do aniversariante: Lucas (1 ano). Colocar laço verde musgo."
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "create_order",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "id": "ORD-2026-0201",
    "orderNumber": "#2026-0201",
    "status": "pendente",
    "customerName": "Cliente Exemplo",
    "customerPhone": "<TELEFONE_FICTICIO>",
    "productName": "Kit Pegue e Monte Safari 3D (50 peças)",
    "quantity": 50,
    "totalPrice": 650.00,
    "paidAmount": 300.00,
    "remainingBalance": 350.00,
    "paymentStatus": "parcialmente_pago",
    "deliveryDate": "2026-11-15",
    "theme": "Safari Baby",
    "tags": ["ChatGPT", "Aprovação Financeira", "Valor Alto"],
    "requiresFinancialApproval": true,
    "idempotencyKey": "msp-ord-20261013-001",
    "message": "Pedido #2026-0201 registrado com sucesso na fila de produção! ⚠️ Atenção: Por possuir valor superior a R$ 500,00, este pedido requer validação da gerência financeira."
  }
}
```

---

### <a id="10-search_gallery_portfolio"></a>10. `search_gallery_portfolio` — Consultar Portfólio / Acervo

* **Escopo Requerido:** `gallery:read`
* **Descrição:** Pesquisa peças e fotos produzidas anteriormente no acervo do ateliê para servir de inspiração e referência ao cliente.

#### Parâmetros de Entrada:
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `searchTerm` | `string` | Não | Palavra-chave (ex: `"masha e o urso"`, `"shaker"`). |
| `limit` | `integer` | Não (Padrão 8) | Quantidade máxima de itens retornados. |

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/search_gallery_portfolio HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "searchTerm": "Masha e o Urso",
  "limit": 2
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "search_gallery_portfolio",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "totalFound": 2,
    "items": [
      {
        "id": "GAL-104",
        "title": "Topo de Bolo 3D Camadas - Masha e o Urso",
        "category": "topos_de_bolo",
        "imageUrl": "https://luisices.com.br/gallery/topo-masha.jpg",
        "tags": ["Masha e o Urso", "3D", "Camadas", "Menina"]
      },
      {
        "id": "GAL-105",
        "title": "Caixa Cenário Shaker Luxo - Masha e o Urso",
        "category": "caixas_luxo",
        "imageUrl": "https://luisices.com.br/gallery/caixa-masha.jpg",
        "tags": ["Masha e o Urso", "Shaker", "Passamanaria"]
      }
    ]
  }
}
```

---

### <a id="11-get_user_summary"></a>11. `get_user_summary` — Auditar Desempenho da Equipe (Admin)

* **Escopo Requerido:** `team:read`
* **Exige Perfil de Administrador:** **Sim**
* **Descrição:** Permite consultar os pedidos produzidos e a produtividade individual de um determinado colaborador da equipe.

#### Parâmetros de Entrada:
| Campo | Tipo | Obrigatório | Descrição |
| :--- | :--- | :---: | :--- |
| `userIdentifier` | `string` | **Sim** | Nome ou e-mail do colaborador. |

#### Exemplo de Requisição HTTP:
```http
POST /chatGptToolsEndpoint/tools/get_user_summary HTTP/1.1
Host: api.luisices.com.br
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "userIdentifier": "usuario@example.invalid"
}
```

#### Exemplo de Resposta `200 OK`:
```json
{
  "success": true,
  "tool": "get_user_summary",
  "timestamp": "2026-10-13T10:30:00.000Z",
  "data": {
    "userEmail": "usuario@example.invalid",
    "userName": "Colaborador Exemplo",
    "role": "admin",
    "completedOrdersThisMonth": 28,
    "inProductionCount": 5,
    "onTimeDeliveryRatePercent": 98.2
  }
}
```

---

### 5.1 Catálogo de ferramentas e escopos

O servidor publica 21 ferramentas. A lista abaixo reflete o registro atual em `functions/mcp/openapi.js`; a autorização efetiva também exige que o perfil e a chave permitam o escopo indicado.

| Ferramenta | Escopo requerido |
| :--- | :--- |
| `query_orders_view` | `orders:read` |
| `daily_briefing` | `orders:read` |
| `query_delivery_schedule` | `orders:read` |
| `extract_order_draft` | `orders:draft` |
| `get_order_form` | `orders:draft` |
| `create_order` | `orders:create` |
| `get_order_edit_form` | `orders:update` |
| `update_order` | `orders:update` |
| `update_order_status` | `orders:update` |
| `update_delivery_details` | `orders:update` |
| `query_customers` | `customers:read` |
| `get_customer_history` | `customers:read` |
| `create_customer` | `customers:create` |
| `update_customer` | `customers:update` |
| `query_order_payments` | `payments:read` |
| `register_order_payment` | `payments:write` |
| `get_financial_summary` | `financial:read` |
| `get_user_summary` | `team:read` |
| `calculate_pricing_estimate` | `pricing:estimate` |
| `generate_whatsapp_message` | `whatsapp:compose` |
| `search_gallery_portfolio` | `gallery:read` |

Ferramentas que gravam dados devem ser usadas com os campos de prévia, confirmação explícita, controle de versão e/ou idempotência definidos no schema de cada operação. A autorização é validada novamente pelo backend em cada chamada.

## 6. Suporte Nativo ao Protocolo MCP (JSON-RPC 2.0)

Além das chamadas REST OpenAPI, o endpoint aceita requisições no padrão nativo do **Model Context Protocol (MCP)** via `POST /chatGptToolsEndpoint`.

### 6.1 Handshake Inicial (`method: "initialize"`)

**Requisição:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": {
      "name": "Claude Desktop / Cursor Agent",
      "version": "1.0"
    }
  }
}
```

**Resposta:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": false
      }
    },
    "serverInfo": {
      "name": "luisices-mcp-server",
      "version": "1.0.0"
    },
    "instructions": "Servidor MCP oficial do Ateliê Luisices para consulta de pedidos, produção, clientes e orçamentos."
  }
}
```

---

### 6.2 Execução de Ferramenta via MCP (`method: "tools/call"`)

**Requisição:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "query_orders_view",
    "arguments": {
      "status": "pendente",
      "limit": 2
    }
  }
}
```

**Resposta:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"totalFound\": 2,\n  \"statusFilter\": \"pendente\",\n  \"orders\": [...]\n}"
      }
    ],
    "isError": false
  }
}
```

---

## 7. Tabela de Erros HTTP e Tratamento

| Código HTTP | Erro (`error`) | Causa / Descrição | Ação Recomendada |
| :---: | :--- | :--- | :--- |
| `400` | `INVALID_ARGUMENTS` | Parâmetros obrigatórios ausentes ou em formato incorreto. | Corrigir o JSON da requisição conforme a especificação. |
| `401` | `UNAUTHORIZED` | Cabeçalho `Authorization` ausente, chave desativada ou expirada. | Fornecer uma chave `lui_...` válida ou realizar login OAuth. |
| `403` | `SCOPE_PERMISSION_DENIED` | A chave/usuário não possui o escopo necessário para a ferramenta. | Atribuir o escopo requerido na chave no painel do Luisices. |
| `403` | `ADMIN_REQUIRED` | Tentativa de executar ferramenta restrita a Administradores (ex: DRE/Equipe). | Utilizar uma conta com perfil Administrador. |
| `404` | `TOOL_NOT_FOUND` | O nome da ferramenta informado na URL não existe. | Verificar a ortografia do nome da ferramenta em `/openapi.json`. |
| `429` | `RATE_LIMIT_EXCEEDED` | Limite de 60 requisições/hora excedido para a chave. | Aguardar o reset da janela de tempo ou aumentar o limite. |
| `500` | `TOOL_EXECUTION_ERROR` | Erro durante o processamento interno na regra de negócio do Firebase. | Consultar os logs detalhados na coleção `mcpAuditLogs`. |

---

## 8. Massa de Dados Fictícios e Guia de Testes

Para realizar testes integrados no ChatGPT Actions ou cliente MCP, utilize os dados fictícios padronizados abaixo:

### Massa Fictícia Padronizada para Testes:
* **Cliente de Teste:** `Cliente Exemplo`
* **Telefone Fictício:** `<TELEFONE_FICTICIO>`
* **Produto de Teste 1 (Normal):** `Kit Festa Luxo Safari Baby 3D (30 peças)` — **Valor:** `R$ 350,00` — **Sinal:** `R$ 175,00`
* **Produto de Teste 2 (Valor Alto > R$500):** `50 Caixas Personalizadas Bodas de Ouro` — **Valor:** `R$ 750,00` — **Sinal:** `R$ 400,00`
* **Data de Entrega Futura de Teste:** `2026-11-15`

### Roteiro Recomendado de Validação no ChatGPT:
1. **Teste de Consulta:** * "Mostre o raio-x das operações de hoje do ateliê."* → Aciona `daily_briefing`.
2. **Teste de Precificação:** * "Quanto devo cobrar para fazer 20 caixas milk luxo com custo de R$ 40 de papel e 2 horas de trabalho?"* → Aciona `calculate_pricing_estimate`.
3. **Teste de Formulário:** * "Quero fazer um novo pedido."* → Aciona `get_order_form`.
4. **Teste de Rascunho:** * "Monte um rascunho de pedido para a Cliente Exemplo, telefone <TELEFONE_FICTICIO>, 30 caixas safari baby no valor de R$ 350 para o dia 15/11/2026."* → Aciona `extract_order_draft`.
5. **Teste de Registro Oficial com Idempotência & Trava Financeira:** * "Confirme e registre o pedido de 50 Caixas Bodas de Ouro para a Cliente Exemplo por R$ 750 para entrega em 15/11/2026."* → Aciona `create_order` e gera o alerta de aprovação financeira (> R$ 500).

---
*Documentação gerada e mantida no repositório em `/docs/INTEGRACAO_CHATGPT_MCP.md`.*

## Gestão de acesso no perfil do usuário

O administrador configura o acesso em **Usuários → editar usuário → Acesso pelo ChatGPT e assistentes**. O interruptor geral desativa a integração sem apagar as funcionalidades escolhidas. Uma lista explicitamente vazia não permite funcionalidades. A tela de Configurações → Integrações mantém chaves, sessões e auditoria e oferece um atalho para a gestão de usuários.

Os escopos configurados são preservados ao editar nome ou permissões de outros módulos. Clientes antigos que omitem `permissions.mcpScopes` também preservam o valor atual no backend. Um valor explícito enviado ao cadastro/edição deve ser uma lista sem duplicatas de escopos conhecidos.

Para perfis não administrativos, as funcionalidades MCP respeitam permissões explícitas dos módulos: leitura e rascunhos dependem de visualizar Pedidos; criação depende de criar Pedidos; consultas de clientes, precificação e galeria dependem de visualizar os respectivos módulos; composição de mensagens depende de WhatsApp. Perfis legados sem o módulo configurado mantêm a compatibilidade existente. Administradores continuam sujeitos à lista MCP configurada e aos escopos consentidos, com elegibilidade para funcionalidades administrativas.

Restringir um módulo não acrescenta escopos ao token. O backend recalcula a interseção nas chamadas e na renovação. Ao ampliar as permissões, o usuário pode precisar reconectar para consentir novos escopos. Presets de novos perfis contêm somente funcionalidades suportadas pelo servidor.
