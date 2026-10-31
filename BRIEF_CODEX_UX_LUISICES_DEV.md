# Brief para o Codex: tornar o luisices-dev mais amigável

Repositório: `ccesargarcia/luisices`.

## Objetivo

Melhorar a experiência conversacional e operacional das ferramentas MCP do
`luisices-dev`, especialmente nos fluxos de consulta, edição e mudança de status
de pedidos. O resultado deve reduzir idas e voltas, explicar impedimentos de
forma acionável e preservar as garantias atuais de segurança: prévia antes de
gravação, confirmação explícita, controle de versão e idempotência.

O público principal usa o assistente em português brasileiro, frequentemente no
celular. As respostas devem ter a conclusão primeiro, usar frases curtas e
mostrar detalhes apenas quando necessários para decidir a próxima ação.

## Evidência do problema

No fluxo atual, um operador pode pedir para concluir um pedido que ainda está
`pending`. A ferramenta de status impede corretamente a transição direta para
`completed`, mas retorna uma mensagem genérica indicando que os dados atuais não
permitem a ação. O operador não sabe qual condição falhou nem como resolvê-la.

Para concluir o pedido, foi necessário:

1. descobrir que ele precisava passar por `in-progress`;
2. solicitar uma confirmação para iniciar a mudança;
3. criar uma prévia;
4. pedir uma segunda confirmação para efetivar `pending -> in-progress`;
5. criar outra prévia para `in-progress -> completed`;
6. pedir uma terceira confirmação para efetivar a conclusão.

O bloqueio de transição e a confirmação são desejáveis. O problema é a falta de
orientação e o excesso de confirmações para uma intenção única e legítima:
"concluir o pedido".

## Escopo

Implementar, nesta ordem, melhorias de UX nas ferramentas MCP e nos textos que
elas retornam:

| Prioridade | Entrega | Benefício |
|---|---|---|
| P0 | Erros de transição de status acionáveis | O operador sabe exatamente o que fazer |
| P0 | Fluxo assistido para concluir pedido pendente | Menos passos, sem perder confirmação |
| P1 | Resumos operacionais de pedidos | Prioriza trabalho urgente e recebimentos |
| P1 | Edição guiada de pedido | Reduz ambiguidade ao editar |
| P2 | Filtro e identificação de dados de teste | Evita poluição da fila real |
| P2 | Alertas financeiros contextuais | Evita entrega/conclusão sem percepção de saldo |

Não incluir neste trabalho:

- alteração das regras de negócio de pagamento;
- alteração dos status válidos ou da máquina de estados sem revisão explícita;
- migração de banco de dados;
- automações que mudem pedidos sem confirmação;
- mudanças visuais grandes no aplicativo web fora do necessário para manter a
  compatibilidade dos dados e das APIs.

## Regras gerais de implementação

- Localizar primeiro as implementações de `update_order_status`,
  `query_orders_view`, `get_order_edit_form` e os handlers/serviços de pedido
  que eles usam. Reutilizar validadores e a máquina de estados existentes.
- Não enfraquecer a proteção contra atualização concorrente. Toda gravação deve
  continuar verificando a versão esperada.
- Toda operação mutável deve manter uma chave de idempotência.
- Nenhuma alteração deve ser gravada em uma chamada de prévia.
- O servidor deve continuar sendo a fonte de verdade para validar transições,
  valores financeiros e permissões; a camada MCP apenas apresenta um fluxo mais
  claro.
- Respostas destinadas a usuários devem estar em português brasileiro. Códigos,
  enumerações e contratos internos podem manter a convenção existente.
- Não usar mensagens genéricas quando a causa puder ser determinada. Retornar
  uma razão estável para integração e uma instrução legível para pessoas.

## Tarefa 1 — erros de status orientados à ação (P0)

### Problema

Uma tentativa inválida de `pending -> completed` retorna erro sem explicar que
o status intermediário obrigatório é `in-progress`.

### O que fazer

1. Centralizar ou reutilizar a regra de transição de status para que ela produza
   um resultado estruturado, não apenas sucesso/falha.
2. Quando uma transição for inválida, retornar:
   - `code`: identificador estável, por exemplo
     `STATUS_TRANSITION_REQUIRES_IN_PROGRESS`;
   - `currentStatus`: status atual;
   - `requestedStatus`: status pedido;
   - `allowedNextStatuses`: próximos estados aceitos;
   - `suggestedAction`: ação que o assistente pode oferecer;
   - `message`: frase curta para o operador.
3. Para um pedido pendente que se tenta concluir, a mensagem deve deixar claro:
   “Este pedido está pendente. Para concluí-lo, primeiro mova-o para Em
   produção.”
4. Se a falha for outra (versão desatualizada, falta de permissão, pedido
   inexistente, status cancelado etc.), retornar seu próprio código e instrução.
   Não mascarar qualquer erro como falha de transição.
5. Garantir que detalhes internos, IDs de infraestrutura ou dados de outro
   cliente não sejam expostos na mensagem.

### Contrato sugerido

```json
{
  "success": false,
  "code": "STATUS_TRANSITION_REQUIRES_IN_PROGRESS",
  "currentStatus": "pending",
  "requestedStatus": "completed",
  "allowedNextStatuses": ["in-progress"],
  "suggestedAction": "advance_to_in_progress_then_complete",
  "message": "Este pedido está pendente. Para concluí-lo, primeiro mova-o para Em produção."
}
```

O formato final deve seguir os padrões do projeto, mas os campos semânticos
acima devem permanecer disponíveis para o cliente MCP.

### Aceite

- Uma tentativa direta de concluir pedido pendente explica a transição
  obrigatória.
- Erros de permissão, concorrência e validação financeira continuam distintos.
- Nenhuma chamada inválida altera o pedido.

## Tarefa 2 — concluir pedido por fluxo assistido (P0)

### Intenção do operador

O operador deve poder dizer “conclua o pedido 0088” mesmo que o pedido esteja
pendente. O sistema deve montar um plano de transições válido, mas exigir **uma
confirmação explícita final** antes de gravar qualquer parte do plano.

### Proposta de contrato

Criar uma capacidade explícita no handler de atualização de status — por
exemplo, `targetStatus: "completed"` com modo assistido, ou uma ferramenta
separada como `prepare_order_status_change`. Escolher a opção que preserve
melhor a compatibilidade com consumidores existentes.

Na prévia, para um pedido `pending` solicitado como `completed`, retornar:

```json
{
  "success": true,
  "status": "preview",
  "requiresConfirmation": true,
  "plan": {
    "orderNumber": "#2026-0088",
    "expectedVersion": 1,
    "steps": [
      { "fromStatus": "pending", "toStatus": "in-progress" },
      { "fromStatus": "in-progress", "toStatus": "completed" }
    ]
  },
  "message": "O pedido será movido de Pendente para Em produção e depois para Concluído. Confirme para salvar."
}
```

### Regras obrigatórias

1. A prévia não pode mudar o pedido.
2. A confirmação deve incluir a versão observada na prévia e uma chave de
   idempotência.
3. Na confirmação, revalidar permissão, versão, estado inicial e todas as
   transições no servidor.
4. Executar as etapas de maneira atômica. Se a infraestrutura atual não permite
   atomicidade para histórico/auditoria, usar transação ou um mecanismo
   equivalente. Não deixar o pedido em `in-progress` se a etapa final falhar.
5. Registrar o histórico/auditoria de cada transição conforme o padrão já
   existente, identificando que elas pertencem à mesma ação assistida.
6. Repetir a confirmação com a mesma chave de idempotência deve devolver o mesmo
   resultado final, sem duplicar histórico ou efeitos colaterais.
7. Se o pedido já estiver `in-progress`, a prévia deve conter somente
   `in-progress -> completed`.
8. Se ele já estiver concluído, tratar como operação idempotente ou retornar uma
   resposta clara de “já concluído”, conforme padrão atual. Não recriar eventos.
9. Não usar esse fluxo para reabrir, cancelar ou alterar outros estados fora da
   política atual.

### Compatibilidade

- Manter `update_order_status` simples funcionando para transições de uma etapa.
- Consumidores existentes não podem passar a receber campos obrigatórios novos
  sem versão de contrato ou compatibilidade retroativa.
- Se for inviável incluir múltiplas etapas na ferramenta existente sem criar
  ambiguidade, adicionar uma ferramenta dedicada e documentar o uso para o
  agente conversacional.

### Aceite

- Um pedido pendente pode ser concluído com uma prévia e uma única confirmação
  final.
- Pedido em produção também pode ser concluído com prévia e confirmação.
- Concorrência entre prévia e confirmação falha sem gravar atualização parcial.
- Repetições idempotentes não causam efeitos duplicados.

## Tarefa 3 — consulta de pedidos orientada por prioridade (P1)

### Problema

Listar apenas os pedidos mais recentes não destaca o trabalho que exige ação
agora: atrasos, entregas de hoje, produção em andamento e pagamentos pendentes.

### O que fazer

1. Manter a lista detalhada de pedidos retornada atualmente.
2. Acrescentar ao resultado de `query_orders_view` um resumo opcional
   `operationalSummary`, calculado no servidor ou na camada de apresentação
   compartilhada:
   - pedidos atrasados não entregues;
   - pedidos com entrega hoje;
   - pedidos em produção;
   - total de saldo pendente dos itens retornados;
   - total de pedidos pendentes.
3. Definir “atrasado” de forma explícita: data de entrega anterior ao dia local
   do ateliê e status diferente de entregue/concluído, respeitando a convenção
   de fuso horário já usada no projeto.
4. Ordenação padrão recomendada:
   1. atrasados;
   2. entrega hoje;
   3. em produção;
   4. demais por data de entrega crescente;
   5. desempate por criação decrescente.
5. Permitir preservar a ordenação estritamente por criação por meio de parâmetro
   explícito, caso já seja contrato público. Não mudar silenciosamente uma
   integração que dependa dela.

### Exemplo de texto para o assistente

> Hoje: 3 entregas, 1 pedido em produção e R$ 99,16 pendentes de receber.
> Há 2 pedidos atrasados.

Não repetir essa frase para cada item. Em seguida, listar os itens mais
urgentes, com número, cliente, entrega, etapa e saldo.

### Aceite

- Dados de resumo batem com a lista filtrada retornada.
- Pedidos concluídos/entregues não entram como atrasados.
- Datas não mudam de categoria indevidamente perto da meia-noite no fuso do
  ateliê.

## Tarefa 4 — edição guiada de pedido (P1)

### Problema

Após abrir um pedido, o operador precisa formular livremente qual campo deseja
alterar. Isso é flexível, mas cria ambiguidade e aumenta erros em telas pequenas.

### O que fazer

1. Fazer `get_order_edit_form` retornar, além do estado atual, uma lista
   ordenada de campos editáveis e rótulos de apresentação:
   - cliente;
   - telefone;
   - itens/produtos;
   - quantidade;
   - valor total ou preço unitário;
   - data de entrega;
   - tema;
   - observações;
   - status, quando o fluxo de status suportar a alteração.
2. Incluir metadados mínimos por campo: tipo, obrigatório/opcional, limites,
   valor atual e se ele afeta preço ou pagamento.
3. Quando o usuário escolher um campo, validar somente a alteração solicitada,
   mas exibir as consequências pertinentes antes de gravar (por exemplo,
   alteração de quantidade ou preço recalcula total/saldo).
4. Separar edição financeira da mudança de status quando essa for a regra atual
   do domínio; não burlar validações usando um formulário genérico.
5. Para pedidos legados sem preços unitários conhecidos, preservar o
   comportamento existente de aceitar `items: null`. Nunca inventar preço
   unitário a partir do total.

### Exemplo de resposta curta

> Pedido #2026-0088 aberto. O que deseja editar?
> 1. Cliente  2. Itens  3. Quantidade  4. Valor  5. Entrega  6. Status  7. Observações

O agente conversacional continua podendo aceitar linguagem natural; as opções
são uma ajuda, não uma limitação.

### Aceite

- Campos imutáveis/auditáveis não aparecem como editáveis.
- Mudanças financeiras continuam passando por prévia, confirmação, versão e
  idempotência, conforme contrato atual.
- Os campos e validações são consistentes entre formulário, ferramenta de
  atualização e interface web.

## Tarefa 5 — separar dados de teste da operação (P2)

### O que fazer

1. Adicionar filtro explícito para incluir/excluir pedidos de teste, sem inferir
   produção apenas por cliente ou produto chamado “teste”.
2. Para novos registros, avaliar um campo booleano explícito como
   `isTestOrder`, com valor padrão `false`, visível apenas a operadores
   autorizados.
3. Para registros existentes, oferecer filtro por termo como solução imediata;
   não classificar automaticamente pedidos antigos nem alterar dados sem
   aprovação.
4. No resumo operacional, informar quando resultados de teste estão incluídos,
   se o filtro tiver sido habilitado.

### Aceite

- Um pedido real cujo produto contenha a palavra “teste” não é ocultado por
  engano.
- A visualização operacional padrão consegue excluir pedidos marcados
  explicitamente como teste.

## Tarefa 6 — alertas financeiros contextuais (P2)

### O que fazer

1. Ao preparar conclusão ou entrega de pedido com `remainingAmount > 0`, incluir
   aviso informativo e objetivo na prévia:
   “Há R$ X,XX pendentes de pagamento.”
2. O aviso não deve bloquear a operação se a política atual permite concluir ou
   entregar com saldo pendente.
3. Se houver política que bloqueia a ação, apresentar a regra e o valor
   pendente, sem oferecer confirmação que inevitavelmente falhará.
4. Não mostrar dados de pagamento além do que o operador já tem permissão de
   ver.

### Aceite

- Pedido quitado não recebe aviso financeiro.
- Pedido com saldo pendente recebe o valor formatado em real brasileiro.
- O aviso não altera status de pagamento nem valores.

## Estratégia de testes

Localizar a suíte existente e adicionar testes focados nos contratos acima.
Não substituir testes reais por snapshots extensos.

### Status e fluxo assistido

- `pending -> completed` simples retorna erro estruturado com próximo passo.
- Prévia assistida de conclusão de pedido pendente contém duas etapas e não
  altera persistência.
- Confirmação assistida conclui o pedido e registra transições corretamente.
- Falha de versão entre prévia e confirmação não altera status.
- Repetição com a mesma chave de idempotência não duplica efeitos.
- Pedido em produção gera plano de uma etapa.
- Permissão insuficiente falha antes de qualquer mudança.

### Resumo operacional

- Classifica atrasado, hoje e em produção conforme data/status.
- Não marca concluído ou entregue como atrasado.
- Total de saldo pendente é a soma correta dos pedidos filtrados.
- Cobre o limite de data no fuso horário configurado.

### Formulário e alertas

- Formulário lista somente campos editáveis.
- Campo financeiro informa consequência e mantém validação existente.
- Pedido com saldo produz aviso; pedido quitado não produz.
- Filtro de teste depende apenas de marcador explícito, não de texto livre.

## Rollout e observabilidade

1. Manter o comportamento anterior disponível enquanto os consumidores MCP
   adotam o contrato novo, caso a mudança seja incompatível.
2. Adicionar logs estruturados para:
   - prévias criadas;
   - confirmações efetivadas;
   - conflitos de versão;
   - transições rejeitadas por regra;
   - uso do fluxo assistido.
3. Nunca registrar telefone completo, observações do cliente, tokens ou chaves
   de idempotência em logs de amplo acesso. Usar identificador do pedido e
   códigos de erro.
4. Fazer rollout gradual se houver feature flags no projeto. Monitorar erros de
   confirmação e conflitos de versão antes de remover o fluxo antigo.

## Critério de conclusão

A implementação está pronta quando:

- todos os testes novos e os testes existentes relevantes passam;
- a mudança de pedido pendente para concluído exige somente uma prévia clara e
  uma confirmação final, sem atualização parcial;
- erros dizem o que aconteceu e indicam a próxima ação quando ela é segura;
- consultas destacam o trabalho urgente sem perder a lista detalhada;
- edição e alertas preservam autorização, consistência financeira, concorrência
  e idempotência;
- os contratos das ferramentas MCP alterados estejam documentados junto da
  implementação.
