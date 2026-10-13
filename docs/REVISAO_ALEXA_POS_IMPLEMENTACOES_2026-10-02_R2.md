# Revisão Alexa após novas implementações — 02/10/2026

## Estado revisado

Branch local `develop`, HEAD `91f19b9`; a referência local `origin/develop` aponta ao mesmo commit, sem fetch nesta revisão. Há mudanças locais ainda não commitadas no modelo de interação, em `functions/alexa/dialog.js` e em `functions/alexa/apl.js`. Não houve mudança no arquivo de testes nesta rodada. Os demais documentos e scripts não rastreados foram preservados.

Não rodei testes, build, deploy, publicação do modelo, simulador ou validação física. Esta revisão se baseia no código e no diff local. O estado implantado da Function e o modelo efetivamente ativo na Alexa seguem sem confirmação.

## Melhorias identificadas

- O modelo removeu o slot nu de `ProvideQuantityIntent` e de `ProvidePriceIntent`. Agora a única amostra explícita de número isolado é `ProvideNumberIntent: {number}`, o que reduz a colisão para “30”.
- `ProvideNumberIntent` foi ligado ao diálogo e tenta preencher a quantidade ou preço de acordo com o campo esperado.
- Os layouts do cartão de pedido e sucesso agora alternam entre linha e coluna usando `viewport.width` e `viewport.height`. APL 1.6 permite binding dinâmico para `Container.direction`. [Referência do Container APL 1.6](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-container-v1-6.html)
- Os documentos principais permanecem em APL 1.6. A checagem de suporte voltou a depender da interface APL anunciada pelo dispositivo, sem rejeitar todo viewport circular.
- O Frame de sucesso voltou a fornecer largura e altura. O teste de tela circular está ativo; o teste de sucesso também verifica `orderNumber`, presente no datasource atual.

## Achados ainda abertos

### P1 — o mapeamento da intent numérica usa estado de sessão antes do estado persistido

Em `dialog.js`, `ProvideNumberIntent` roteia o número com base em `sessionAttrs.expectedInput`. O draft é recuperado quando o atributo está ausente, mas um atributo existente e antigo não é substituído nessa etapa. Mais adiante o código lê `existingData.expectedInput` do Firestore e usa esse estado para mapear valores genéricos, mas um número já colocado explicitamente em `unitPriceSlot` ou `totalSlot` não passa pela mesma resolução genérica.

Se a sessão e o draft estiverem divergentes, a mesma resposta isolada pode ser classificada como preço unitário/total em desacordo com a pergunta que o draft ainda espera. A confirmação falada reduz o risco de gravação despercebida, mas não elimina a inconsistência do rascunho.

**Recomendação:** usar o estado autoritativo carregado do draft para encaminhar `ProvideNumberIntent`. Definir comportamento seguro quando o draft não existe, expirou ou está em estado terminal. Adicionar regressão em que `sessionAttrs.expectedInput` conflita com `draft.expectedInput` para quantidade, preço unitário e total.

### P2 — ainda há padrões decimais duplicados entre intents

Embora o número isolado tenha um destino único, `ProvidePriceIntent` e `ProvideNumberIntent` ainda contêm amostras com a mesma estrutura, como `{valor} e {cents}` e `{valor} reais e {cents}`. A primeira intent produz `price/cents`; a segunda produz `number/cents`. O handler combina ambos, mas a escolha da NLU e o preenchimento dos slots no modelo publicado não foram demonstrados.

A implementação torna ambos os caminhos processáveis no backend; não comprova que frases como “três e cinquenta” sejam reconhecidas de forma consistente pelo dispositivo.

**Recomendação:** concentrar combinações sem qualificador na intent genérica e manter intents de preço para frases explicitamente qualificadas (“o valor é…”, “custa…”, “cada…”). Testar modelo no simulador da Alexa e comparar os envelopes sanitizados recebidos.

### P2 — fallback não cobre imagem de produto inválida

O APL usa `imageUrl || DEFAULT_FALLBACK_IMAGE`. Isso cobre URL ausente ou vazia. Se o produto trouxer uma URL preenchida que retorna erro, o documento continua tentando carregar essa URL; o fallback não é aplicado. O endereço padrão continua em `dev.luisices.com.br`, igual ao `largeIconUri` em `skill.json`. A imagem no host remoto não foi verificada nesta revisão.

**Recomendação:** validar a origem das imagens do catálogo, usar uma URL pública HTTPS estável para cada ambiente e decidir o fallback antes de montar o datasource. Incluir estado visual que não dependa da mesma imagem quebrada. Confirmar resposta HTTP, tipo de conteúdo e acessibilidade pela Alexa.

### P2 — melhorias responsivas ainda precisam de validação real

O cartão agora empilha imagem e dados em viewports retrato, e usa linha em paisagem; isso é avanço concreto. Ainda não há prova visual no Echo Show 15. As dimensões e o fluxo de foco/seleção dependem do renderer e do dispositivo. A paleta APL segue hardcoded (`#161214`, `#231C1E`, `#7B4D50` etc.) enquanto `src/styles/theme.css` define tokens próprios como fundo `#fff8f7` e primária `#613d3e`; portanto, a tela ainda não espelha o design system web de forma direta.

O suporte ao Echo Spot 2024 deve continuar sendo voz-only, pois esse modelo não anuncia suporte APL para custom skills. O Spot original de 2017 anuncia suporte APL e não deve ser desativado apenas por ser circular. [Compatibilidade APL dos Echo Spot](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-latest-version.html)

**Recomendação:** validar nos viewports retrato/paisagem no authoring tool, depois no Echo Show 15; conferir foco via controle na Fire TV. Centralizar os tokens visuais APL e documentar qualquer diferença intencional em relação ao tema web.

### P3 — documentação de implementação extrapola a evidência disponível

`docs/ANALISE_ALEXA_VOZ_E_APL.md` declara causas de NLU como confirmadas e descreve o roteamento como resolvido. No repositório não há envelope real do Echo nem evidência de publicação que comprove essas conclusões. O texto também afirma que testes passaram; como esta revisão não executou testes, essa afirmação não foi revalidada aqui.

**Recomendação:** registrar as conclusões como hipótese até comparar intent/slots reais e versões implantadas. Anexar os comandos e saídas de teste ao processo de revisão, sem guardar transcrições ou payloads sensíveis.

## Estado atual dos sintomas

| Sintoma | O que melhorou | O que falta |
| --- | --- | --- |
| Valor decimal falado | Parser e combinações de slots tratam valores com centavos no backend. | Sobreposição residual no modelo e NLU real ainda sem evidência. |
| Quantidade “30” isolada | Há uma intent genérica para número puro; o exemplo saiu das intents de quantidade/preço. | Confirmar que o modelo publicado escolhe essa intent; garantir roteamento pelo estado do draft, mesmo com atributos de sessão antigos. |
| Imagem e layout Echo Show 15 | Layout agora alterna linha/coluna e o cartão tem imagem redimensionável. | URL preenchida mas inválida não aciona fallback; tela, toque e design system precisam de validação física. |

## Ordem sugerida

1. Corrigir a precedência do estado do draft ao rotear respostas de `ProvideNumberIntent`.
2. Reduzir sobreposição de padrões decimais no modelo e validar no simulador Alexa.
3. Validar/fixar URLs de imagem e aplicar fallback também a origem inválida.
4. Validar layout, paleta e interação no Echo Show 15 e Fire TV.
5. Publicar Function, modelo da skill e Hosting conforme os arquivos alterados; testar voz física correlacionando apenas metadados sanitizados.

## Limites

Esta revisão não declara os sintomas resolvidos no dispositivo. Alterações locais no JSON não atualizam o modelo Alexa ativo; alterações locais na Function não fazem deploy. Testes automatizados não validam ASR/NLU nem apresentação física.

