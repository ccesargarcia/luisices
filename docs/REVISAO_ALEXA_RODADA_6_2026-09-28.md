# Revisão do módulo Alexa — rodada 6

Data: 2026-09-28  
Commit analisado: `d2154b2 fix(alexa): isolamento estrito de sessao e deduplicacao fail-closed (rodada 5)`

## Resultado

As mudanças da rodada 5 corrigem os problemas críticos identificados na rodada anterior:

- a reserva de deduplicação passou a falhar de forma segura, sem executar a intenção quando a transação não pode ser confirmada;
- o `Skill ID` é validado estritamente;
- rascunhos existentes exigem o mesmo `sessionId`, usuário, ambiente e vínculo;
- cancelamento e fallback não alteram rascunho de outra sessão;
- a transição de aprovação no app é condicional e detecta corrida entre confirmações;
- `approveAlexaDraft` propaga o `callerUid`, e a camada de pedidos falha fechada quando o serviço de autenticação não está disponível;
- respostas e estados de conversa continuam sendo persistidos antes do retorno.

## Validações executadas

- `npm test`: **203 testes aprovados**, 24 arquivos, 0 falhas;
- `npm run build`: **aprovado**;
- `node --check functions/alexa/*.js`: **aprovado**;
- `git diff --check`: **aprovado**;
- parsing manual: `R$ 12,50`, `12,50`, `R$ 0,00` e `1.234,56` aceitos; valores negativos e texto inválido rejeitados.

## Pontos restantes

### Médio — `requestId` não é obrigatório

Em `functions/alexa/index.js`, a deduplicação só é executada quando existe `envelope.request.requestId`. Uma requisição sem esse campo ainda pode alcançar efeitos de negócio. O handler HTTP deveria rejeitar o envelope antes do processamento quando `requestId` estiver ausente ou fora do formato esperado. Isso evita reprocessamento e reduz custo em chamadas malformadas.

### Médio — caminho sem `runTransaction` ainda permite processamento não atômico

O código possui um fallback baseado em `get()` quando `db.runTransaction` não existe. Em produção o Firestore fornece transações, mas esse fallback remove a garantia de reserva única e pode permitir duplicidade se uma implementação incorreta de banco for injetada. Para a política fail-closed, o ideal é retornar erro quando a operação de deduplicação não tiver suporte transacional.

### Médio — janela de deduplicação curta

Os registros de `alexaRequestDedupe` expiram em 150 segundos. Reentregas ou repetições fora dessa janela podem executar novamente a mesma requisição. A janela deve ser alinhada ao maior atraso/retry observado no canal Alexa, ou complementada por uma marca idempotente no rascunho/pedido para todos os efeitos.

### Baixo — resposta de fallback pode ficar inconsistente

Quando o `fallbackCount` já está no limite, uma sessão sem `sessionId` válido ou apontando para rascunho de outra sessão pode receber a mensagem de “três tentativas” sem que o documento correspondente seja expirado. Não há vazamento de dados nem alteração indevida, mas a mensagem pode ser enganosa.

### Baixo — código legado sem uso aparente

`getOrCreateDraft` permanece em `functions/alexa/dialog.js`, enquanto o fluxo principal usa a lógica transacional inline. Remover o helper ou cobrir explicitamente seu contrato reduz ambiguidade e manutenção futura.

### Baixo — autenticação dentro da transação

`commitAlexaDraft` consulta o Auth Service durante a transação do Firestore. Em caso de retry do Firestore, a chamada externa pode ocorrer mais de uma vez, aumentando latência e custo. Quando possível, valide o usuário antes da transação e mantenha dentro dela apenas a checagem necessária contra o documento.

## Limitações

Não foi possível comprovar nesta rodada comportamento real com Alexa/Echo, Firebase Emulator, Firestore/Storage em produção, latência ou faturamento. O build mantém os avisos existentes de assets não resolvidos em tempo de build e chunks grandes; eles não bloquearam a compilação.

## Conclusão

A rodada 5 está tecnicamente consistente e os testes cobrem as regressões principais. Antes de considerar o módulo pronto para produção, recomendo tratar como prioridade o `requestId` obrigatório, eliminar o fallback não transacional e revisar a janela de 150 segundos com métricas reais de retry.
