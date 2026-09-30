# Prompt para Antigravity — Gemini 3.8
## Melhorar a criação de pedidos por frases longas na skill Alexa

Você está trabalhando no repositório Luisices. Sua tarefa é melhorar, em mudanças pequenas e verificáveis, a criação de pedidos por voz na skill Alexa em português do Brasil.

### Objetivo do produto

Quero conseguir dizer algo próximo de:

> “Alexa, peça à Papelaria de Testes para criar um pedido de dez caixinhas para Maria a dez reais cada, com entrega no sábado.”

Também considere a frase original desejada:

> “Alexa, criar pedido de caixinha na papelaria de testes para Maria no valor de 10 reais e entrega sábado.”

A segunda frase não informa a quantidade e não deixa claro se R$ 10 é o preço de cada unidade ou o total. O sistema deve aproveitar os campos reconhecidos e perguntar apenas o que falta. Nunca invente quantidade, tipo de preço ou data.

### Regras de trabalho

1. Primeiro inspecione o estado atual do repositório, `AGENTS.md`, a especificação Alexa e os arquivos citados abaixo. O código pode ter mudado desde a preparação deste prompt; confirme cada premissa antes de agir.
2. Faça uma etapa por vez, em commits conceituais pequenos (não crie commits). Ao terminar cada etapa, mostre arquivos alterados, comportamento obtido e testes executados. Corrija falhas antes de seguir para a próxima etapa; depois continue sem aguardar uma confirmação.
3. Preserve contratos, dados existentes, nomes de intents, fluxo de vinculação de voz, autorização, confirmação e gravação de pedidos. Não reescreva o módulo inteiro.
4. Não altere nome de invocação, endpoint, configuração de distribuição, Cloudflare, Firebase, segredos ou contas externas. Não faça deploy, publicação, push ou mudanças no console Alexa.
5. Não remova nem contorne a validação `x-origin-secret`/`ORIGIN_SECRET`. Preserve a validação de assinatura Alexa, o corpo bruto da requisição e os cabeçalhos necessários. Nunca registre segredos, requisições completas, nomes ou conteúdo integral dos pedidos nos logs.
6. Prefira interpretação determinística e os slots nativos da Alexa. Não adicione chamadas a Gemini/LLM, dependências, serviços externos, novas leituras Firestore ou etapas de rede por requisição. Prioridades: precisão, segurança, baixa latência e baixo custo.
7. Não gere dezenas de frases quase iguais. Acrescente apenas amostras distintas que cubram a linguagem desejada e variações úteis. A frase de invocação (“Papelaria de Testes”) pertence ao comando de invocação da Alexa; não a copie para as amostras da intent.
8. Não trate testes locais como prova de funcionamento em Echo físico. Separe claramente: modelo local, backend/functions, modelo publicado no Console e teste no dispositivo.
9. Se encontrar um problema fora do escopo, registre como observação com evidência; não amplie a mudança sem necessidade.

### Arquivos para inspecionar (confirme os caminhos)

- `alexa/skill-package/interactionModels/custom/pt-BR.json`
- `alexa/skill-package/interactionModels/custom/pt-BR/` e tipos de slot da skill, se existirem
- `functions/alexa/dialog.js`
- handlers/intents em `functions/alexa/`
- testes Alexa em `functions/test/` ou diretórios equivalentes
- `alexa/scripts/prepare-skill-package.cjs`
- workflows de publicação em `.github/workflows/`
- `docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md` e instruções `AGENTS.md`

## Etapa 0 — Levantamento e linha de base

Antes de editar:

- Confira branch, `git status` e alterações existentes. Não sobrescreva trabalho do usuário.
- Descreva o fluxo atual de `CreateOrderIntent`: extração de slots, estado do rascunho, perguntas de esclarecimento, confirmação e gravação.
- Descubra como a skill trata campos ausentes, preço por unidade/total, `AMAZON.DATE`, cancelamento e confirmação.
- Localize testes e comandos reais do projeto. Rode os testes relevantes existentes antes da mudança.
- Anote falhas pré-existentes separadamente; não as atribua às suas alterações.
- Monte uma tabela pequena com as frases abaixo, os slots esperados e o comportamento atual.

Casos mínimos para avaliar:

1. “criar pedido de dez caixinhas para Maria a dez reais cada com entrega sábado”
2. “criar pedido de caixinha para Maria no valor de dez reais e entrega sábado”
3. “dez caixinhas para Maria, total de cem reais, entrega sábado”
4. “criar pedido de dez caixinhas para Maria”
5. resposta curta de acompanhamento: “dez unidades”, “cada”, “no total”, “sábado”, “não, domingo”

Não afirme que uma frase é reconhecida pela Alexa física sem um teste real no dispositivo. Se não houver ferramenta que reproduza a resolução NLU da Alexa, diga isso explicitamente.

## Etapa 1 — Modelo de interação Alexa (mudança pequena)

Inspecione o `pt-BR.json` e o modelo de interação atual. Faça apenas as alterações mínimas necessárias para cobrir combinações naturais de produto, quantidade, cliente, preço explícito por unidade/total e data de entrega.

Requisitos:

- Mantenha `CreateOrderIntent` e os nomes e tipos de slots existentes, salvo se houver incompatibilidade demonstrada.
- Inclua a forma “{quantity} {product} para {customer} a {unitPrice} reais cada com entrega {deliveryDate}” ou a variação mais adequada ao modelo atual. Inclua também uma forma concisa com preço explicitamente total se ainda não estiver coberta.
- Teste a frase completa desejada e algumas variações no validador/modelo ASK disponível no projeto.
- Não coloque “Papelaria de Testes” nem “Alexa” dentro das amostras da intent.
- Verifique a recomendação da Alexa para amostras que contenham apenas um slot. Se `{customer}` sozinho for inválido ou gerar conflito, corrija isso em uma mudança separada e pequena, ajustando também o handler correspondente e testes. Não elimine a capacidade de responder só com o nome durante um diálogo sem antes provar uma alternativa compatível.
- Confirme que “caixinha” resolve para o produto canônico esperado e não para um item diferente.
- Não assuma que `AMAZON.FirstName` reconhece qualquer nome. Registre limitações de nomes como hipótese até validar pela Alexa.

Critério de saída: JSON válido, modelo ASK válido conforme as ferramentas disponíveis e teste/regressão do roteamento das intents. Se o validador remoto exigir credenciais ou rede, não solicite nem exponha segredos; registre o bloqueio e faça validação local.

## Etapa 2 — Interpretação dos campos e perguntas de esclarecimento

Inspecione o parser e a máquina de estados existentes antes de editar. Faça a menor mudança que deixe explícita a seguinte política:

- Produto, cliente, quantidade, preço e data reconhecidos na frase inicial devem ser preservados no rascunho.
- Quantidade ausente permanece ausente; nunca use `1` como padrão. Pergunte a quantidade.
- “R$ 10 cada”, “R$ 10 por unidade” ou expressão equivalente significa preço unitário: calcule `quantidade × preço unitário` usando centavos inteiros.
- “R$ 100 no total” significa valor total: não multiplique pela quantidade.
- “R$ 10” ou “no valor de R$ 10” sem “cada/por unidade/no total” é ambíguo no contexto. Pergunte se é por unidade ou total e preserve os demais campos enquanto espera a resposta.
- Um preço inválido, fora do limite ou não interpretável não pode criar/alterar um pedido parcialmente confirmado.
- Uma resposta curta como “cada” ou “no total” só deve preencher a pergunta pendente quando houver um campo de preço ambíguo no rascunho; em outros estados, não pode sobrescrever dados silenciosamente.
- Data relativa como “sábado” precisa virar uma data civil completa coerente com `America/Sao_Paulo`. Se a Alexa fornecer data parcial ou valor não suportado, pergunte dia/mês ou uma data completa. Leia a data resolvida de volta na confirmação.
- Se a resolução de “sábado” puder significar mais de uma data, não escolha silenciosamente; use a regra já definida pelo projeto ou pergunte a data exata.
- A confirmação final deve resumir produto, quantidade, cliente, preço unitário/total, valor calculado e data. Só grave após confirmação afirmativa explícita.
- “Não”, cancelar, corrigir ou substituir um campo deve seguir a máquina de estados atual sem confirmar um rascunho antigo.

Use operações monetárias em centavos inteiros e mantenha limites e validações existentes. Não introduza interpretação por regex sobre a frase inteira se os slots Alexa já fornecem os campos estruturados.

## Etapa 3 — Testes de regressão focados

Adicione ou ajuste testes comportamentais nos testes existentes. Evite testar detalhes privados sem necessidade. Cubra ao menos:

1. Frase completa: dez caixinhas, Maria, R$ 10 cada, sábado. O rascunho conserva os slots e o valor total é R$ 100,00.
2. Preço explicitamente total de R$ 100,00 para dez unidades. O valor continua R$ 100,00, sem multiplicação.
3. Quantidade ausente. O diálogo pergunta quantidade; nenhum pedido é gravado antes de obtê-la.
4. Preço ambíguo. O diálogo pergunta “por unidade ou valor total?”, preserva produto/cliente/data e não grava antes da resposta e confirmação final.
5. Resposta “cada” e resposta “no total” só são aceitas na pergunta de preço pendente e resultam no cálculo correto.
6. Data inválida, parcial, passada ou ambígua não é aceita silenciosamente. Uma data completa válida é repetida na confirmação.
7. “Não”, cancelamento, correção de campo e confirmação afirmativa preservam as regras atuais.
8. Uma mensagem fora de contexto não muda preço, quantidade, cliente ou data.
9. Escapes/saída falada continuam seguros; logs não contêm corpo completo, segredo ou dados pessoais desnecessários.
10. A gravação final continua usando a transação/serviço de pedido existente e não acontece antes do “sim” explícito.

Rode primeiro os testes focados; em seguida rode typecheck/lint/build e a suíte de regressão adequada ao escopo, conforme scripts existentes. Não altere testes não relacionados para fazer a suíte passar. Explique comandos e resultados reais.

## Etapa 4 — Preparação operacional e limites de validação

Revise os scripts/workflows para entender o processo, sem executá-los:

- A atualização do modelo Alexa e a implantação de Firebase Functions são artefatos separados. Um não implica o outro.
- O endpoint atual e a validação de origem por `x-origin-secret` dependem da configuração implantada de Cloudflare/Functions. Preserve-os; não mude infraestrutura nesta tarefa.
- Não rode deploy, publicação de skill, sincronização com Console, nem teste real de Echo.
- Liste os passos manuais necessários depois da revisão de código: atualizar/publicar o modelo correto no Console conforme o fluxo do projeto; implantar Functions apenas se o código de backend mudou; conferir o segredo de origem no caminho Cloudflare → Function sem revelar seu valor; por fim testar no simulador e no Echo, anotando horário e request ID sem guardar payload/PII.
- Não repita como recomendação genérica etapas que já estão confirmadas pelo usuário. Marque cada etapa como “verificada nesta tarefa”, “dependente de produção/dispositivo” ou “não verificada”.

## Critérios de aceitação

A implementação só está pronta se:

- A frase completa com quantidade, produto, cliente, preço unitário explícito e sábado passa pelo caminho esperado nos testes locais.
- A frase sem quantidade e com preço ambíguo pede os dados que faltam sem descartar os campos já reconhecidos.
- Preço unitário e preço total produzem valores diferentes apenas conforme a expressão explícita do usuário; não há multiplicação acidental.
- Data relativa inválida/incompleta não vira uma data inventada.
- Nenhum pedido é persistido antes do resumo e da confirmação afirmativa.
- Os testes relevantes passam e não há regressão nos intents/fluxos já existentes.
- Não foram adicionados custo de IA por requisição, chamadas externas, logging de PII, segredo ou alteração de infraestrutura.
- O relatório deixa claro o que ainda precisa de validação na Alexa real.

## Formato obrigatório do relatório final

Entregue um resumo curto e verificável com:

1. Comportamento antes e depois.
2. Arquivos alterados e motivo de cada alteração.
3. Testes executados e resultado exato; se algum não rodou, explique por quê.
4. Uma tabela com os cinco casos da Etapa 0 e comportamento final esperado/observado.
5. Pontos que ainda dependem de Console, deploy ou Echo físico.
6. Riscos que restaram, classificados por prioridade.
7. Confirmação explícita de que não houve deploy/publicação e de que nenhuma alegação sobre Echo físico foi inferida de testes locais.

Comece agora pela Etapa 0. Continue pelas etapas em ordem, mantendo cada alteração pequena, revisável e validada antes de avançar.
