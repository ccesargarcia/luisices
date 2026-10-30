# Segurança de pedidos e limite de expressões das regras

## Contexto

As regras do Firestore são avaliadas em cada gravação feita pelo cliente. Uma operação pode escrever mais de um documento, como `orders/{orderId}` e `salesLedger/{orderId}`, e as regras de ambos os documentos são parte do mesmo fluxo. Regras de acesso, validação de campos, arrays, pagamentos, etiquetas e leituras de documentos relacionadas consomem avaliações. O Firestore impõe um limite de expressões CEL; ao excedê-lo, a gravação pode retornar `PERMISSION_DENIED`, mesmo quando a pessoa está autenticada e tem a permissão funcional correta.

O total de avaliações depende do caminho de autorização e do conteúdo do pedido. Portanto, o limite de itens por si só não é uma garantia de que toda gravação custará o mesmo. Links de acompanhamento acrescentam campos que precisam ser preservados, e alterações transacionais em mais de um documento também precisam ser incluídas na análise.

## Decisão atual

O limite de negócio é **10 itens por pedido**. A validação é dividida para manter o fluxo comum rápido e limitar o custo das regras:

| Operação | Caminho | Validações principais |
| --- | --- | --- |
| Criar pedido com 1–10 itens | Cliente → `createOrder` → Firestore Admin SDK | A Function valida autorização, calcula somas, centavos, atualiza contador, pedido, `salesLedger`, estatísticas de cliente e grava `paymentEvents` atomicamente com idempotência. A regra bloqueia toda criação direta de pedidos pelo cliente. |
| Criar pedido simples sem itens (importações/legado) | Cliente → `createOrder` → Firestore Admin SDK | A Function valida o pedido e grava pedido, ledger, contador e estatísticas atomicamente. Toda criação direta de `orders` é bloqueada. |
| Editar pagamento ou classificação de permuta, com qualquer quantidade de itens | Cliente → `updateComplexOrder` → Firestore Admin SDK | A regra bloqueia alterações diretas a `payment` e `isExchange`. A Function valida autorização e versão, calcula os valores, e atualiza pedido, `salesLedger` e estatísticas afetadas na mesma transação. |
| Editar itens, quantidade ou preço, com qualquer quantidade de itens | Cliente → `updateComplexOrder` → Firestore Admin SDK | A Function valida a lista e os totais e atualiza pedido e `salesLedger` atomicamente. A regra bloqueia a escrita direta para não depender do custo CEL acumulado nem de um limiar por quantidade. |
| Trocar ou remover o cliente vinculado | Cliente → `updateComplexOrder` → Firestore Admin SDK | A Function reconcilia `totalOrders` e `totalSpent` entre os clientes na mesma transação. |
| Editar campos não financeiros | Function quando há `operationId`; cliente → Firestore nos demais fluxos permitidos | A edição pelo modal usa recibo da Function; outros fluxos mantêm controle de acesso, versão e lista de campos nas regras. |

Criações e edições financeiras encaminhadas às Functions usam Admin SDK e não avaliam as regras client-side do Firestore. Os demais caminhos diretos ainda estão sujeitos aos limites de avaliação; não ampliar essas regras com somatórios de itens. A recuperação de operações pendentes segue o contrato de [idempotência de pedidos](IDEMPOTENCIA_PEDIDOS.md).

## Responsabilidades da Function

`updateComplexOrder` não confia na checagem de acesso do frontend. Dentro de uma transação, ela:

1. exige usuário autenticado e perfil existente/ativo;
2. valida a autorização do proprietário, administrador ou funcionário atribuído com permissão de edição;
3. verifica `expectedVersion`, rejeitando gravação concorrente baseada em dados antigos;
4. aceita apenas campos editáveis e valida os dados resultantes, não apenas os campos enviados;
5. aceita de 1 a 10 itens e confere quantidade, preço unitário, subtotal e total em centavos;
6. confere consistência do pagamento e dos dados de permuta;
7. confere que o cliente vinculado pertence à conta dona do pedido;
8. mantém os campos existentes que não fazem parte da edição, incluindo os metadados de acompanhamento público;
9. atualiza pedido e `salesLedger` atomicamente, recusando um ledger que identifique outro proprietário.

O cliente nunca é fonte confiável para reescrever histórico financeiro durante uma edição. A Function preserva `payment.history` por compatibilidade com relatórios existentes e grava pagamentos e ajustes decorrentes de edições em `orders/{orderId}/paymentEvents/{eventId}` usando Admin SDK. Os documentos dessa subcoleção são append-only: regras negam escrita pelo cliente e permitem leitura apenas a quem já pode visualizar o pedido. O histórico embutido ainda é mantido como espelho legado; não houve migração retroativa dos dados existentes para a subcoleção. Pagamentos iniciais também geram eventos na criação autoritativa pela Function. As regras do `salesLedger` comparam os campos financeiros e o proprietário ao pedido após a operação, tanto na criação quanto na atualização, bloqueando registro falso ou alteração isolada do livro financeiro.

Quando o preço, o cliente vinculado ou a classificação de permuta muda, a Function remove a contribuição antiga e adiciona a nova em `totalOrders` e `totalSpent` na mesma transação do pedido e do `salesLedger`. Isso cobre edição de preço e troca/remoção de cliente, além de conversão de permuta, sem a janela em que uma segunda gravação de estatísticas poderia falhar. A criação autoritativa também atualiza essas estatísticas dentro da transação do pedido.

## Segurança das regras

As regras continuam sendo a barreira de autorização para gravações diretas. Elas negam alterações diretas de `payment`, `isExchange`, `customerId`, `items`, `price`, `quantity`, `pricingMode` e `unitPrice`, bem como toda criação direta de pedidos. As Functions usam Admin SDK somente depois de repetir autorização, validação e controle de concorrência.

Não remova esse bloqueio para “fazer o cliente tentar de novo”: isso reintroduziria o caminho caro e poderia permitir que gravações não validadas pelo backend fossem aceitas. Também não mova validações apenas para o frontend; qualquer cliente Firebase pode enviar payloads próprios.

## Testes de regressão

Os seguintes testes documentam o contrato atual:

- `tests/integration/orders-backend-validation.test.ts`: regras de acesso, campos imutáveis, bloqueio de criação/edição financeira direta pelo cliente e barreira em `paymentEvents`;
- `tests/integration/create-order-function.test.ts`: criação atômica no backend para 1–10 itens, persistência no `salesLedger`, atualização de contadores, subcoleção `paymentEvents` e idempotência;
- `tests/integration/complex-order-function.test.ts`: atualizações transacionais para cada quantidade de 1 a 10 itens, consistência do ledger, auditoria, estatísticas de permuta, preservação de etiquetas e links, autorização, versão concorrente e compactação com retenção de contagem;
- `tests/unit/complex-order-validation.test.ts`: soma e quantidade corretas/incorretas para 1–10 itens, permissões, campos não permitidos, dados removidos e pagamento de permuta.

Execute os testes de regras e integração no emulador antes de alterar as regras de criação ou de escrita direta. Uma rejeição esperada deve ser examinada para confirmar que foi negada pela condição correta, e não por estouro de avaliações CEL.

## Mudanças futuras

Se o limite de 10 itens mudar, atualize conjuntamente:

1. a validação de entrada da interface;
2. as regras de criação e seus testes de emulador;
3. a validação da Function e seus testes unitários/de integração;
4. este documento;
5. o pipeline e a publicação das regras e da Function no ambiente adequado.

Se o limite CEL voltar a ser atingido, registre qual operação, perfil, quantidade de itens, etiquetas, estado do ledger e tamanho do histórico de pagamento reproduzem o caso. Não trate `PERMISSION_DENIED` genérico como prova de perfil incorreto antes de examinar os logs do emulador/Firestore e a operação completa.

Ao incluir ou renomear uma Function de pedidos, mantenha a lista seletiva de deploys em `.github/workflows/deploy-dev.yml` atualizada. O fluxo seletivo por módulo não descobre automaticamente novos nomes exportados; sem essa entrada, uma execução direcionada ao escopo `orders` pode terminar sem publicar a Function necessária.

## App Check

App Check é uma defesa adicional contra chamadas automatizadas a partir de clientes não legítimos; ele não substitui autenticação, permissões, validação de dados nem rate limiting. `updateComplexOrder` ainda não exige App Check porque a ativação depende de cadastrar um provedor e chaves/domínios nos projetos Firebase e disponibilizar a chave pública do provedor ao frontend. Exigir App Check antes dessa configuração bloquearia clientes legítimos.

Antes de habilitar `enforceAppCheck` na Function:

1. registrar os domínios de produção e desenvolvimento no provedor escolhido e no Firebase App Check;
2. disponibilizar a chave pública por ambiente (`VITE_FIREBASE_APPCHECK_SITE_KEY`) sem incluir segredos privados no frontend;
3. inicializar App Check no cliente web e confirmar que o SDK Callable encaminha o token;
4. validar o fluxo no emulador e nos dois ambientes com enforcement desabilitado/monitorado;
5. ativar enforcement primeiro em desenvolvimento, verificar chamadas reais e só então planejar produção.
