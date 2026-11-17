# Catálogo de especificações de funcionalidades

Cada subpasta representa uma mudança coesa em andamento ou concluída. Este catálogo não substitui o inventário atual em `docs/FUNCIONALIDADES.md`.

| ID | Tema | Status | Observação |
|---|---|---|---|
| [order-lifecycle](order-lifecycle/spec.md) | Ciclo interno do pedido | Pronta (baseline) | Contrato atual de pedidos para orientar specs de mudanças futuras. |
| [public-store-checkout](public-store-checkout/spec.md) | Checkout público da loja | Pronta (baseline) | Vitrine, validação server-side, gestão e conversão para pedido interno. |
| [gallery-media-beta-gateway](gallery-media-beta-gateway/spec.md) | Galeria privada no gateway Beta | Concluída | Migrada e confirmada pelo usuário com acesso normal à galeria privada; `api.dev` permaneceu intacto. |
| [mcp-admin-beta-gateway](mcp-admin-beta-gateway/spec.md) | Administração MCP pelo gateway Beta | Concluída | Migração isolada de `/api/mcp-admin`; painel testado pelo usuário, servidor público MCP/OAuth e `api.dev` fora do escopo. |
| [mcp-public-beta-gateway](mcp-public-beta-gateway/spec.md) | Servidor MCP público pelo gateway Beta | Concluída | Worker `functions-beta` e Vercel Beta publicados (`api.beta.luisices.com.br/mcp` 200, acesso direto 403), reconexão ChatGPT validada e desacoplamento `functions-dev` ↔ `functions-beta` aplicado. |
| [beta-only-dev-deploy-guard](beta-only-dev-deploy-guard/spec.md) | Evitar deploy Dev para PRs exclusivos Beta | Concluída | Label explícito `beta-only-no-dev-deploy` preserva validações (incluindo build frontend sem publicação) e ignora jobs de publicação Dev. |
| [alexa-beta-gateway](alexa-beta-gateway/spec.md) | Administração Alexa pelo gateway Beta | Concluída | Painel Beta validado pelo usuário; somente API administrativa migrada, webhook e fluxo público de voz fora do escopo. |
| [ai-chat-beta-gateway](ai-chat-beta-gateway/spec.md) | Copiloto de IA pelo gateway Beta | Concluída | Texto, imagem e execução Vercel confirmados pelo usuário; `api.dev` fora do escopo. |
| [ai-enrichment-beta-gateway](ai-enrichment-beta-gateway/spec.md) | Enriquecimento visual e uso de IA pelo gateway Beta | Concluída | Despacho de `enrichGalleryItem`, `enrichStoreProduct` e `getUsage` em `POST /api/ai-chat` com Vertex AI `southamerica-east1`, fallback GCP e validação remota (`44163266089`). |
| [orders-beta-gateway](orders-beta-gateway/spec.md) | Pedidos e SuperFrete pelo gateway Beta | Em andamento | Despacho de `createOrder`, `updateComplexOrder`, `calculateSuperfreteShipping` e `createSuperfreteLabel` em `POST /api/order-tracking` com proteção de borda e fallback GCP idempotente. |
| [quote-to-order](quote-to-order/spec.md) | Conversão de orçamento | Pronta (baseline) | Conversão nativa, matemática financeira, vínculo transacional e divergências com MCP. A cobertura E2E de conflito está concluída na spec de integridade. |
| [quote-conversion-integrity](quote-conversion-integrity/spec.md) | Integridade na conversão de orçamento | Concluída | Backend, Rules e E2E de conflito validados; quatro shards passaram em Ubuntu 26.04. |
| [github-pages-origin-monitoring](github-pages-origin-monitoring/spec.md) | Certificado TLS de origem do GitHub Pages | Concluída | Monitor diário de origem publicado em `main` e sincronizado em `develop`; heartbeat Kuma e runbook ativos. |
| [copilot-mcp-quality](copilot-mcp-quality/spec.md) | Consistência e avaliação de IA | Em andamento | T1–T3, T5 e T6 concluídas; a avaliação Gemini live (T4) permanece sem resultado pontuado e o fechamento final depende dessa evidência. |
| `<id-curto>` | Nova mudança | Rascunho | Crie uma pasta usando os modelos em `../templates/`. |

## Baseline do sistema existente

O comportamento implementado continua documentado em `docs/FUNCIONALIDADES.md`, `docs/DEPENDENCIAS_E_ARQUITETURA.md`, `docs/README.md`, `functions/README.md` e documentos especializados listados em `docs/README.md`. Não copie esses guias para specs por módulo sem uma mudança concreta; use-os como contexto e mantenha-os como documentação viva.

Ao iniciar uma mudança, registre na spec as referências específicas e valide as afirmações contra código e regras atuais. Uma mudança transversal pode referenciar vários domínios.
