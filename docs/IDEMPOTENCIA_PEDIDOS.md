# Pedidos: repetição segura e recuperação após timeout

## Contrato

Uma chave identifica uma intenção de criação ou edição. Duas compras iguais e intencionais recebem chaves diferentes. Uma tentativa cujo resultado ainda não foi confirmado conserva a chave e o comando completo, inclusive datas, campos opcionais e versão esperada.

`pendingOrderOperations.ts` guarda uma cópia serializada em `sessionStorage`, separada por usuário e fluxo, com memória como alternativa quando o navegador bloqueia armazenamento. Isso permite retomar no mesmo navegador/aba após reload ou reabertura do modal. Não garante recuperação após fechar a sessão, apagar os dados do navegador ou trocar de dispositivo; nesses casos, consultar os pedidos antes de repetir uma criação. Os registros pendentes não expiram automaticamente.

O modal de criação, a calculadora, o orçamento rápido e a duplicação preservam o payload da tentativa. A edição do modal mantém o comando original e sua versão. Enquanto houver resultado desconhecido, o fluxo oferece confirmação da tentativa anterior antes de permitir uma nova intenção. A criação prévia de um cadastro de cliente e uploads de anexos continuam operações separadas da criação do pedido.

## Backend

`createOrder` calcula SHA-256 do comando enviado, com chaves de objetos ordenadas e sem campos `undefined`. A impressão inclui etiquetas, atribuição, cor e pagamento, além dos dados financeiros. Não inclui datas geradas pelo servidor: o hash é calculado a partir do comando, antes de seus efeitos. O ID transportado no payload não compõe o hash.

A transação verifica o documento identificado pela chave. Mesmo usuário, chave e hash de versão 2 retornam o pedido existente sem repetir contador, ledger, eventos ou estatísticas. Outro usuário, payload diferente ou chave antiga sem comprovação compatível não recebem sucesso silencioso. Não há migração de preços, pagamentos ou documentos existentes nesse mecanismo.

`updateComplexOrder` calcula o hash de `{ expectedVersion, updates }` e registra atomicamente:

```text
orders/{orderId}/operationReceipts/{operationId}
  userId, orderId, operationId, payloadHash, hashVersion: 2, version, createdAt
```

Antes de responder a qualquer repetição, verifica sessão, perfil ativo e permissão atual. O recibo pertence ao usuário que executou a operação, inclusive quando outro administrador pode editar o pedido. Sua leitura precede a normalização financeira e a verificação da versão atual: uma operação antiga confirmada continua reconhecida mesmo após uma edição posterior. A resposta não reaplica os dados antigos.

`lastOperationId` é metadado auxiliar; não substitui o recibo como prova. Se não há recibo e a versão é incompatível, a Function rejeita com `details.operationState = 'not-applied'`. O cliente pode liberar essa edição e carregar a versão atual. Erros de transporte mantêm o resultado desconhecido e o comando pendente.

Os recibos são gravados somente pelo Admin SDK; o cliente não tem permissão para criá-los, alterá-los ou removê-los. A confirmação passa pela Function, sem novas regras de cálculo CEL. A criação direta de `orders` continua bloqueada. A edição não retorna ao caminho direto só porque seus valores já aparecem no documento.

## Interface e confirmação

Encontrar um pedido com a chave, um `lastOperationId` igual ou campos aparentemente iguais não prova que o servidor aceitou o comando exato. Por isso o serviço envia o retry à Function e preserva erros definitivos sem convertê-los em sucesso. Os códigos do Firebase são tratados com ou sem o prefixo `functions/`.

Depois da confirmação, a interface lê o pedido no servidor. Na edição, mostra a versão atual, sem sintetizar `version + 1` nem sobrescrever localmente uma alteração posterior. Se a leitura falhar, mantém o comando pendente para confirmação posterior.

Baixa de estoque da calculadora, uploads e vínculo com galeria continuam fora da transação do pedido. A idempotência do pedido não é uma garantia de atomicidade desses processos. Uma interrupção nesses passos exige conferência antes de repetir ações auxiliares.

## Validação

- `tests/unit/pending-order-operations.test.ts`: restauração, cópia independente do formulário, separação por usuário/fluxo e nova intenção.
- `tests/unit/resilient-callable.test.ts`: timeout, leitura após sucesso, payload conflitante, códigos reais do SDK e retry pela Function.
- `tests/integration/create-order-function.test.ts`: criação com 1–10 itens, concorrência, contador/eventos únicos e campos completos do hash.
- `tests/integration/complex-order-function.test.ts`: recibos com/sem cliente, replay após edição posterior, permuta, concorrência, estatísticas e autorização revogada.
- `tests/integration/orders-backend-validation.test.ts`: barreiras client-side, incluindo falsificação de recibos pelo proprietário e administrador.

Executar os testes de integração em projeto `demo-*` no Emulator Suite. Publicar primeiro as Functions compatíveis e depois o frontend; sem backend atualizado, o cliente não dispõe da confirmação por recibo. Esta mudança de código não publica o ambiente automaticamente.

No Termux desta revisão, o Node precisou de uma biblioteca temporária que fornece `std::__ndk1::__hash_memory`, compilada a partir do algoritmo do header libc++ instalado. Foi carregada somente nos processos de validação via `LD_PRELOAD`, sem substituir bibliotecas do sistema ou adicionar binários ao repositório. A CI deve repetir as validações com o Node suportado pelo projeto, sem esse recurso local.
