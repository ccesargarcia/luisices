# Catálogo de especificações de funcionalidades

Cada subpasta representa uma mudança coesa em andamento ou concluída. Este catálogo não substitui o inventário atual em `docs/FUNCIONALIDADES.md`.

| ID | Tema | Status | Observação |
|---|---|---|---|
| [order-lifecycle](order-lifecycle/spec.md) | Ciclo interno do pedido | Pronta (baseline) | Contrato atual de pedidos para orientar specs de mudanças futuras. |
| [public-store-checkout](public-store-checkout/spec.md) | Checkout público da loja | Pronta (baseline) | Vitrine, validação server-side, gestão e conversão para pedido interno. |
| [quote-to-order](quote-to-order/spec.md) | Conversão de orçamento | Pronta (baseline) | Conversão nativa, matemática financeira, vínculo transacional e divergências com MCP. |
| [quote-conversion-integrity](quote-conversion-integrity/spec.md) | Integridade na conversão de orçamento | Concluída | Backend, Rules e E2E de conflito validados; quatro shards passaram em Ubuntu 26.04. |
| [copilot-mcp-quality](copilot-mcp-quality/spec.md) | Consistência e avaliação de IA | Em andamento | T1–T3 cobrem paridade MCP, catálogo e regressões offline; avaliação Gemini live continua pendente. |
| `<id-curto>` | Nova mudança | Rascunho | Crie uma pasta usando os modelos em `../templates/`. |

## Baseline do sistema existente

O comportamento implementado continua documentado em `docs/FUNCIONALIDADES.md`, `docs/DEPENDENCIAS_E_ARQUITETURA.md`, `docs/README.md`, `functions/README.md` e documentos especializados listados em `docs/README.md`. Não copie esses guias para specs por módulo sem uma mudança concreta; use-os como contexto e mantenha-os como documentação viva.

Ao iniciar uma mudança, registre na spec as referências específicas e valide as afirmações contra código e regras atuais. Uma mudança transversal pode referenciar vários domínios.
