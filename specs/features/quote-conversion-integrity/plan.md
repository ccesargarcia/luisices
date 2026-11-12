# Plano — quote-conversion-integrity

## Abordagem

Corrigir a fronteira de confiança na conversão nativa com projeção canônica no backend, autorização atual em todos os caminhos de replay e matemática exata em centavos nas Rules. Preservar o contrato de `createOrder` e os fluxos sem `quoteId`.

## Componentes existentes

| Área | Arquivos | Alteração planejada |
|---|---|---|
| Conversão | `functions/orders/index.js` | Projetar dados a partir do snapshot da cotação dentro da transação, conferir payload antigo e validar autorização antes de replay. |
| Lógica pura | novo helper isolado em `functions/orders/` | Construir projeção do pedido e comparação determinística em centavos; manter entrypoint/deploy seletivo de pedidos. |
| Interface | `src/app/components/quotes/QuoteDetailsDialog.tsx` | Tratar conflito de snapshot com recarga/revisão e evitar retry cego. |
| Rules | `firestore.rules` | Calcular subtotal/desconto/total em centavos inteiros, preservando limites CEL/AST e compatibilidade. |
| Testes Functions | `tests/unit/` e `tests/integration/create-order-function.test.ts` | Cobrir projeção, payload stale/tampered, replay e permissões. |
| Testes Rules | `tests/integration/quotes-backend-validation.test.ts` | Cobrir fração de centavo, arredondamento percentual e compatibilidade MCP. |
| E2E | `tests/e2e/critical-flows.spec.ts` | Cobrir conversão válida e conflito de orçamento desatualizado. |

## Sequência de implementação

1. Usar `quote.userId` como titular/tenant do orçamento, pedido, ledger e cliente vinculado; registrar o ator em `createdByUid`/`createdByName`.
2. Extrair/reaproveitar cálculo determinístico de projeção em código backend isolado; não importar módulos de UI para Functions.
3. Reorganizar `handleCreateOrder` para ler e autorizar `quoteId` antes do replay por ordem/chave; exigir titular/hash/vínculo coerentes em replay.
4. Construir/validar a projeção antes de qualquer escrita e manter todas as leituras transacionais antes das escritas; concorrência deve reavaliar snapshot e projeção.
5. Alterar `isValidQuoteMath` para valores em centavos inteiros e arredondamento percentual único, sem elevar custo CEL além dos limites.
6. Adicionar testes unitários e integração Rules/Functions; ampliar E2E relevante.
7. Atualizar baseline `quote-to-order`, documentação de segurança/finanças e mapa de deploy seletivo caso novos exports/entrypoints sejam criados.

## Contratos e compatibilidade

- Sem renomear callable nem remover `orderData`, `quoteId` ou `idempotencyKey`.
- Sem `quoteId`, comportamento e validações atuais de `createOrder` permanecem iguais.
- Com `quoteId`, payload antigo/incompatível falha com erro recuperável e sem efeitos; a interface deve atualizar o orçamento e pedir uma nova confirmação.
- Preservar a emissão de ordem e ledger e as regras de pagamento inicial pendente.
- Orçamentos gerados pelo MCP seguem aceitos; conversão MCP em si continua fora desta entrega.

## Segurança e integridade

- Validar sessão, perfil ativo, `quotes.edit`, `orders.create`, estado, validade, vínculo e permissões atuais antes de replay.
- O pedido deve usar valores derivados do snapshot do orçamento no backend, não valores financeiros fornecidos pelo cliente.
- O perfil ativo do agente não administrador precisa ter `quotes.edit` e `orders.create` previamente concedidas. `quote.userId` permanece titular do novo pedido/ledger; o ator fica em campos de autoria.
- `customerId` atual/sugerido precisa pertencer a `quote.userId`; nunca inferir ou aceitar vínculo cross-tenant.
- A fórmula da Rule deve usar centavos inteiros, limite de 10 linhas e ordem de curto-circuito. Não substituir testes de emulador por análise estática isolada.
- Nenhuma migração ou escrita de reparo nos documentos existentes faz parte do deploy.

## Validação e entrega

- Seguir o runbook de `luisices-test-suite`; para Rules executar a integração no Emulator Suite; para Functions executar unitários de domínio, lint e testes de inicialização/deploy seletivo aplicáveis.
- Cobrir conversão por proprietário e funcionário autorizado, funcionário sem cada permissão, `userId` do orçamento versus UID do ator, replays por chave/vínculo, cliente cross-tenant negado, 1–10 itens, descontos fixos/percentuais, empate de maiores restos, permuta e payload obsoleto.
- Confirmar que a suíte de Rules não ultrapassa limite de avaliações CEL/AST e que os testes de publicação de Functions continuam mapeando mudanças em `functions/orders/`.
- Deploy não faz parte desta spec; quando solicitado, publicar primeiro backend compatível e Rules necessárias no ambiente de desenvolvimento, verificar e então planejar produção.

## Riscos e reversão

- Rejeitar conversões de clientes antigos se o payload ainda usar uma projeção diferente; manter comparação explícita e mensagens recuperáveis.
- Alterar cálculo da Rule pode invalidar documentos com subcentavos existentes em futuras edições; primeiro auditar compatibilidade dos registros e definir tratamento para legado sem migração automática.
- Reverta helper/Function/Rule/UI em conjunto caso o novo contrato bloqueie conversões legítimas; não flexibilize centavos ou autorização como hotfix sem regressão.
