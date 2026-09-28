# Alexa — quarta verificação

Revisão iniciada em 27/09 e concluída em 28/09/2026 UTC. Estado analisado: commit `61a35b0` e alterações locais pendentes. Nenhuma implementação foi alterada nesta rodada.

## Resultado

**Houve progresso, mas a integração ainda não está completamente corrigida.** Deduplicação e concorrência continuam falhando. As novas validações resolveram os exemplos anteriores, porém o parser ainda aceita valores incorretos e foi introduzida uma incompatibilidade para pedidos gratuitos.

## Correções confirmadas nesta rodada

- Commit rejeita perfil sem permissão explícita de criar pedidos.
- Commit rejeita preço null, data impossível e ambiente divergente no rascunho.
- `100,001`, `1,500.00`, `1.23.45` e `10 20` agora são rejeitados.
- Formulário descarta respostas de consultas de um usuário anteriormente aberto, por meio de cleanup. A edição durante carregamento permanece problemática.
- Skill ID dinâmico é conferido após a verificação criptográfica e leitura da configuração. Permanece uma ressalva para ID ausente.
- Correções anteriores de ordem das transações, pessoa atual na confirmação e reapresentação do resumo continuam presentes.
- Simulações confirmaram bloqueio com integração desligada, vínculo reassociado, modo alterado e cota horária atingida. Replay sequencial manteve apenas um pedido e cota consumida uma vez.

## Achados pendentes

### 1. Alta — mesma requisição ainda executa duas vezes sob concorrência

**Local:** `functions/alexa/index.js:69-87,103-113,188-200`.

Não houve mudança na deduplicação: consulta o cache, executa e grava depois, sem aquisição atômica e sem aguardar a escrita da resposta.

**Reprodução repetida:** duas chamadas simultâneas de LinkVoiceIntent com o mesmo requestId geraram **dois desafios e respostas diferentes** em armazenamento em memória.

**Correção necessária:** reservar a execução atomicamente, persistir a resposta aguardando a operação e recuperar processamento interrompido. Manter a idempotência por draftId. Tratar a retenção/proteção do código de pareamento incluído no cache da resposta.

### 2. Alta — alterações concorrentes continuam perdidas

**Local:** `functions/alexa/dialog.js`, carregamento e persistência de rascunhos, cancelamento e fallback.

O diálogo continua sem transações para comparar e atualizar revisão/estado. Não há correlação persistida por sessionId.

**Reprodução repetida:** correções simultâneas de cliente e produto a partir da revisão 2. O resultado manteve produto novo e **cliente antigo**, com revisão 3. A correção de cliente foi perdida.

**Correção necessária:** transições atômicas com versão, titularidade e estado, incluindo cancelamento/fallback; rejeitar atualização obsoleta. Testar concorrência no emulador.

### 3. Alta — parser ainda soma fragmentos e altera o preço

**Locais:** `functions/alexa/dialog.js:129-170,207-239,253-290`.

As verificações novas cobrem os exemplos anteriores, mas não tornam a gramática estrita. O ramo de centavos usa parsePartToNumber, que ainda passa entradas com pontuação ao parser por palavras. Outros sinais também são removidos antes da soma.

Reproduções diretas:

| Entrada | Resultado atual |
| --- | --- |
| `1,50 centavos` | R$ 0,51 |
| `10,50 reais e 20 centavos` | R$ 60,20 |
| `10/20` | R$ 30,00 |
| `10+20` | R$ 30,00 |

Essas entradas devem ser interpretadas por uma gramática definida ou rejeitadas com pedido de esclarecimento. Não devem virar soma de fragmentos por remoção de pontuação. Corrigir apenas exemplos com novas regex deixa outros caminhos permissivos.

### 4. Média — regressão: preço zero aceito no diálogo e rejeitado ao gravar

**Local:** `functions/alexa/orderService.js:197`; parser e confirmação em `functions/alexa/dialog.js`.

O commit mudou de `< 0` para `<= 0`. Reproduzi parser aceitando `0` e “zero reais”, enquanto commit rejeita preço 0 como inválido. A pessoa percorre o fluxo e só recebe falha ao confirmar.

A especificação em `docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md:152` prevê pedido gratuito com confirmação explícita, distinguindo zero de preço ausente.

**Correção necessária:** preservar zero como valor explícito válido, exigir confirmação de gratuidade e continuar rejeitando null/undefined. Alinhar regras da coleta e do commit.

### 5. Média — carregar permissão ainda pode sobrescrever edição feita pelo administrador

**Locais:** `src/app/pages/Users.tsx:242-260,302-309,429-447`.

A troca de usuário está protegida pelo cleanup, mas Switch e Select continuam habilitados enquanto alexaLoading=true. Se o administrador alterar o modo durante a consulta, a resposta sobrescreve sua escolha e mantém alexaDirty=true. Ao salvar depois, a configuração carregada pode ser persistida no lugar da escolha.

Falha de consulta também substitui os dados por disabled/voice_confirm sem informar o erro. Além disso, a checagem de carregamento ao salvar acontece depois de updateUserProfile, permitindo atualização parcial antes da mensagem de bloqueio.

**Correção necessária:** bloquear controles Alexa durante carregamento; apresentar erro e tentativa de recarga; conferir pré-condições antes de qualquer escrita; não substituir uma edição válida por resposta tardia.

### 6. Média — Skill ID ausente passa na nova checagem do webhook

**Local:** `functions/alexa/index.js`, condição `if (envelopeAppId && envelopeAppId !== config.allowedSkillId)` após carregar configuração dinâmica.

A verificação inicial recebe allowedSkillId vazio; a checagem posterior rejeita divergência apenas quando o ID recebido existe. Um envelope sem applicationId passa essa etapa. O pareamento não impõe outra conferência do ID.

**Correção necessária:** se há skill permitida, exigir `envelopeAppId === config.allowedSkillId`, inclusive rejeitando ausência. A assinatura Amazon permanece obrigatória; este achado é uma lacuna de validação estrutural, não demonstra falsificação de assinatura ou exploração remota.

## Pendências anteriores que continuam relevantes

- Revisão ausente ainda não é obrigatoriamente rejeitada; confirmação para app e outras mutações não são transacionais.
- Auth mantém exceções permissivas quando Admin não está inicializado.
- Aprovação administrativa de pareamento não confere o desligamento global.
- Retenção/TTL, métricas por etapa, orçamento de tempo, reconciliação do ledger antigo e ambiguidades do modelo pt-BR continuam incompletos.
- Há arquivos essenciais e teste novo não incluídos nos commits; esta revisão considera o checkout completo.

## Validação

- `npm test`: 192 testes aprovados, 24 arquivos.
- `node --check` em todos os módulos functions/alexa: aprovado.
- `git diff --check`: aprovado.
- Reproduções locais com funções reais e armazenamento em memória; ordem das transações conferida usando a classe Transaction do SDK com leituras simuladas.
- `npm run build`, incluindo typecheck: aprovado. Persistem avisos Vite de assets não resolvidos no build e chunks grandes, já observados nas rodadas anteriores.

Não executei emulador Firestore, Playwright, Echo físico ou produção. O cache local de emuladores continua vazio. Os testes atuais aprovados não comprovam concorrência/rollback nem cobrem todos os casos acima. Não houve deploy, push ou correção da implementação nesta rodada.

## Próximo passo recomendado

Priorizar deduplicação e mutações transacionais, que permanecem sem correção desde as primeiras revisões. Depois substituir o parsing permissivo por gramática integral, alinhar preço zero e concluir proteção da interface. Acrescentar testes que reproduzam cada falha antes de considerar a integração pronta.
