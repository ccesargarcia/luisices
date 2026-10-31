# Plano de correção: idempotência e recuperação de pedidos

> Atualização: as correções foram implementadas no working tree pelo Codex. Este plano registra os achados anteriores; não reaplique suas etapas sem conferir o código. O contrato atualizado e os limites da recuperação estão em [docs/IDEMPOTENCIA_PEDIDOS.md](docs/IDEMPOTENCIA_PEDIDOS.md). A validação local utiliza um recurso temporário de compatibilidade do Node descrito nesse documento.

## Objetivo

Impedir pedidos duplicados, falsos sucessos e efeitos financeiros repetidos quando uma chamada à Function sofre timeout, a resposta se perde, a tela é recarregada ou o usuário tenta novamente. Aplicar a mesma garantia às edições complexas de pedidos.

Este documento orienta a implementação no estado atual da branch. Faça as correções e testes primeiro. **Não faça commit, push, deploy nem altere produção como parte desta tarefa.** Não remova nem sobrescreva trabalho que já esteja no working tree.

## Estado observado que precisa ser corrigido

1. `NewOrderDialog.tsx` guarda uma chave em `sessionStorage`, mas `resetForm()` remove a chave e cria outra. Como a abertura do modal chama `resetForm()`, fechar e reabrir depois de um timeout pode descartar a identidade da tentativa cujo resultado ainda é incerto. O formulário também é limpo, portanto não há como retomar a mesma operação com segurança.
2. `ArtisanPricingPage.tsx` cria uma nova chave dentro do handler de venda. Um novo clique após timeout passa outra chave e pode criar outro pedido.
3. `firebaseOrderService.ts` aceita a chave de criação e tenta recuperar o pedido, mas uma confirmação inconclusiva não fica registrada como operação pendente durável. Os fluxos de criação precisam compartilhar um contrato claro para preservar a mesma chave até a confirmação.
4. Na edição, `updateOrder()` gera um `operationId` quando o chamador não fornece um. `OrderDetailsDialog` não mantém nem reutiliza esse ID após erro/timeout; o próximo clique pode ser tratado como uma nova edição.
5. Em `functions/orders/index.js`, o replay de `lastOperationId` ocorre antes das verificações de autorização da edição e não está vinculado ao conteúdo da solicitação. Reutilizar o mesmo ID com outro payload pode receber um sucesso antigo, e a repetição pode contornar verificações atualizadas de acesso.
6. A idempotência de criação deve rejeitar colisão da mesma chave com payload diferente, em vez de devolver silenciosamente um pedido criado para outra intenção.

Confirme cada ponto no código antes de editar; se outro commit já o corrigiu, não reintroduza o problema. As linhas podem ter mudado.

## Regras de projeto

- Uma chave identifica uma **intenção específica**, não o conteúdo do pedido. Não deduza a chave por hash dos campos: duas compras intencionais iguais devem criar dois pedidos.
- Retry, reconexão, reabertura ou reload da mesma intenção reutilizam a mesma chave.
- Uma nova intenção recebe uma chave nova, mesmo que os dados sejam iguais.
- Nunca converta um resultado desconhecido em falha definitiva apenas porque uma leitura imediata não encontrou o documento.
- A autorização deve ser avaliada em toda chamada, inclusive em replay idempotente.
- Gravação do pedido e seus efeitos relacionados (ledger, contador, pagamentos, estatísticas) devem continuar atômicos e ocorrer no máximo uma vez por operação.
- Não reintroduza gravação direta do browser em `orders` nem fallback do browser para uma URL interna da Function. As mutações devem continuar pelo Worker/Function conforme a arquitetura existente; `ORIGIN_SECRET` permanece somente no servidor.
- As regras do Firestore devem continuar negando criação direta de `orders`. Não adicionar permissões amplas para contornar a validação da Function ou o limite de expressões.

## Fase 1 — Definir e implementar o contrato de operação

### 1.1 Criação

Defina um tipo/contrato explícito para criação, incluindo `idempotencyKey` e o estado da operação. A chave deve ser gerada antes da primeira chamada e passar por todos os níveis até `createOrder`.

Para cada formulário/fluxo:

- Guarde juntos o rascunho necessário para retomar e a chave pendente. Se a tela puder ser recarregada, use armazenamento persistente apropriado (por exemplo, `sessionStorage` ou IndexedDB), com um identificador de rascunho por instância do formulário. Uma chave global compartilhada por todos os pedidos não é suficiente.
- Ao fechar/reabrir o modal, recupere a operação pendente em vez de chamar uma rotina que apaga ou substitui sua chave. Ofereça uma decisão explícita para retomar ou descartar a tentativa inconclusiva; descarte só pode ocorrer depois de consultar/reconciliar o servidor ou de o usuário confirmar que deseja iniciar outra intenção.
- Limpe chave e rascunho apenas após confirmação do pedido persistido no servidor, ou após cancelamento seguro explicitamente tratado. Não limpar ao iniciar um retry.
- Se não for possível restaurar o rascunho, mostre que existe uma criação não confirmada e reconcilie pela chave antes de permitir uma nova criação equivalente.

### 1.2 Outros fluxos de criação

Revise todos os chamadores de `createOrder`, incluindo `ArtisanPricingPage`, conversão de orçamento, pedido de catálogo/lojinha, importação de planilha e duplicação de pedido.

- Venda avulsa: manter uma chave no estado da tentativa; um novo clique de retry reutiliza-a. Uma nova venda intencional gera outra.
- Conversão de orçamento/pedido de catálogo: usar identidade estável da origem e da ação de conversão, respeitando usuário/tenant e impedindo conversões duplicadas. Não usar uma chave genérica que colida entre origens.
- Importação: chave por linha/ação de importação, persistida enquanto a importação estiver pendente; duas linhas iguais continuam sendo intenções diferentes.
- Duplicação: criar a chave uma vez por ação de duplicar e mantê-la em retries; novo acionamento intencional gera outra.
- Não alterar a semântica de criação dos fluxos sem verificar o que acontece com operações antigas e pedidos existentes.

### 1.3 Edição complexa

O componente que inicia uma edição deve criar e manter o `operationId` antes da chamada. Em timeout/erro transitório, guardar o mesmo ID e o mesmo payload lógico para retry. Limpar o ID ao confirmar a edição ou quando o usuário descartar explicitamente aquela edição. Uma nova edição intencional recebe ID novo.

Evite gerar o ID dentro de cada chamada de baixo nível, pois isso transforma cada retry em outra operação. Se o payload mudar após um resultado inconclusivo, primeiro reconcilie a operação anterior; não reutilize sua chave com conteúdo diferente.

## Fase 2 — Tornar a idempotência confiável no backend

### Criação (`handleCreateOrder`)

- Validar formato e tamanho da chave; não substituí-la silenciosamente por ID aleatório quando inválida ou ausente em um fluxo que exige idempotência.
- Vincular a operação a usuário autenticado, escopo/tenant, tipo de fluxo e origem quando aplicável.
- Salvar uma impressão digital determinística do payload normalizado. Mesmo usuário + mesma chave + mesmo payload retorna o mesmo resultado. Mesma chave com payload diferente deve retornar erro explícito de conflito/`failed-precondition`, sem alterar dados.
- Fazer a verificação e todas as gravações dentro da mesma transação. Repetição ou concorrência não pode incrementar contador, criar ledger, gerar evento de pagamento/conversão ou atualizar estatísticas mais de uma vez.
- Não revelar um pedido de outro usuário ao detectar colisão de chave. Fazer as checagens de autorização antes de devolver qualquer resultado idempotente.

### Edição (`handleUpdateComplexOrder`)

- Validar o formato do `operationId` e calcular hash do payload normalizado recebido.
- Ler e validar perfil ativo, autorização para editar, vínculo/escopo e estado do pedido **antes** de responder a um replay como concluído.
- Registrar recibo de operação durável associado a usuário, pedido, hash do payload, resultado/versão e data. Preferir documento de recibo por operação ou mecanismo equivalente transacional; `lastOperationId` sozinho só lembra uma operação e pode ser sobrescrito por uma edição posterior.
- Mesmo usuário + mesmo pedido + mesmo `operationId` + mesmo hash retorna o resultado já aplicado sem repetir efeitos. Mesmo ID com outro usuário, pedido ou payload deve ser negado como conflito/acesso não autorizado.
- Atualizar recibo, pedido, ledger e efeitos financeiros na mesma transação. Validar comportamento em retry concorrente, respeitando os limites atuais do Firestore e sem ampliar regras client-side desnecessariamente.
- Preservar controle de versão e conflito de edições concorrentes. Idempotência não deve aceitar silenciosamente uma edição antiga como atualização nova.

## Fase 3 — Recuperar resultado incerto no cliente

Para criação e edição:

1. Diferencie rejeição definitiva (validação/permissão) de falha de transporte/timeout e de leitura inconclusiva.
2. Em timeout, consulte o servidor usando o ID/chave da operação. Se o backend tiver um endpoint de estado/recibo, prefira-o; não depender apenas de uma leitura que possa ocorrer enquanto a transação ainda está em andamento.
3. Se a operação estiver aplicada, devolver o pedido/versão persistidos e limpar o estado pendente.
4. Se ainda estiver processando ou não puder ser confirmada, manter chave e payload e mostrar mensagem clara: “não foi possível confirmar; tente verificar novamente”, sem sugerir criar outro pedido.
5. Se houver certeza de que a operação não foi aplicada, permitir retry com a mesma chave.
6. Erro de autorização ou validação não deve ser repetido automaticamente. Exibir a causa e manter os dados recuperáveis para correção.

Em `areUpdatesPersisted`, compare os campos editáveis solicitados após a mesma normalização usada pelo backend. Incluir observações e data do pagamento quando editáveis; comparar todos os campos relevantes dos itens. Tratar campos derivados pelo servidor (por exemplo, histórico e saldo restante) segundo o contrato, sem exigir igualdade ingênua. Avanço de `version` sozinho não prova que a edição correta foi persistida.

## Fase 4 — Testes obrigatórios

### Criação — unitários/cliente

- Timeout com gravação concluída: leitura/retry recupera o mesmo `orderId`.
- Primeira consulta não encontra o pedido porque a Function ainda processa: manter estado pendente e repetir com a mesma chave.
- Leitura do servidor falha após resposta de sucesso: manter a chave até confirmação posterior.
- Fechar e reabrir modal, recarregar a página e retomar a sessão: a operação pendente conserva chave e rascunho.
- Nova compra intencional com dados idênticos recebe chave distinta.
- Calculadora/venda avulsa: retry mantém chave; nova venda gera outra.
- Importação, catálogo, orçamento e duplicação: retries reutilizam a chave correta; operações/origens distintas não colidem.

### Criação — integração com Emulator Suite

- Mesmo usuário, chave e payload: uma ordem, um ledger, um incremento de contador e efeitos de cliente/pagamento uma vez.
- Duas chamadas simultâneas com mesma chave e payload: um único resultado e efeitos únicos.
- Mesma chave com payload diferente: conflito explícito e nenhuma segunda mutação.
- Outro usuário usando a chave: sem leitura, alteração ou vazamento do pedido original.
- Chave inválida, ausente em fluxo obrigatório ou limite excedido: erro claro e sem gravação parcial.

### Edição — integração com Emulator Suite

- Timeout após persistência e retry com mesmo `operationId`: mesma versão/resultado, sem segundo lançamento financeiro ou evento.
- Chamadas simultâneas idênticas com mesmo ID: aplicar uma vez.
- Mesmo ID com payload diferente, pedido diferente ou usuário diferente: conflito/negação.
- Usuário desativado ou sem permissão no replay: negar mesmo que a operação antiga tenha sido aplicada; não devolver dados protegidos.
- Versão avançada por outra edição sem aplicação do payload esperado: cliente não declara sucesso.
- Alteração de notas/data de pagamento, itens, quantidades e valores: confirmação considera os campos corretos e os campos derivados.
- Falha de leitura/resultado ainda incerto: mantém ID e dados; retry subsequente não duplica efeitos.

### Regressão de segurança e arquitetura

- Criação direta no Firestore segue bloqueada pelas regras.
- Cliente não recebe `ORIGIN_SECRET` nem endpoint interno secreto.
- Chamadas continuam passando pelo Worker/Function conforme o roteamento atual.
- Testes de regras existentes, validação de 1–10 itens, permissões, pagamentos e ledger continuam passando.

## Fase 5 — Execução e relatório

Depois de implementar, rode (ajustando os nomes reais dos scripts):

1. Testes unitários de `firebaseOrderService`, chamadas resilientes e componentes envolvidos.
2. Integrações `create-order-function.test.ts`, `complex-order-function.test.ts` e regressões de pedidos/ledger/permissões com Emulator Suite.
3. E2E de criar, editar, retry após timeout, reabrir/recarregar, importação, orçamento, catálogo e duplicação.
4. Typecheck e build de frontend/functions.
5. `git diff --check` e revisão do diff para garantir que não houve mudança acidental em regras, segredos ou dados.

Não diga que um teste passou se não foi executado. No Termux, a execução anterior falhou antes de iniciar os testes por erro do executável Node (`CANNOT LINK EXECUTABLE "node": cannot locate symbol "_ZNSt6__ndk113__hash_memoryEPKvm"`). Se persistir, informe testes como **não executados por bloqueio do ambiente**, e rode em CI ou ambiente Node compatível antes de aprovar deploy.

No relatório final, liste arquivos alterados, comportamento anterior e corrigido, decisões de armazenamento das chaves, comandos e resultados reais, riscos remanescentes e confirmação explícita de que não houve commit/deploy.
