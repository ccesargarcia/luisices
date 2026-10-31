# Tarefa: reforçar a validação de pedidos no backend do Firestore

Analise e implemente uma validação no servidor para impedir que um cliente modificado ou uma chamada direta ao Firestore grave pedidos inválidos ou sobrescreva campos que o usuário não pode alterar.

## Contexto atual

O app grava pedidos diretamente no Cloud Firestore usando o SDK cliente. O serviço `firebaseOrderService` faz validações e sanitização antes de gravar, mas essas verificações rodam no navegador e podem ser contornadas.

As regras atuais em `firestore.rules` controlam quem pode criar, editar e excluir pedidos e validam alguns campos, como preço total, quantidade, status e pagamento. Porém, não validam a estrutura de `items` nem limitam explicitamente todos os campos que um usuário autorizado pode modificar.

A edição agora envia `items: null` intencionalmente quando os preços unitários de um pedido legado são desconhecidos. Esse `null` deve continuar permitido para representar a ausência de preços por item. Não deve ser convertido em preços médios ou zeros fictícios.

## Objetivo

Fazer com que a autorização e a validação dos campos do pedido sejam aplicadas pelas regras do Firestore, no servidor, sem depender apenas da validação no frontend.

## Requisitos de implementação

### 1. Preservar a lógica de autorização existente

- Manter as regras atuais de acesso para administradores, proprietários e funcionários atribuídos a pedidos.
- Não ampliar permissões como consequência da nova validação.
- Preservar as restrições existentes para `userId` e `assignedTo`.

### 2. Restringir os campos que podem ser alterados

- Definir explicitamente os campos que podem mudar em uma atualização de pedido.
- Bloquear alterações em campos de identidade, propriedade ou auditoria, como `userId`, `orderNumber`, `createdAt` e outros campos imutáveis.
- Revisar os fluxos existentes antes de definir a lista: alguns campos podem ser atualizados por funções ou processos legítimos, como status de arquivamento, pagamento, atribuição ou dados usados pelo catálogo.
- Evitar bloquear operações já válidas do app.

### 3. Validar os itens estruturados

- Aceitar `items: null` explicitamente para pedidos sem preços unitários conhecidos, especialmente pedidos legados.
- Quando `items` for uma lista, validar os campos de cada item:
  - `name`: string não vazia e com limite de tamanho;
  - `quantity`: inteiro positivo dentro de um limite razoável;
  - `unitPrice`: número finito e não negativo;
  - `price`: número não negativo e consistente com `quantity × unitPrice`, com tolerância adequada para arredondamento em centavos.
- Limitar a quantidade máxima de itens por pedido para manter as regras viáveis e previsíveis.
- Rejeitar tipos, valores negativos, campos obrigatórios ausentes ou itens malformados.
- Definir se campos adicionais em cada item são permitidos. Se forem, documentar quais; se não forem, rejeitá-los.

### 4. Validar a consistência entre pedido e itens

- Quando houver uma lista válida de itens, validar a relação entre os itens e os campos agregados do pedido, como `quantity`, `price`, `pricingMode` e `unitPrice`, conforme aplicável.
- Não exigir a soma dos itens quando `items` for `null`, pois esse valor representa informação indisponível, não necessariamente um pedido sem valor.
- Não inferir preços unitários individuais a partir do total agregado.
- Permitir que um pedido legado preserve o total histórico e os dados de pagamento quando seus preços unitários não podem ser recuperados.

### 5. Validar pagamentos

- Manter a validação de consistência já existente entre total, valor pago, saldo restante e status de pagamento.
- Garantir que a alteração de `price`, `payment` ou ambos não permita saldo inconsistente nem valor pago acima do total.
- Confirmar que a edição de status do pedido, sem alteração financeira, continua funcionando.

### 6. Tratar concorrência no servidor

- Verificar se a proteção atual baseada em `expectedVersion` é suficiente: ela é conferida no serviço cliente, portanto não deve ser considerada uma proteção contra clientes modificados.
- Avaliar uma condição equivalente nas regras do Firestore para impedir atualizações com versão desatualizada, caso isso possa ser feito sem quebrar fluxos existentes.
- Se não for possível garantir essa condição com segurança nas regras, explicar a limitação e indicar se esse caso exigiria uma Cloud Function.

### 7. Compatibilidade com as regras do Firestore

- As regras do Firestore não permitem percorrer listas com um laço genérico. Se for necessário validar cada item por índice:
  - estabelecer um limite máximo explícito;
  - validar cada posição permitida;
  - tratar listas menores sem acessar índices inexistentes;
  - manter a regra dentro dos limites de complexidade e acesso do Firestore Rules.
- Se validar a estrutura completa dessa forma ficar frágil ou difícil de manter, comparar com uma Cloud Function callable e justificar a escolha, considerando custo, latência e complexidade.
- Lembrar que o SDK administrativo usado por Cloud Functions ignora as regras do Firestore; a função precisaria reimplementar autorização e validação.

## Testes necessários

Adicionar ou atualizar testes de regras do Firestore para comprovar que:

- um usuário autorizado pode atualizar um pedido válido;
- usuário sem permissão não pode alterar o pedido;
- usuário autorizado não pode alterar `userId`, `orderNumber` ou outros campos imutáveis;
- `items: null` é aceito para pedidos sem preços unitários conhecidos;
- uma lista válida de itens com preços distintos é aceita;
- item com preço negativo, quantidade inválida, nome vazio ou subtotal inconsistente é rejeitado;
- lista acima do limite permitido é rejeitada;
- campos extras proibidos são rejeitados;
- alteração de total ou pagamento inconsistente é rejeitada;
- uma edição legítima de status continua funcionando sem alterar preços;
- a lógica de concorrência funciona conforme a solução escolhida.

Execute os testes de regras e os testes unitários relevantes. Se o emulador já fizer parte do fluxo do projeto, use-o; não teste somente a função de sanitização executada no cliente.

## Restrições importantes

- Não alterar nem remover os controles de autorização existentes sem justificativa.
- Não transformar preços desconhecidos em `0` ou em médias calculadas a partir do total.
- Não usar somente validação TypeScript, React ou `firebaseOrderService` como prova de validação no backend.
- Não fazer deploy das regras ou de Cloud Functions sem autorização explícita.
- Não fazer merge para `main` nem push, a menos que isso seja solicitado separadamente.
- Ao concluir, resumir os arquivos alterados, as validações adicionadas, os testes executados e qualquer limitação restante.
