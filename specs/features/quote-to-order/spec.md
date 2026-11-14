# Conversão de orçamento em pedido

- **ID:** `quote-to-order`
- **Status:** Pronta (baseline do comportamento atual, com divergências registradas)
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-12
- **Referências:** `docs/FUNCIONALIDADES.md`; `docs/SEGURANCA_LIMITE_CEL_PEDIDOS.md`; `functions/README.md`; `src/app/components/quotes/QuoteDetailsDialog.tsx`; `src/app/components/quotes/quoteHelpers.ts`; `src/services/firebaseQuoteService.ts`; `src/services/firebaseOrderService.ts`; `functions/orders/index.js`; `firestore.rules`; `src/app/types.ts`; `tests/integration/create-order-function.test.ts`; `tests/unit/quote-conversion-pricing.test.ts`; `tests/unit/quote-conversion-idempotency.test.ts`; `tests/e2e/critical-flows.spec.ts`.

## Problema e contexto

O módulo de orçamentos cria propostas para clientes, mantém itens/descontos/validade e apresenta ações para enviar, rejeitar ou aprovar. Na interface principal, aprovar significa criar um pedido de produção usando os valores e itens do orçamento. O fluxo oficial passa por `createOrder` e usa a transação do backend para vincular orçamento, pedido e ledger.

Esta spec descreve a jornada nativa da interface e registra divergências observadas para orientar decisões futuras. Ela não altera o comportamento do produto e não comprova implantação remota.

## Objetivos

- Registrar elegibilidade, cálculo e efeitos da aprovação/conversão.
- Preservar o total do orçamento em centavos quando descontos são distribuídos entre itens do pedido.
- Garantir que autorização, validade, cliente, pedido e ledger sejam tratados de forma consistente e sem duplicidade.
- Tornar visível a diferença entre aprovação comercial e recebimento de sinal/pagamento.

## Fora de escopo

- Precificação de insumos, orçamento sugerido por IA e criação/atualização de orçamento via MCP.
- Envio e entrega de mensagens por e-mail ou WhatsApp, exportação PDF/Excel e layout do formulário.
- Alteração de status de produção após a criação do pedido, cobrança, recebimento de pagamento ou migração de orçamentos existentes.

O caminho MCP para `updateQuoteStatus` com `convertToOrder` tem implementação e garantias distintas; não deve ser presumido equivalente ao fluxo nativo desta spec.

## Atores e permissões

| Ator | Ações | Restrições observadas |
|---|---|---|
| Proprietário do orçamento | Criar, consultar, editar, enviar/rejeitar e iniciar conversão conforme permissões de `quotes`. | A Function exige permissão atual `quotes.edit` para conversão e também `orders.create` para criar o pedido. |
| Administrador | Acesso administrativo ao orçamento e à criação do pedido. | A Function ainda valida dados, estado, validade e idempotência. |
| Funcionário autorizado | Consultar/editar orçamento conforme `quotes` e, quando autorizado, criar pedido. | Para conversão, perfil ativo, `quotes.edit` e `orders.create` precisam estar válidos. |

## Requisitos funcionais observados

- **RF-1 — Proposta:** orçamento guarda cliente/contato, itens, total, desconto, condição de pagamento, forma/endereço de entrega, data, validade, notas, tags e status. Status canônicos são `draft`, `sent`, `approved`, `rejected` e `expired`.
- **RF-2 — Cálculo:** formulário e Rules validam 1–10 itens, nomes não vazios, quantidades inteiras positivas, preço unitário em centavos, desconto percentual/fixo válido e total igual à soma dos itens menos o desconto. Desconto não pode superar subtotal. O formulário trabalha em centavos; a Rule atual compara o total com tolerância numérica de `0.0051` em vez de exigir explicitamente que `totalPrice * 100` seja inteiro.
- **RF-3 — Envio e elegibilidade:** interface permite converter orçamentos em `draft` ou `sent`. O backend exige o documento existente, permissão `quotes.edit`, estado `draft`/`sent`, vínculo do orçamento com o usuário autorizado (salvo admin) e validade ainda vigente. `rejected`/`expired` não são elegíveis; `approved` com pedido vinculado retorna o pedido existente.
- **RF-4 — Dados transferidos:** a interface monta nome e telefone do pedido a partir do orçamento, resume nomes/quantidades dos itens, mantém data de entrega, notas e tags, carrega classificação de permuta e conserva o total final. Se não houver cliente vinculado, tenta localizar cadastro pelo telefone; a tentativa de associação não bloqueia a conversão.
- **RF-5 — Distribuição do desconto:** `buildQuoteOrderPricing` aloca o total final em centavos nas linhas usando maiores restos, mantendo subtotais não negativos e soma exatamente igual ao total do orçamento. A conversão preserva as linhas em `orders.items`, com `pricingMode` `unit` para uma linha e `items` para múltiplas linhas.
- **RF-6 — Pagamento inicial:** aprovação não comprova pagamento ou sinal. A criação do pedido começa sem valor recebido; o backend normaliza o estado de pagamento pendente e saldo. Permuta mantém o total financeiro zero conforme o contrato de pedidos.
- **RF-7 — Persistência atômica:** a transação de `createOrder` grava o pedido, contador, `salesLedger`, atualização de estatísticas do cliente quando aplicável e vínculo/estado aprovado do orçamento. Ela registra `orderId`, `orderNumber`, `convertedOrderId` e campos de aprovação no orçamento.
- **RF-8 — Idempotência:** quando um orçamento já tem `convertedOrderId` ou `orderId`, o ramo de vínculo do orçamento retorna o pedido existente sem criar outro pedido/ledger/contagem. No código atual, um replay por `idempotencyKey` pode retornar um pedido existente antes de verificar `quotes.edit`; a autorização de conversão ainda não cobre todos os caminhos de replay.
- **RF-9 — Estado do orçamento:** salvar/envio/rejeição atualizam timestamps correspondentes. A validade pode ser apresentada como expirada no cliente; não há promessa de tarefa servidor que altere automaticamente status para `expired`.
- **RF-10 — Contrato de Rules:** Rules aplicam acesso por proprietário/admin/funcionário autorizado, validam a matemática do orçamento e impedem updates de valores incoerentes. Mudanças em Rules exigem validação no Emulator Suite.

## Critérios de aceitação do baseline

- **CA-1 (RF-2):** a interface recusa valores fora dos limites e cálculos inconsistentes; Rules recusam as combinações fora de sua validação atual. A exigência de igualdade inteira em centavos para gravações diretas ainda precisa reconciliar a tolerância `0.0051` com a constituição financeira do projeto.
- **CA-2 (RF-3):** orçamento elegível e não expirado pode seguir para conversão; orçamento inexistente, de outro proprietário sem permissão, sem `quotes.edit`, sem `orders.create`, rejeitado ou expirado não gera pedido.
- **CA-3 (RF-4, RF-5):** pedido convertido conserva os itens e o total final em centavos, inclusive quando o desconto distribui centavos de forma não uniforme entre linhas.
- **CA-4 (RF-6):** conversão não registra sinal como recebido; valores de pagamento iniciam conforme total/pagamento padrão do backend, e permuta não aparece como venda no ledger.
- **CA-5 (RF-7):** sucesso da conversão deixa pedido, ledger, contador e vínculo do orçamento consistentes dentro da mesma transação; falha não deixa orçamento aprovado sem o pedido/ledger transacionais.
- **CA-6 (RF-8):** o ramo de vínculo já retorna o pedido existente; retry pelo ID determinístico ainda exige cobertura explícita de autorização antes de ser considerado seguro para orçamento.
- **CA-7 (RF-9):** interface não descreve `validUntil` como agendamento de expiração no servidor; o endpoint decide elegibilidade na conversão.
- **CA-8:** conversão agora compara os campos materiais enviados pela tela com uma projeção construída do snapshot atual do orçamento na transação. Divergências recebem `failed-precondition` sem gravações; o Playwright ainda precisa cobrir a edição concorrente em outra sessão.

## Requisitos não funcionais e integridade

- **Autorização em camadas:** permissões visuais não bastam. A Function valida perfil/estado e permissões antes de usar Admin SDK; Rules protegem leituras e gravações diretas de orçamentos.
- **Matemática financeira:** trabalhar em centavos; não arredondar unitários independentemente de forma que o total transferido deixe de corresponder ao orçamento aprovado.
- **Transação e replay:** manter criação do pedido, ledger e vínculo do orçamento atômicos no caminho nativo. Não confirmar sucesso a partir de campos semelhantes sem o recibo/vínculo autoritativo.
- **Pagamentos:** aprovação comercial não equivale a entrada de caixa. O pedido começa pendente, exceto tratamento de permuta.
- **Compatibilidade:** preservar status, campos `orderId`/`convertedOrderId` e os contratos públicos da callable `createOrder`.

## Erros e casos-limite

- Permissão de orçamento existe, mas permissão de criar pedido foi revogada (ou vice-versa).
- Orçamento expirado, rejeitado, aprovado sem vínculo ou excluído.
- Payload de conversão baseado em orçamento editado por outra pessoa desde a tela que o abriu.
- Desconto extremo, alocação de centavos, linha com quantidade grande, item único com subtotal não divisível por quantidade.
- `customerId` ausente ou de outro tenant; busca não bloqueante não encontra cliente.
- Timeout depois do commit, leitura do pedido falha, usuário repete a aprovação.
- Orçamento já vinculado a pedido, mas cliente tenta reproduzir a operação sem autorização atual.
- Conversão por MCP falha entre atualização de status, criação do pedido e gravação do vínculo.

## Dados e contratos afetados

- Firestore: `quotes/{quoteId}`, `orders/{orderId}`, `salesLedger/{orderId}`, `users/{uid}/metadata/counters`, `customers/{customerId}`.
- Callable: `createOrder({ orderData, quoteId, idempotencyKey })`; preserva autenticação, autorização, resposta com identificador/número e retry idempotente.
- Campos do orçamento: `status`, `validUntil`, `items`, `discount`, `discountType`, `totalPrice`, `customerId`, `orderId`, `orderNumber`, `convertedOrderId`, `convertedOrderNumber`, `approvedAt`.
- Campos do pedido: cliente, itens, quantidade, preço, modo de preço, entrega, notas/tags, permuta e pagamento inicial pendente.

## Decisões e divergências

- **Confirmado:** fluxo nativo converte por `firebaseOrderService.createOrder(..., quoteId)` e a Function valida `quotes.edit`, `orders.create`, estado/validade e vínculo.
- **Confirmado:** conversão nativa grava vínculo do orçamento na mesma transação que pedido e ledger.
- **Confirmado:** a aprovação não registra sinal recebido.
- **Resolvido:** replays associados a `quoteId` revalidam perfil ativo/sessão e permissões antes de retornar, e verificam vínculo, titular e hash.
- **Resolvido:** Function deriva os valores persistidos do snapshot atual e rejeita payload materialmente divergente antes de qualquer escrita.
- **Resolvido:** Rules agora exigem total em centavos inteiros e igualdade exata com subtotal menos desconto arredondado; cobertura de emulador inclui fração de centavo, percentual e MCP 3 × R$ 100,00.
- **Divergência de canal:** fluxo MCP altera status do orçamento, executa criação por uma rota separada e grava vínculo depois; a atomicidade/idempotência não é a mesma do fluxo nativo. Tratar em spec própria antes de alterar ou anunciar paridade.
- **Em aberto:** `validUntil` é avaliado no servidor até o fim do dia, enquanto a interface também usa uma comparação de data; mudanças em fuso/semântica precisam de decisão explícita.

## Validação

- Revisão do fluxo da interface, serviço, Function, Rules e testes referenciados.
- `npm run typecheck` e `git diff --check` para esta entrega documental.
- Para mudanças futuras: `tests/unit/quote-conversion-pricing.test.ts`, `tests/unit/quote-conversion-idempotency.test.ts`, `tests/integration/create-order-function.test.ts`, `tests/integration/quotes-backend-validation.test.ts` e E2E `tests/e2e/critical-flows.spec.ts`, conforme área afetada.

## Evidências de conclusão

- As correções e validações estão registradas em [quote-conversion-integrity](../quote-conversion-integrity/spec.md), incluindo o cenário E2E de conflito entre sessões concluído no run referenciado nessa spec.
