# Segurança de pedidos e limite de expressões das regras

## Contexto

As regras do Firestore são avaliadas em cada gravação feita pelo cliente. Uma operação pode escrever mais de um documento, como `orders/{orderId}` e `salesLedger/{orderId}`, e as regras de ambos os documentos são parte do mesmo fluxo. Regras de acesso, validação de campos, arrays, pagamentos, etiquetas e leituras de documentos relacionadas consomem avaliações. O Firestore impõe um limite de expressões CEL; ao excedê-lo, a gravação pode retornar `PERMISSION_DENIED`, mesmo quando a pessoa está autenticada e tem a permissão funcional correta.

O total de avaliações depende do caminho de autorização e do conteúdo do pedido. Portanto, o limite de itens por si só não é uma garantia de que toda gravação custará o mesmo. Links de acompanhamento acrescentam campos que precisam ser preservados, e alterações transacionais em mais de um documento também precisam ser incluídas na análise.

## Decisão atual

O limite de negócio é **10 itens por pedido**. A validação é dividida para manter o fluxo comum rápido e limitar o custo das regras:

| Operação | Caminho | Validações principais |
| --- | --- | --- |
| Criar pedido com 1–10 itens | Cliente → Firestore | As regras verificam os itens, a soma da quantidade, o total, metadados e pagamento. |
| Editar totais com 1–4 itens | Cliente → Firestore | As regras verificam os novos dados e a soma exata dos itens. |
| Editar totais com 5–10 itens | Cliente → `updateComplexOrder` → Firestore Admin SDK | A Function valida autorização, versão, campos, itens, valores, pagamento e vínculo do cliente; atualiza pedido e `salesLedger` na mesma transação. |
| Editar totais quando o pedido anterior tinha 5–10 itens, mesmo reduzindo para 4 ou menos | Cliente → `updateComplexOrder` → Firestore Admin SDK | A Function valida o estado final. A regra também bloqueia escrita direta usando a quantidade de itens anterior, evitando contornar a validação ao remover itens. |
| Editar outros campos de um pedido com 5–10 itens | Cliente → Firestore | Continua permitido pelas regras quando não altera `items`, `price`, `quantity`, `pricingMode` ou `unitPrice`. |

O limiar de quatro itens é uma decisão operacional baseada no custo de avaliação das regras e na validação no emulador. Se as regras de acesso, ledger ou pedidos mudarem, reavalie esse limiar com testes de integração; não aumente o número por suposição.

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

Ajustes de estatísticas do cliente são reconciliados pelo serviço após a transação, como já ocorre no fluxo existente. Uma falha nessa reconciliação é registrada e não desfaz a edição do pedido.

## Segurança das regras

As regras continuam sendo uma barreira de autorização para gravações diretas. Quando uma edição de totais envolve uma lista atual ou anterior com mais de quatro itens, `isValidOrderChanges` nega a escrita direta. A chamada ao Admin SDK ocorre somente depois das verificações explícitas da Function.

Não remova esse bloqueio para “fazer o cliente tentar de novo”: isso reintroduziria o caminho caro e poderia permitir que gravações não validadas pelo backend fossem aceitas. Também não mova validações apenas para o frontend; qualquer cliente Firebase pode enviar payloads próprios.

## Testes de regressão

Os seguintes testes documentam o contrato atual:

- `tests/integration/orders-backend-validation.test.ts`: criação e regras com 1–10 itens, somas inválidas, acesso e bloqueio de atualização direta complexa;
- `tests/integration/complex-order-function.test.ts`: atualizações transacionais para cada quantidade de 1 a 10 itens, consistência do ledger, preservação de etiquetas e links, autorização, versão concorrente e rejeição de totais inválidos;
- `tests/unit/complex-order-validation.test.ts`: soma e quantidade corretas/incorretas para 1–10 itens, permissões, campos não permitidos, dados removidos e pagamento de permuta.

Execute os testes de regras e integração no emulador antes de alterar a regra ou o limiar. Uma rejeição esperada deve ser examinada para confirmar que foi negada pela condição correta, e não por estouro de avaliações CEL.

## Mudanças futuras

Se o limite de 10 itens mudar, atualize conjuntamente:

1. a validação de entrada da interface;
2. as regras de criação e seus testes de emulador;
3. a validação da Function e seus testes unitários/de integração;
4. este documento;
5. o pipeline e a publicação das regras e da Function no ambiente adequado.

Se o limite CEL voltar a ser atingido, registre qual operação, perfil, quantidade de itens, etiquetas, estado do ledger e tamanho do histórico de pagamento reproduzem o caso. Não trate `PERMISSION_DENIED` genérico como prova de perfil incorreto antes de examinar os logs do emulador/Firestore e a operação completa.

Ao incluir ou renomear uma Function de pedidos, mantenha a lista seletiva de deploys em `.github/workflows/deploy-dev.yml` atualizada. O fluxo seletivo por módulo não descobre automaticamente novos nomes exportados; sem essa entrada, uma execução direcionada ao escopo `orders` pode terminar sem publicar a Function necessária.
