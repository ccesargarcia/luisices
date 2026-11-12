# Integridade na conversão de orçamento

- **ID:** `quote-conversion-integrity`
- **Status:** Em andamento — implementação backend/Rules concluída; E2E de conflito pendente
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-12
- **Baseline:** [Conversão de orçamento em pedido](../quote-to-order/spec.md)
- **Referências:** `functions/orders/index.js`; `src/app/components/quotes/QuoteDetailsDialog.tsx`; `src/app/components/quotes/quoteHelpers.ts`; `firestore.rules`; `tests/integration/create-order-function.test.ts`; `tests/integration/quotes-backend-validation.test.ts`; `tests/unit/quote-conversion-pricing.test.ts`; `tests/unit/quote-conversion-idempotency.test.ts`.

## Problema e contexto

A conversão nativa constrói `orderData` no navegador a partir do orçamento aberto na tela. `createOrder` valida autorização, status e validade do documento do orçamento, mas não compara todos os termos usados para montar o pedido com o conteúdo atual do orçamento. Assim, uma tela desatualizada ou um payload alterado pode não representar a versão que o backend aprovou.

Além disso, o replay por `idempotencyKey` procura `orders/{key}` antes de verificar a autorização específica do orçamento. E a Rule atual de matemática aceita uma diferença inferior a `0.0051` entre total informado e calculado, sem exigir diretamente que o total seja centavos inteiros.

Esta spec define uma correção para o caminho nativo, preservando o contrato da callable e a compatibilidade de dados. Ela não implementa nem unifica o fluxo MCP.

## Objetivos

- Fazer o backend converter apenas a versão do orçamento que o usuário viu e autorizou.
- Fazer o backend usar dados financeiros derivados do orçamento atual, sem confiar em `orderData` controlado pelo cliente.
- Validar permissões atuais de pedido e orçamento antes de qualquer resposta de replay associada à conversão.
- Exigir matemática exata em centavos nas gravações de orçamento aceitas pelas Rules.
- Manter criação, ledger, contador, estatísticas aplicáveis e vínculo do orçamento atômicos e idempotentes.

## Fora de escopo

- Unificar ou reescrever `executeUpdateQuoteStatus`/conversão MCP.
- Alterar cálculo comercial do orçamento, formatos de PDF, envio de e-mail/WhatsApp ou experiência de consentimento.
- Mudar status canônicos, nomes de callables ou contratos de pedidos não relacionados a `quoteId`.
- Migração de documentos históricos ou alteração de permissões de leitura/escrita fora de `quotes` e conversão.

## Decisão de implementação

1. Manter os argumentos públicos atuais de `createOrder`: `orderData`, `quoteId` e `idempotencyKey`.
2. Criar no backend uma projeção canônica do pedido a partir do snapshot de `quotes/{quoteId}` lido dentro da mesma transação. Derivar cliente, itens, quantidade, preço total, distribuição do desconto, entrega, notas/tags e permuta a partir do documento atual.
3. Comparar os campos materiais da projeção com `orderData` submetido. Para itens, comparar contra a normalização de transporte feita por `FirebaseOrderService.sanitizeOrderItems` (unitário arredondado a centavos e subtotal visual recalculado); isso não altera a projeção financeira que o backend persiste. Se o payload normalizado não corresponder, recusar com `failed-precondition`/estado não aplicado, sem gravação; a interface deve pedir recarga e revisão antes de nova confirmação. Após correspondência, persistir a projeção criada no backend, não o objeto cliente.
4. Definir `quote.userId` como titular/tenant do orçamento e do pedido convertido. O novo pedido e o `salesLedger` mantêm esse `userId`; `createdByUid` e `createdByName` registram o usuário que executou a conversão. O `customerId` existente deve pertencer a `quote.userId`; se estiver ausente, aceitar como enriquecimento opcional apenas cliente desse mesmo titular.
5. Para conversão não administrativa, exigir permissões previamente concedidas `quotes.edit` e `orders.create` no perfil ativo do agente que executa a ação. Administrador segue a política administrativa vigente. Ler e autorizar o orçamento antes de conferir `orders/{idempotencyKey}` e antes de retornar qualquer replay por `quoteId`; recibo/vínculo existente não substitui autorização atual.
6. Em replay com `quoteId` e `idempotencyKey`, aceitar pedido já existente somente se o orçamento autorizado estiver vinculado ao mesmo ID, o `userId` do pedido corresponder a `quote.userId` e o hash do comando for compatível. Sem `quoteId`, manter a checagem de titularidade atual (`existingData.userId === uid`).
7. Definir o cálculo das Rules em centavos inteiros: subtotal é soma de quantidade × unitário em centavos; desconto fixo usa centavos inteiros; desconto percentual é arredondado ao centavo segundo a mesma regra da aplicação; total em centavos deve igualar subtotal menos desconto. Rejeitar `totalPrice` que não represente centavos inteiros.

## Requisitos funcionais

- **RF-1 — Snapshot vigente:** conversão usa o orçamento lido pelo backend dentro da transação como fonte dos termos comerciais.
- **RF-2 — Consentimento da tela:** payload baseado em orçamento alterado depois de carregado é recusado sem gravar pedido, ledger, contador, cliente ou aprovação. A resposta indica que a operação não foi aplicada e orienta recarregar/revisar.
- **RF-3 — Dados autoritativos:** preço, itens, quantidades, desconto, cliente textual, entrega, notas, tags e permuta persistidos no pedido correspondem ao snapshot atual. `payment.paidAmount` inicia em zero; aprovação não é comprovante de sinal.
- **RF-4 — Cliente vinculado:** preservar `quote.customerId`; se ausente, aceitar associação sugerida somente após validar o documento do cliente no tenant permitido. Cliente inexistente ou de outro tenant impede a conversão.
- **RF-4a — Titularidade e autoria:** o pedido e o ledger pertencem a `quote.userId`, que representa o titular/tenant do orçamento. A pessoa que aprovou fica registrada em `createdByUid`/`createdByName`; seu UID não substitui a titularidade do orçamento.
- **RF-5 — Autorização em replay:** conversão nova, replay por chave de criação e replay por vínculo de orçamento revalidam perfil/sessão, `orders.create` e `quotes.edit` conforme política atual antes de retornar sucesso.
- **RF-6 — Replay vinculado:** em conversão, uma chave de criação só reconhece pedido existente se `quoteId` está autorizado e o orçamento aponta para esse mesmo pedido; o owner do pedido coincide com `quote.userId` e o hash do comando coincide. Criação sem orçamento mantém a validação de titularidade existente.
- **RF-7 — Atomicidade/idempotência:** sucesso cria um pedido e ledger, atualiza contador/estatísticas aplicáveis e grava vínculo do orçamento na mesma transação. Retry autorizado retorna o mesmo pedido; payload conflitante não vira sucesso.
- **RF-8 — Centavos no orçamento:** `totalPrice`, preços unitários e desconto em valor fixo são valores representáveis em centavos inteiros; o resultado da fórmula calculada tem igualdade exata em centavos.
- **RF-9 — Percentual:** desconto percentual segue a fórmula existente do frontend, com desconto em centavos arredondado uma vez ao final da aplicação da porcentagem ao subtotal em centavos.
- **RF-10 — Compatibilidade MCP:** orçamentos criados pelo MCP que usam `Math.ceil(total/quantity)` e desconto fixo de ajuste continuam válidos e editáveis sob a Rule estrita.
- **RF-11 — Limites CEL:** reestruturação de `isValidQuoteMath` mantém validação de no máximo 10 itens e dentro dos limites CEL/AST, com avaliação curta e caminhos de atualização inalterada preservados quando aplicável.
- **RF-12 — Normalização do transporte:** validar itens após a normalização monetária aplicada pelo serviço frontend, mas persistir preços de linha e total alocados em centavos pela projeção do backend; arredondamento visual do preço unitário não pode alterar o valor do orçamento.

## Critérios de aceitação

- **CA-1 (RF-1, RF-2):** alterar preço/itens/validade/status do orçamento após a tela carregar e tentar aprovar com payload antigo resulta em rejeição sem efeitos persistidos.
- **CA-2 (RF-3):** payload manipulado com total, item, desconto, data ou notas divergentes do snapshot é rejeitado; payload correspondente gera pedido a partir da projeção calculada pelo backend.
- **CA-3 (RF-4, RF-4a):** pedido e ledger usam `userId` do orçamento; autoria registra o agente que converteu. Vínculo existente não pode ser trocado; vínculo ausente pode ser preenchido apenas com cliente do mesmo `quote.userId`; cliente de outro tenant é recusado.
- **CA-4 (RF-5):** revogar `quotes.edit` (mantendo `orders.create`) antes de repetir a chave ou `quoteId` bloqueia a resposta de replay; revogar `orders.create` também bloqueia.
- **CA-5 (RF-6):** replay por chave com `quoteId` só retorna se o orçamento aponta para aquele pedido, titular coincide e hash é compatível; sem `quoteId`, permanece a checagem de titularidade atual.
- **CA-6 (RF-7):** após sucesso, exatamente um pedido, um ledger e um vínculo coerente existem; falhas ou concorrência não deixam estados parciais. Retry autorizado não incrementa contador nem estatísticas novamente.
- **CA-7 (RF-8):** Rules rejeitam `totalPrice`, unitário ou desconto fixo com fração de centavo e aceitam os cálculos válidos com centavos inteiros.
- **CA-8 (RF-9):** descontos percentuais que produzem frações de centavo usam o mesmo arredondamento do frontend; total persistido equivale exatamente ao total calculado.
- **CA-9 (RF-10):** orçamento MCP de R$ 100,00 em 3 unidades continua válido com ajuste fixo de arredondamento e permite edição posterior.
- **CA-10 (RF-11):** testes de Rules no emulador cobrem 1–10 itens, valores válidos e inválidos, sem estourar expressões CEL ou profundidade AST.
- **CA-11:** status aprovado, pedido, ledger, dados do cliente e pagamento continuam obedecendo ao baseline `quote-to-order`.
- **CA-12 (RF-12):** em orçamento com linhas 3 × R$ 10,00 e 1 × R$ 10,00, desconto fixo R$ 0,01, o payload normalizado da interface (subtotais visuais R$ 30,00 e R$ 10,00) é aceito; o pedido persiste total R$ 39,99 e linhas totalizando exatamente 3.999 centavos conforme a alocação backend.

## Autorização e integridade

- A Function é autoridade para autorização e snapshot de conversão; validações de UI servem para UX, não segurança.
- O usuário precisa manter autorização para criar pedido e converter o orçamento no momento do retry, inclusive quando a operação já foi aplicada.
- `quote.userId` é a fonte de titularidade do pedido e ledger; o usuário autenticado é o ator, não passa a ser dono por executar a conversão.
- Agentes não administradores precisam ter `quotes.edit` e `orders.create` previamente concedidas no perfil ativo. Não inferir permissão por atribuição, papel de funcionário isolado, telefone ou nome.
- O cliente vinculado precisa pertencer ao `quote.userId`; não aceitar vínculo entre tenants.
- A conversão não registra pagamento recebido e não deve acrescentar métodos/estados financeiros.
- Nenhuma escrita ocorre antes de completar leituras/validações da transação; o orçamento, pedido e ledger são confirmados juntos.

## Dados e contratos

- Callable pública `createOrder` preserva nome, argumentos e forma de resposta.
- `orderData` continua aceito no contrato, mas em conversões com `quoteId` seus campos materiais precisam corresponder à projeção de servidor; dados persistidos vêm da projeção canônica.
- Sem `quoteId`, o fluxo existente de criação continua inalterado.
- A Rule de `quotes` mantém compatibilidade com registros sem campos opcionais e com geração MCP válida.

## Validação

- Unitários backend: projeção canônica, igualdade com payload, edição concorrente, campos opcionais e normalização de centavos.
- Integração Functions: conversão válida, normalização frontend de preços unitários fracionários, snapshot desatualizado, alteração maliciosa, chave repetida, permissão revogada e transação sem efeitos parciais.
- Integração Rules/Emulator: total/unitário/desconto com centavo fracionário rejeitados; percentuais e exemplos válidos aceitos; 1–10 itens e orçamento MCP 3 × R$ 100,00.
- E2E: aprovar orçamento atual funciona; orçamento alterado em outra sessão exige recarga e nova confirmação.
- Sempre executar `npm run typecheck`; lint de Functions e suítes específicas conforme skills `luisices-functions-deploy`, `luisices-firestore-rules`, `luisices-order-ledger-audit` e `luisices-test-suite`.

## Decisões registradas

- O pedido convertido pertence ao mesmo titular registrado em `quote.userId`; o executor aparece em campos de autoria.
- Funcionário só converte quando o perfil ativo já tem `quotes.edit` e `orders.create`; a autorização deve ser revalidada em conversões novas e replays.
- Payload desatualizado deve ser recusado e exigir recarga/revisão antes de nova confirmação.
- A normalização visual do serviço cliente serve apenas à comparação do comando; valores financeiros persistidos vêm da alocação backend em centavos.

## Evidências de conclusão

- Implementado em `functions/orders/index.js`: projeção do orçamento dentro da transação; comparação de campos materiais; rejeição `failed-precondition` sem efeitos; validação de permissão do ator antes do replay; pedido/ledger/contador/cliente associados ao tenant do orçamento; autoria registrada separadamente; validação de titularidade e hash nos replays.
- Implementado em `firestore.rules`: total exato em centavos e arredondamento único do desconto percentual; teste de compatibilidade MCP 3 × R$ 100,00.
- Implementado em `functions/orders/index.js`: comparação contra a normalização monetária efetiva da callable, mantendo os subtotais exatos do backend. Integração cobre 3 × R$ 10,00 + 1 × R$ 10,00 com R$ 0,01 de desconto e confirma a persistência de 3.999 centavos.
- Interface atualizada em `src/app/components/quotes/QuoteDetailsDialog.tsx` para avisar e atualizar quando a Function detectar snapshot desatualizado.
- Validação observada: `npm run typecheck`, lint das Functions, integração Functions/Rules (56 testes), suites focadas de segurança/MCP/startup (57 testes) e suíte unitária completa (1.516 passaram, 1 ignorado) passaram. `git diff --check` passou.
- Pendente: executar o novo cenário Playwright em Linux. O teste cria duas sessões autenticadas, altera o orçamento na segunda e tenta aprovar o snapshot antigo na primeira; o workflow `test:critical` já inclui `critical-flows.spec.ts`. A tentativa local falhou antes de iniciar os testes porque o Playwright instalado não oferece suporte à plataforma Android do Termux (`Unsupported platform: android`); não foi reportada como falha de assertions. O CI remoto ainda precisa receber estas alterações.
