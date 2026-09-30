# Prompt para Gemini no Antigravity — fechar pendências da revisão Alexa

## Objetivo

Revise e corrija as pendências verificáveis da implementação recente de frases longas para criação de pedidos na Alexa. Trabalhe em etapas pequenas, mantenha o fluxo atual e demonstre cada resultado com validação adequada.

O ponto de partida observado nesta revisão foi o commit `885c3b8` (`feat(alexa): adicionar criacao de pedidos por frases longas e testes de regressao`). Confirme a branch e o estado atual antes de usar essa referência; o repositório pode ter mudado.

Arquivos centrais a conferir:

- `alexa/skill-package/interactionModels/custom/pt-BR.json`
- `tests/unit/alexa/long-phrases-regression.test.ts`
- `functions/alexa/dialog.js` e handlers Alexa relacionados
- testes existentes em `tests/unit/alexa/` e `tests/integration/` (confirme os caminhos)
- `alexa/scripts/prepare-skill-package.cjs`
- `.github/workflows/deploy-alexa-skill.yml`
- `docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md`

## Premissas e limites

- Os testes locais recentes passaram (162 testes Alexa em 11 arquivos), mas os testes de frase longa constroem diretamente envelopes já resolvidos com intent e slots. Eles não provam que o NLU da Amazon extrai esses slots da fala.
- O teste do fluxo de gravação usa um mock simples de `runTransaction`. Ele valida o caminho feliz do handler, mas não simula atomicidade, rollback ou concorrência do Firestore.
- `ProvideCustomerIntent` contém a amostra `{customer}` junto com outras amostras. A documentação oficial recomenda que uma amostra composta apenas por slot fique em uma intent própria, sem outras amostras: https://developer.amazon.com/en-US/docs/alexa/interaction-model-design/design-the-custom-intents-for-your-skill.html
- O commit mais recente acrescentou a amostra `não {deliveryDate}`; o teste atual invoca `ProvideDeliveryDateIntent` diretamente e não testa como a Alexa classifica essa fala.
- O script de preparação do pacote dev usa a invocação `papelaria de testes` e o endpoint `api.dev.luisices.com.br`. Preserve esses valores e toda configuração externa existente.
- Um push em `develop` com mudanças sob `alexa/**` pode acionar `.github/workflows/deploy-alexa-skill.yml` e atualizar o modelo de desenvolvimento. Não faça push, deploy, publicação, chamada SMAPI que altere o Console, alteração em Cloudflare/Firebase ou mudança de segredos.
- Mantenha baixo custo, baixa latência e segurança. Não introduza LLM, chamadas de rede em cada turno, dependências ou leituras Firestore desnecessárias.

## Regras de execução

1. Inspecione `AGENTS.md`, a branch, `git status`, o commit recente e os arquivos relacionados antes de editar. Preserve qualquer mudança não commitada do usuário.
2. Não reescreva o módulo nem altere nomes públicos, contrato dos pedidos, autorização, assinatura Alexa, `x-origin-secret`, transações de produção ou comportamento fora do escopo.
3. Faça uma etapa de cada vez. Depois de cada etapa, resuma o diff e rode os testes correspondentes; corrija falhas antes de avançar. Continue pelas etapas sem pedir confirmação.
4. Não enfraqueça testes para fazê-los passar. Se uma validação depende de credenciais, Console, dispositivo ou serviço externo, não invente resultado: deixe claro o limite e forneça instruções de validação manual.
5. Não registre payloads Alexa completos, nomes de clientes, conteúdo de pedidos, tokens ou segredos.

## Etapa 0 — estabelecer a situação atual

- Confirme quais mudanças de `885c3b8` ainda existem e quais foram feitas depois.
- Rode primeiro os testes Alexa atuais e anote qualquer falha preexistente.
- Identifique os comandos disponíveis para validar o JSON/modelo local e os testes de integração com Firestore Emulator.
- Confira se já existe teste real de transação/concorrência que cubra criação de `orders`, `salesLedger`, contador e atualização do draft. Não duplique cobertura que já esteja adequada.
- Prepare uma lista curta de arquivos que pretende alterar e o motivo. Depois prossiga sem aguardar aprovação.

## Etapa 1 — corrigir o slot de cliente isolado

Resolva a amostra `{customer}` seguindo a orientação oficial da Alexa e sem perder a possibilidade de responder somente com o nome durante a coleta de dados.

Escolha a menor solução compatível com o modelo e handlers atuais. A solução provável é uma intent exclusiva com uma única amostra `{customer}` e um nome claro, mantendo as outras amostras de `ProvideCustomerIntent` separadas. Se criar uma nova intent:

- Faça o novo intent percorrer o mesmo tratamento seguro de `ProvideCustomerIntent`, sem duplicar lógica de diálogo.
- Preserve as respostas “para Maria”, “o cliente é Maria” e correções de cliente.
- Garanta que a nova intent só altere o cliente no rascunho ativo autorizado e não crie rascunho por conta própria.
- Teste ausência de rascunho, rascunho expirado, revisão obsoleta e tentativa de alteração por pessoa não autorizada conforme os padrões existentes.
- Verifique que não existam amostras idênticas entre intents nem conflito com as intents de produto, quantidade e confirmação.

Se o validador ASK mostrar que a intent de slot isolado não funciona com o desenho de diálogo usado pelo projeto, use uma alternativa validada e documente o comportamento que fica suportado. Não diga que uma alternativa funciona no Echo sem evidência.

## Etapa 2 — fortalecer a validação da interação por voz

Os testes unitários devem continuar verificando a lógica de negócio, mas não devem ser descritos como testes de reconhecimento de fala. Adicione a melhor validação automatizada local que o repositório permite:

- JSON parseável e estrutura mínima de interaction model correta.
- Cada slot citado nas amostras está declarado e é usado de modo permitido.
- Não há amostras exatamente duplicadas dentro da mesma intent ou entre intents.
- Há cobertura estática das frases-alvo no modelo para preço unitário, preço total, preço sem base explícita, data e quantidade ausente.
- A frase de invocação fica fora das amostras de intent.
- `prepare-skill-package.cjs --env dev` inclui o modelo atualizado e conserva invocação, endpoint e certificado atuais.

Use uma ferramenta oficial ASK/SMAPI apenas para validação, e só se o projeto já tiver esse fluxo e as credenciais estiverem disponíveis no ambiente. Não adicione credenciais ao repositório nem rode comando que publique ou substitua o modelo no Console. Inspecione a semântica e o efeito do comando antes de usá-lo.

Para validação NLU real, forneça uma pequena lista para o desenvolvedor executar no simulador Alexa depois da publicação manual. No relatório, marque esse resultado como pendente até que alguém rode o teste. Inclua ao menos:

1. “Alexa, peça à Papelaria de Testes para criar um pedido de dez caixinhas para Maria a dez reais cada, com entrega no sábado.”
2. “Alexa, peça à Papelaria de Testes para criar pedido de caixinha para Maria no valor de dez reais e entrega sábado.”
3. “Alexa, peça à Papelaria de Testes para criar dez caixinhas para Maria por cem reais no total, entrega sábado.”
4. Quando solicitada a correção da data: “não, domingo”.
5. Quando solicitada apenas a informação de cliente: responder “Maria”.

Registre para cada cenário qual intent/slots se esperam, qual resposta deve ocorrer e como reconhecer erro de classificação. Não inclua o nome de invocação dentro das amostras do intent.

## Etapa 3 — testar correção de data e colisões de intent

Avalie `não {deliveryDate}` e `não dia {deliveryDate}` no modelo completo:

- Verifique sobreposição com `AMAZON.NoIntent`, `ProvideDeliveryDateIntent`, confirmação e correções de outros campos.
- Acrescente teste unitário para garantir que uma data corrigida substitui somente a data e invalida/recalcula qualquer confirmação necessária.
- Acrescente teste de modelo para assegurar que essas amostras estão presentes e sem duplicidade.
- Se não houver NLU oficial disponível, trate a colisão como não validada e inclua o caso no roteiro do simulador. Não conclua a partir de um envelope manual que a Alexa reconhecerá a frase.
- Remova ou ajuste as amostras novas se houver conflito comprovado pelo validador. Não remova correção de data suportada sem oferecer uma forma clara de dizer a nova data.

## Etapa 4 — separar teste de diálogo de garantia transacional

Corrija a cobertura e a nomenclatura dos testes de criação:

- Mantenha o teste unitário de `handleAlexaDialog` como teste do caminho de confirmação e mapeamento, com afirmações compatíveis com o mock utilizado.
- Não chame a implementação do mock de `runTransaction` de transação atômica: ela executa operações sequencialmente e não implementa rollback/conflitos.
- Se já houver testes de integração com Firestore Emulator, acrescente lá a cobertura que estiver faltando. Caso não exista cobertura suficiente, crie testes de integração mínimos e focados para:
  1. confirmação válida grava pedido, `salesLedger`, contador e estado do draft de forma consistente;
  2. falha forçada em uma escrita deixa todos os documentos sem alteração parcial;
  3. duas confirmações concorrentes do mesmo draft não geram dois pedidos/lançamentos;
  4. revisão antiga ou draft já comprometido não pode ser confirmado de novo.
- Reutilize `commitOrderFromDraft` e o serviço/transação real. Não replique a lógica produtiva dentro do teste.
- Use somente Firebase Emulator/projeto `demo-*` e dados sintéticos. Não conecte a produção.
- Se o ambiente de emulador não estiver disponível, não finja ter verificado atomicidade; rode os testes unitários e declare a lacuna.
- Evite tornar a suíte lenta ou frágil. Testes concorrentes devem sincronizar por barreira explícita, não por `sleep` arbitrário.

## Etapa 5 — executar regressão e revisar impacto operacional

Rode, na ordem adequada ao projeto:

1. Novo teste do interaction model e testes unitários de Alexa.
2. Testes de integração de pedidos/ledger no Emulator se alterados.
3. Typecheck, lint e build aplicáveis.
4. Script de preparação do pacote em diretório temporário, sem deploy.

Revise o diff para confirmar que:

- Não houve mudança no endpoint, nome de invocação, manifesto de produção, workflow, Cloudflare ou secrets.
- Não foram adicionadas chamadas pagas, rede, novas leituras por requisição ou dados pessoais em logs.
- Os pedidos ainda exigem resumo verbal e “sim” explícito antes da persistência.
- Quantidade ausente, preço ambíguo e data inválida continuam levando a perguntas, nunca a valores inventados.

## Critérios de conclusão

Considere o trabalho completo quando:

- A amostra de cliente isolado segue a orientação da Alexa e continua sendo processada pelo diálogo autorizado.
- O modelo passa todas as validações locais disponíveis, e as limitações de NLU remotas estão claramente declaradas.
- Os testes demonstram a lógica de diálogo e, onde possível, as garantias reais do serviço Firestore com o Emulator.
- Os testes não afirmam que mocks sequenciais provam atomicidade.
- As alterações preservam o fluxo atual, segurança, custo e latência.
- Nenhum deploy ou publicação foi executado.

## Relatório final exigido

Apresente:

1. O que mudou, em ordem de prioridade, com arquivos e motivos.
2. Os comandos de validação executados e resultados exatos.
3. Separação entre garantias comprovadas por testes unitários, integração no Emulator e NLU que ainda precisa de simulador/Echo.
4. Tabela dos cinco cenários NLU com status “validado”, “pendente” ou “falhou”; não marque como validado sem evidência real.
5. Riscos que restam e próximos passos manuais estritamente necessários.
6. Confirmação de que não houve deploy, publicação, alteração de Console nem uso de produção.

Comece pela Etapa 0 e avance em ordem. Faça mudanças pequenas e revise cada diff antes de seguir.
