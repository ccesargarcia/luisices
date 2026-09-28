# Alexa — terceira verificação, 27/09/2026

## Conclusão

As duas regressões bloqueadoras de ordem das transações foram corrigidas. Também foram corrigidos a confirmação com identidade herdada, a reapresentação do resumo após divergência de revisão e os exemplos monetários da revisão anterior. **Ainda há falhas importantes de concorrência, deduplicação e validação; a implementação não está totalmente aprovada.**

Estado analisado: HEAD `8e35594`, incluindo `d9ea5e0` e todas as alterações locais pendentes. Há arquivos de implementação e testes ainda fora dos commits; validar o checkout completo não comprova que apenas os commits contenham todas as correções. Nenhuma implementação foi alterada nesta rodada.

## Correções verificadas

| Item anterior | Resultado atual | Evidência |
| --- | --- | --- |
| Leitura após escrita no commit de pedido | Corrigido | Construção da transação passou pela verificação da classe Transaction do SDK instalado |
| Leitura após escrita na aprovação de pareamento | Corrigido | Mesma verificação; permissão agora lida antes das escritas |
| Confirmação sem pessoa atual | Corrigido no diálogo | YesIntent sem personId atual manteve rascunho em awaiting_confirmation e não criou pedido |
| Revisão divergente sem resumo novo | Corrigido para revisão divergente presente | Resposta passou a conter cliente, produto, quantidade, data e preço atualizados |
| Campo errado de permissão no formulário | Corrigido por inspeção | Users.tsx usa targetPermission; ainda há corrida de carregamento descrita abaixo |
| `1.500,00 reais` interpretado como 501 | Corrigido | Agora retorna 1500 |
| `centavos` sem quantia | Corrigido | Retorna inválido |
| Conteúdo após `10 reais e 50 centavos` | Corrigido | Retorna inválido |
| Tags web perdiam atributos no hook | Corrigido por inspeção | Objetos Tag são preservados |
| Leitura Firestore antes de rejeitar HTTP inválido | Corrigido, com ressalva de Skill ID | Verificação HTTP antecede getAlexaConfig(db) |

Testes adicionais do serviço de commit, com dados locais, rejeitaram integração desligada, vínculo reassociado, modo alterado para app_approval e cota horária atingida. Replay sequencial retornou isReplay, manteve um pedido e contadores de cota em 1.

## Pendências reproduzidas e encontradas

### 1. Alta — deduplicação ainda permite executar duas vezes a mesma requisição

**Referências:** `functions/alexa/index.js:69-87,103-113,188-200`.

Continua o padrão get → executar → set, sem reserva atômica. A escrita da resposta continua sem await.

**Reprodução nesta rodada:** duas chamadas simultâneas de LinkVoiceIntent com o mesmo requestId criaram **dois códigos de pareamento e respostas diferentes** em armazenamento em memória. Isso não foi corrigido pelos commits novos.

**Necessário:** aquisição atômica por requestId, persistência aguardada e recuperação de operação interrompida. O cache da resposta ainda persiste código de pareamento em texto; definir proteção e retenção compatíveis. O teste atual de cache já preenchido não cobre essa corrida.

### 2. Alta — correções concorrentes continuam sobrescrevendo dados

**Referências:** `functions/alexa/dialog.js:437` (carregamento do rascunho), `dialog.js:714` (persistência do resumo); também cancelamento e fallback no mesmo arquivo.

O diálogo continua sem runTransaction e sem correlação por sessionId. Não há comparação atômica entre revisão lida e revisão gravada.

**Reprodução:** cliente e produto corrigidos simultaneamente a partir da revisão 2. Resultado final: produto novo, **cliente antigo**, revisão 3. Uma atualização foi perdida. A filtragem inicial de estados também não impede uma escrita atrasada de sobrescrever um cancelamento ocorrido após a leitura.

**Necessário:** transições transacionais com revisão, titularidade e estado; incluir cancelamento e fallback. Exigir revisão de confirmação também quando ela estiver ausente.

### 3. Alta — parser ainda transforma entrada malformada em outro preço

**Referências:** `functions/alexa/dialog.js:129-157,253-260`.

Ao falhar o parsing numérico, o parser por palavras remove pontuação e soma fragmentos numéricos.

| Entrada testada | Retorno atual |
| --- | --- |
| `100,001` | 101 |
| `100,001 reais` | 101 |
| `1,500.00` | 501 |
| `1.23.45` | 69 |
| `10 20` | 30 |

**Necessário:** rejeitar formatos numéricos inválidos/ambíguos, sem reinterpretar seus fragmentos como soma. Para formatos alternativos, suportar explicitamente ou pedir esclarecimento.

### 4. Alta — commit aceita perfil sem permissão explícita

**Referência:** `functions/alexa/orderService.js:156-160`.

A exceção `!profile.permissions && profile.role !== 'funcionario'` continua liberando o commit. Em simulação, perfil `{ active: true, role: 'user' }` criou pedido sem orders.create explícito. A autorização normal de voz é mais restritiva, mas a aprovação no app depende desse serviço; um rascunho pendente pode ser aprovado após remoção do objeto de permissões.

**Necessário:** exigir admin ou orders.create === true de forma uniforme. Ajustar fixtures dos testes em vez de relaxar a regra.

### 5. Média — validação final continua aceitando rascunhos inválidos

**Referências:** `functions/alexa/orderService.js:175-195` e validações de ambiente.

Reproduzi commits aceitos individualmente com preço null, entrega `2027-02-31` e ambiente do rascunho prod enquanto config/binding eram dev. `Number(null)` vira zero; a data é conferida apenas por regex e o ambiente do rascunho não é comparado.

Essas reproduções semeiam rascunhos no banco local; não demonstram que um cliente web possa escrever diretamente nas coleções protegidas. Demonstram que a última barreira não protege contra registros legados/inconsistentes.

**Necessário:** validar tipo e presença do preço, calendário/data vigente e ambiente do rascunho no commit. Remover também os fallbacks permissivos de Auth quando o Admin não foi inicializado.

### 6. Média — carregamento de permissão pode sobrescrever o usuário atual ou uma edição

**Referência:** `src/app/pages/Users.tsx:236-249`.

O comentário afirma proteção contra resposta obsoleta, mas a implementação só captura targetUid da mesma chamada e compara com perm.uid. Não verifica o usuário atualmente aberto, não cancela a resposta no cleanup e não bloqueia os controles enquanto carrega.

Se a consulta de A terminar depois de abrir B, a resposta de A ainda altera os estados usados para B. Mesmo sem trocar de usuário, uma resposta tardia pode sobrescrever a alteração manual feita durante o carregamento e manter alexaDirty=true.

**Necessário:** descartar respostas obsoletas, desabilitar controles durante carregamento e exibir falha de consulta. Não persistir valores que não foram carregados/confirmados corretamente.

### 7. Média — verificação HTTP usa Skill ID estático antes de carregar o override ativo

**Referências:** `functions/alexa/index.js:214-227`; `functions/alexa/verification.js:103`; `functions/alexa/config.js`.

A economia de leitura foi implementada chamando a verificação completa com configuração estática. Se integrationSettings/alexa.allowedSkillId difere do env/default, a skill configurada no Firestore é rejeitada antes de carregar esse override. O caminho de pareamento não revalida o ID contra a configuração dinâmica antes de gerar desafio.

**Necessário:** separar verificação local/criptográfica da autorização final do Skill ID; aplicar a configuração ativa antes de qualquer efeito, incluindo pareamento e cache. Esta conclusão é de inspeção do fluxo; não foi testada contra um endpoint implantado.

## Itens adicionais ainda pendentes

- Aprovação administrativa de pareamento não confere desligamento global.
- Revisão ausente continua aceita; alteração para awaiting_app_approval não é transacional.
- Ledger ainda usa tags diferentes das do pedido; datas ausentes/inválidas são convertidas em hoje. Não há reconciliação dos registros antigos sem quantidade/status.
- Modelo pt-BR, ambiguidade quantidade/preço, retenção/TTL, orçamento de tempo e métricas reais continuam sem tratamento completo.
- Não foram adicionados testes de integração Alexa com concorrência/rollback reais. Os testes atuais não detectam os cenários reproduzidos acima.

## Verificações executadas

- `npm test`: **192 testes aprovados, 24 arquivos**.
- `npm run build`: aprovado, incluindo typecheck. Persistem avisos Vite de assets e chunks grandes, já vistos na rodada anterior.
- `node --check` em todos os módulos functions/alexa: aprovado.
- `git diff --check`: aprovado.
- Repetição das reproduções anteriores e cenários adicionais descritos neste documento.

As verificações de ordem usaram a classe Transaction real do SDK, com snapshots locais; confirmam a construção válida da transação, não um commit no servidor. As demais reproduções usaram as funções reais com armazenamento em memória. **Não foram executados emulador Firestore, Playwright, Echo físico ou produção.** Cache local de emuladores continua vazio. Não houve alteração da implementação, deploy ou push nesta revisão.

## Ordem para concluir

1. Deduplicação e transições atômicas do diálogo.
2. Parser estrito, permissão explícita e validações finais.
3. Carregamento seguro do formulário e autorização do Skill ID ativo.
4. Regressões em emulador e interface; depois teste físico, retenção e métricas.
