# Prompt para Gemini Flash no Antigravity — confirmação de voz e precisão da Alexa

## Missão

Implemente as melhorias abaixo no módulo Alexa do Luisices, em etapas pequenas e verificáveis. Priorize a falha de confirmação por voz, preservando segurança, baixo custo e baixa latência. Inspecione o código atual antes de editar. Não considere esta descrição substituta da leitura dos arquivos.

Contexto verificado na preparação deste documento:

- Branch `develop`, commit `9bed79f`, sem alterações locais naquele momento. Confirme o estado atual.
- O usuário consegue montar o pedido, mas ao responder “sim” recebe: “Não reconheci sua voz com segurança na confirmação. Por segurança, o pedido foi enviado para aprovação no aplicativo Luisices.”
- Essa mensagem existe no ramo de confirmação sem identificação atual em `functions/alexa/dialog.js`.
- A autorização em `functions/alexa/authorization.js` permite continuar uma sessão usando `session.attributes.personId` quando falta a identificação no contexto atual.
- A confirmação final exige novamente a identificação presente na requisição atual. Se ausente, o diálogo muda o draft para `awaiting_app_approval` e encerra a sessão imediatamente.
- Esse mecanismo explica a mensagem relatada. Não foi inspecionado o payload real do Echo; a causa da ausência de identificação no dispositivo continua sem confirmação.
- Três testes focados passaram na investigação: confirmação sem identificação encaminha ao aplicativo; identificação correspondente permite confirmar; identificação diferente é rejeitada.

O problema de experiência é não oferecer uma nova tentativa quando falta reconhecimento naquele turno. Não trate a identidade preservada na sessão como prova de quem acabou de falar.

## Resultado esperado

Fluxo de exemplo:

1. Usuário informa um pedido.
2. Alexa apresenta o resumo completo e pergunta: “Você confirma o pedido? Diga: pode confirmar. Ou diga o que deseja corrigir.”
3. Usuário diz “sim”. Se vier identificação atual correspondente, confirmar normalmente.
4. Se vier sem identificação atual, preservar o pedido e responder: “Não consegui reconhecer sua voz nesta resposta. Diga: pode confirmar.”
5. Se a nova resposta trouxer a identificação correspondente, confirmar uma única vez.
6. Se continuar sem identificação, permitir mais uma tentativa.
7. Após a terceira resposta afirmativa sem identificação no total, encaminhar para aprovação no aplicativo e informar o resultado real.

São **duas novas tentativas após a primeira falha**, não três novas tentativas. A frase mais longa é uma oportunidade adicional de reconhecimento, não uma garantia. “Sim” continua válido quando a identidade atual estiver presente.

## Regras de implementação

- Leia `AGENTS.md`, se houver, e as instruções aplicáveis.
- Confira branch, `git status` e mudanças existentes. Não sobrescreva trabalho do usuário.
- Faça uma etapa por vez. Mostre arquivos alterados e testes executados antes de seguir. Continue autonomamente pelas etapas que não dependam de serviços externos.
- Não faça commits, push, deploy, alteração no Console Alexa, Cloudflare, segredos, nome de invocação ou endpoint.
- Não introduza modelo generativo, transcrição externa, serviço de voz adicional, Redis ou novas dependências para essa tarefa.
- Preserve assinatura/timestamp/Skill ID, segredo de origem, vínculo de voz, permissões, limites de uso, confirmação explícita e idempotência.
- Não use `session.attributes.personId`, `identity.personId`, UID da conta do Echo, nome falado ou um slot como substituto da identificação atual para a gravação por voz.
- Não adicione um caminho que aceite a troca de pessoa durante a confirmação. Voz identificada como diferente deve continuar sendo rejeitada.
- A presença de `personId` é um sinal fornecido pela Alexa, não garantia biométrica absoluta. Não descreva testes com envelopes sintéticos como testes de biometria real.
- Não registre áudio, payload completo, nomes de clientes, produtos, identificadores pessoais, tokens ou segredos.
- Mantenha as alterações pequenas. Refatore somente o necessário para evitar duplicação e garantir consistência.

## Arquivos de entrada

Leia pelo menos:

- `functions/alexa/authorization.js`: identificação atual e identidade preservada na sessão.
- `functions/alexa/index.js`: validação, autorização, deduplicação, limites e construção da resposta.
- `functions/alexa/dialog.js`: resumo, confirmação, revisões e transição para aprovação no aplicativo.
- `functions/alexa/orderService.js`: commit, revalidação de autorização, transação e recibo durável.
- `functions/alexa/callables.js`: aprovação pelo aplicativo e listagem de pendências.
- `alexa/skill-package/interactionModels/custom/pt-BR.json`: `AMAZON.YesIntent` e amostras de confirmação.
- `tests/unit/alexa/`: testes de diálogo, autorização, auditoria e transações.
- Configuração e testes existentes de Firestore Emulator.

Referência oficial: a Amazon recomenda solicitar uma nova resposta quando o reconhecimento de uma pessoa falha durante a sessão. Leia a seção “Re-prompt if a speaker is unrecognized” em:

https://developer.amazon.com/en-US/docs/alexa/custom-skills/test-troubleshoot-personalization.html

## Etapa 0 — reproduzir e identificar os pontos de mudança

1. Rastreie uma requisição `AMAZON.YesIntent` desde `processAlexaEnvelope` até o commit ou encaminhamento para aprovação.
2. Identifique as diferenças entre a identidade reconhecida nesta requisição e a identidade previamente associada à sessão.
3. Execute os testes relevantes existentes antes de alterar o comportamento. Exemplo, se o script continuar disponível: `npm run test:unit -- tests/unit/alexa`.
4. Localize todos os testes que esperam encaminhamento imediato na primeira falha. Eles precisarão ser atualizados para a nova política, mantendo as expectativas de segurança.
5. Registre se os modos `voice_confirm` e `app_approval` compartilham o mesmo ramo sem identificação. Evite obrigar quem usa aprovação pelo app a repetir a voz desnecessariamente.

Saída: diagnóstico curto, arquivos envolvidos e resultado da linha de base.

## Etapa 1 — novas tentativas com estado persistido (P1)

Implemente a política de duas novas tentativas no modo `voice_confirm`.

### Estado e limites

- Mantenha o contador no draft do servidor, com nome claro, por exemplo `voiceConfirmationFailures`.
- Campo ausente em drafts legados equivale a zero. Valide o tipo e limite o valor; estado malformado não pode liberar tentativas ilimitadas nem autorizar commit.
- Não confie em um contador recebido nos atributos de sessão.
- Atualize o contador dentro de transação, conferindo dono, vínculo, ambiente, sessão válida, estado, expiração e revisão do pedido.
- Preserve o prazo de expiração original do rascunho. Nova tentativa não prolonga indefinidamente sua validade.
- Não incremente a revisão dos dados do pedido apenas porque aumentou o contador. Uma revisão alterada sem necessidade pode fazer cada confirmação reapresentar o resumo para sempre.
- Alterações reais em cliente, produto, quantidade, preço ou entrega seguem o controle de revisão existente e exigem um novo resumo.
- O limite vale por draft: não reinicie automaticamente o contador com repetição, ajuda, correção de campo, retomada de sessão ou reapresentação do resumo. Um novo draft começa em zero.
- Retentativas de transporte com o mesmo `requestId` não consomem outra tentativa. Preserve e teste a deduplicação existente no caminho completo; não a reimplemente de forma divergente dentro do diálogo.

### Comportamento por evento

| Evento | Resultado obrigatório |
| --- | --- |
| Primeira confirmação sem identificação atual | Contador 1; mantém `awaiting_confirmation`; sessão aberta; solicita “pode confirmar”; zero pedidos gravados |
| Segunda confirmação sem identificação atual | Contador 2; mesma proteção; oferece a última nova tentativa |
| Terceira confirmação sem identificação atual | Transição atômica para `awaiting_app_approval`; encerra sessão; zero pedidos gravados diretamente |
| Identificação atual correspondente antes do limite | Revalida autorização e confirma pelo serviço existente; exatamente um pedido |
| Identificação atual diferente | Rejeita; nenhuma gravação; não usa identidade anterior como fallback |
| Identificação anterior ausente, sem vínculo confiável | Mantém rejeição da autorização; não inicia uma sessão autenticada pelo fluxo de novas tentativas |
| Revisão obsoleta ou ausente | Apresenta resumo atual antes de aceitar confirmação; não consome tentativa como se fosse falha de reconhecimento |
| Draft expirado/cancelado/committed | Não reabre, não prolonga e não confirma |
| Modo `app_approval` | Preserva encaminhamento normal para aprovação; não exige novas tentativas de voz para uma gravação que será aprovada no app |

Nas respostas intermediárias, devolva os atributos mínimos necessários para continuar o mesmo draft e revisão. Não apague a associação válida da sessão. Ela serve para continuidade do diálogo, não para substituir o reconhecimento exigido no commit.

### Transição para o aplicativo

- Revalide estado, expiração, revisão, dono, vínculo e ambiente dentro da transação.
- Se outra operação alterar ou cancelar o draft, não sobrescreva essa mudança.
- Se a transição falhar, não diga que o pedido foi enviado ao aplicativo.
- Após encaminhar, mantenha a regra de que o pedido pendente de aprovação não pode ser alterado ou confirmado por voz.
- Preserve o serviço de aprovação e o recibo/idempotência existentes.

## Etapa 2 — orientar a fala e preservar o contexto (P1)

- Atualize somente os prompts de confirmação final para sugerirem “pode confirmar”. Não confunda confirmação do pedido com aceitação de preço de catálogo ou início de um novo pedido.
- Preserve “sim”, “confirmo”, “pode confirmar” e as amostras já válidas de `AMAZON.YesIntent`.
- Se adicionar “confirmo o pedido” ou outra frase, verifique duplicação e adequação ao intent. Não acrescente dezenas de variações equivalentes.
- Use mensagens breves, sem mencionar `personId`, biometria, transações ou detalhes internos ao cliente.
- Na primeira falha, não repita todos os dados se eles continuam iguais; peça somente a nova confirmação.
- Após correção de um campo, apresente o resumo atualizado e exija uma confirmação nova. Um “sim” ligado ao resumo anterior não pode confirmar o novo conteúdo.
- “Repetir pedido” deve apresentar o que está no draft, preservar o limite de tentativas e nunca gravar.
- “Cancelar” deve interromper o processo com o mesmo comportamento seguro já existente.

## Etapa 3 — diagnóstico que permita verificar o Echo (P1)

Acrescente eventos estruturados mínimos nos pontos relevantes, reutilizando a infraestrutura existente:

- estágio: autorização ou confirmação;
- intent reconhecida;
- identificação presente na requisição atual: booleano;
- identidade proveniente da sessão: booleano, se necessário;
- resultado da comparação: correspondente/diferente/ausente, sem valores dos identificadores;
- tentativa atual e resultado: nova tentativa, encaminhado ao aplicativo, rejeitado ou confirmado;
- duração em milissegundos quando já houver mecanismo de medição;
- correlação opaca por requisição, usando o mecanismo existente quando disponível.

Não persista um novo documento Firestore apenas para cada log. Não duplique eventos de sucesso nem faça consultas extras para montar logs. Não registre texto completo do usuário, conteúdo do pedido ou identificadores brutos.

Os eventos devem permitir responder: o “sim” chegou como `YesIntent`? Faltou identificação atual? A autorização bloqueou antes do diálogo? O pedido foi encaminhado com sucesso?

## Etapa 4 — regressões úteis (P1)

Use os testes existentes e acrescente os casos ausentes. Fixe o relógio dos testes que dependem de datas para que não falhem quando uma data hoje futura passar a ser passada.

### Diálogo

1. Primeira ausência de identificação mantém sessão/draft e não grava pedido.
2. Segunda ausência mantém a última oportunidade; terceira encaminha ao aplicativo.
3. Identificação correta na segunda ou terceira resposta confirma uma única vez.
4. Pessoa diferente continua rejeitada, mesmo com identidade anterior nos atributos de sessão.
5. Draft legado sem contador, contador inválido e contador no limite.
6. Revisão alterada exige resumo atualizado, sem consumir indevidamente tentativa de voz.
7. Repetir, ajudar, corrigir e reabrir não zeram o contador nem prorrogam o TTL.
8. Cancelamento, expiração e encaminhamento ao app não permitem posterior commit por voz.
9. Falha na transição para o app gera uma mensagem verdadeira e preserva o estado consistente.
10. Modo `app_approval` continua funcionando sem passar pelas duas novas tentativas de `voice_confirm`.

### Caminho completo do backend

Pelo menos um teste deve passar pelo processador que executa autorização, deduplicação e diálogo, usando serviços externos simulados:

- início com identidade válida → confirmação sem identificação atual, mas com sessão válida → nova resposta com identidade atual correspondente → um pedido;
- mesmo `requestId` reenviado → mesma resposta e nenhuma tentativa adicional;
- identificação diferente → bloqueio antes do commit;
- perda de sessão/identidade sem vínculo autorizado → nenhuma confirmação por fallback inseguro.

Chamar `handleAlexaDialog` diretamente passando `identity` pronta não demonstra que a autorização do webhook aceita o fluxo. Preserve essa distinção nos testes e no relatório.

### Persistência

Se houver infraestrutura de Firestore Emulator, acrescente testes focados para concorrência e transição condicional, usando o serviço real e dados sintéticos em projeto `demo-*`:

- duas requisições concorrentes não perdem a contagem de falhas;
- confirmação concorrente com encaminhamento ao app não produz estado final incompatível;
- falha de transação não deixa atualização parcial;
- confirmação duplicada não cria dois pedidos ou dois lançamentos.

Mocks sequenciais não comprovam rollback nem atomicidade. Não os apresente como essa evidência. Se o emulador não puder rodar, informe a limitação com o erro real.

## Etapa 5 — melhorias adicionais de precisão (P2, escopo controlado)

Depois de concluir P1, revise estes pontos e corrija somente lacunas demonstráveis no código/testes. Não refaça funcionalidades já corretas:

1. **Preço:** “dez reais cada” multiplica pela quantidade; “dez reais no total” não multiplica; valor ambíguo pede esclarecimento. Preserve centavos inteiros e limites atuais.
2. **Quantidade ausente:** pergunta a quantidade, sem assumir uma unidade.
3. **Data:** confirma a data civil concreta no resumo; valores incompletos ou inválidos pedem esclarecimento. Use o fuso configurado.
4. **Correções:** mudar cliente/data/quantidade modifica só os campos informados, recalcula o que depende deles e exige novo resumo.
5. **Fallback:** pergunta apenas o campo pendente e preserva o restante do pedido. Não interpreta uma fala incompreendida como “sim”.
6. **Testes do modelo:** revise títulos e expectativas. Verificar que `NoIntent` não contém `{deliveryDate}` não comprova ausência de conflito NLU com “não domingo”. Descreva o teste como estrutural e deixe a classificação real pendente do profiler da Alexa.
7. **Arquivos temporários dos testes:** use diretório temporário único, removendo somente o diretório criado pela própria execução.

Não faça ampla reorganização de intents ou migração de arquitetura nesta tarefa. Cada melhoria P2 precisa de um caso concreto que justifique a mudança e de uma verificação correspondente.

## Etapa 6 — validação final e entrega

Execute os testes focados após cada etapa. Ao finalizar, execute a suíte Alexa completa, os testes de integração adicionados, verificações sintáticas e typecheck/build aplicáveis. Consulte os scripts atuais; não invente comandos nem trate `lint` que apenas imprime uma mensagem como análise estática real.

Entregue um relatório local em `output/RELATORIO_ALEXA_CONFIRMACAO_E_ASSERTIVIDADE.md` com:

- problema e comportamento final;
- arquivos alterados e motivo;
- tabela dos cenários obrigatórios com resultados reais;
- comandos e quantidades exatas de testes passados/falhos;
- testes bloqueados, incluindo motivo;
- impacto esperado em custo/latência: novas tentativas geram novas requisições e operações de draft, limitadas por política; não são gratuitas. Não invente valores ou p95;
- validações de Echo/NLU ainda pendentes;
- necessidades de implantação por artefato.

Como o backend muda, será necessário atualizar `alexaWebhook` para a correção funcionar no dispositivo. Se as amostras mudarem, também será necessário atualizar/construir o modelo Alexa correspondente. Um commit por si só não prova que esses artefatos foram implantados. Inspecione os workflows atuais para descrever o processo correto, sem executá-los.

### Roteiro de validação posterior no Echo

Forneça um roteiro curto, sem repetir verificações genéricas de conta já confirmadas pelo usuário:

1. Criar um pedido sintético, ouvir o resumo e responder “sim”.
2. Se o reconhecimento faltar, verificar se o diálogo oferece a nova tentativa.
3. Responder “pode confirmar” e correlacionar o horário com os eventos seguros do backend.
4. Confirmar no aplicativo que foi criado apenas um pedido, com dados corretos.
5. Testar correção de quantidade antes da confirmação e cancelamento.
6. Testar a aprovação no aplicativo após esgotar tentativas, quando esse cenário ocorrer. A ausência de identificação deve ser simulada nos testes automatizados; não prometa reproduzi-la à vontade no Echo.

Não marque esses passos como executados sem evidência do dispositivo. A conclusão deve dizer precisamente o que foi corrigido no código e o que falta validar no ambiente implantado.

Comece pela Etapa 0 e conclua as etapas em ordem, com alterações pequenas e revisão dos testes a cada passo.
