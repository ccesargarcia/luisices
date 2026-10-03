# Revisão do módulo Alexa — `develop` em `90729fe`

Data: 2026-10-03  
Branch: `develop`  
Commit revisado: `90729fe` — `fix(alexa): normalizacao NLP de decimais, ordinais e resolucao contextual de quantidade`

## Resumo

Atualizei `develop` com `git pull --ff-only origin develop`. O avanço foi fast-forward de `971944d` para `90729fe`, e a árvore ficou limpa. A revisão foi estática: não executei testes nem fiz deploy. O pull trouxe parser local de números/valores, alterações extensas no diálogo e mais exemplos no modelo de interação. O parser local evita chamadas adicionais ao Gemini, o que ajuda custo e latência.

O isolamento do pedido continua usando `uid`, vínculo Alexa e ambiente em operações importantes. Os principais riscos encontrados estão na seleção de intents numéricas, na aceitação de texto parcial como quantidade e na heurística que tenta decidir se “vinte reais e oito” significa 28 reais ou 20,08.

## Prioridades

### P1 — Número isolado continua ambíguo entre intents

O modelo tem `{quantity}` como exemplo isolado em `ProvideQuantityIntent` (`pt-BR.json:298`) e `{number}` isolado em `ProvideNumberIntent` (`pt-BR.json:564`). Ambos usam `AMAZON.NUMBER`. Assim, “30” pode ser classificado de formas diferentes antes de o código contextualizar o valor pelo estado salvo. O roteamento por `expectedInput` no diálogo ajuda depois da classificação, mas não elimina a colisão do modelo nem garante o intent escolhido pelo Alexa.

**Impacto:** a resposta simples “30” pode falhar ou ser interpretada como valor monetário, em especial no dispositivo real.  
**Ação:** reduzir a sobreposição dos exemplos e validar intent/slots escolhidos no simulador e no Echo para cada estado esperado.

### P1 — `normalizeQuantity` aceita número inicial apesar de texto incompatível

Em `functions/alexa/nlpHelper.js:254-259`, a expressão regular captura qualquer número no começo e ignora o restante. Por exemplo, “30 reais e 50 centavos” pode virar quantidade `30`; “30 talvez” também pode virar `30`. Se esse slot chegar quando o sistema espera preço, o diálogo pode remapear o valor como R$ 30,00, perdendo os centavos.

**Impacto:** dados incorretos podem entrar no rascunho sem pedir esclarecimento. A confirmação antes de gravar reduz o risco de persistência silenciosa, mas a fala e o resumo podem induzir erro.  
**Ação:** aceitar número inicial apenas com sufixos conhecidos de quantidade; rejeitar ou encaminhar expressões monetárias completas para o parser de preço.

### P1 — Heurística de preço confunde numeral composto com centavos

`normalizeCurrencyToFloat` e `resolveCompoundNumber` convertem construções como “20 reais e 8” em R$ 28,00 para cobrir a decomposição NLU de “vinte e oito” (`nlpHelper.js:384-425`). A mesma expressão pode ser entendida como R$ 20,08. A escolha atual é silenciosa, embora o valor possa afetar o total do pedido.

**Impacto:** preço unitário/total potencialmente incorreto. A fala de confirmação é uma barreira importante, desde que o resumo diferencie claramente modo unitário e total.  
**Ação:** quando a entrada não tiver marcador inequívoco (`cada`, `no total`, `vírgula`, `centavos`) e as interpretações divergirem, perguntar qual valor o usuário quis dizer. Confirmar a interpretação escolhida no resumo.

### P2 — Conversão de dia da semana pode selecionar hoje

Para `XXXX-WXX-D`, o cálculo em `dialog.js:122-137` permite `daysAhead === 0`; se hoje for o dia pedido, grava hoje. Isso pode estar correto para “entregar hoje”, mas “sábado” pode significar o próximo sábado dependendo do horário e do uso. Datas `YYYY-Www-D` também são convertidas sem validar se a semana 53 existe naquele ano; uma entrada inconsistente pode transbordar para outra data.

**Impacto:** data válida sintaticamente pode não corresponder à intenção do usuário.  
**Ação:** definir a regra de “hoje” para dia da semana e validar a semana ISO após converter; confirmar a data completa no resumo.

### P2 — Testes novos cobrem parsers, mas não a ambiguidade de roteamento ponta a ponta

Foi adicionado `tests/unit/alexa/nlp-and-quantity-bug.test.ts` e houve expansão dos testes de diálogo, preço, frases longas e APL. A colisão entre exemplos `{quantity}` e `{number}` aparece diretamente no JSON e precisa de validação do modelo Alexa: um teste unitário que chama o handler com um intent já escolhido não prova qual intent o NLU real selecionará.

**Ação:** incluir uma matriz de intents/slots para “30” em cada `expectedInput` e verificar o modelo publicado no simulador. Depois validar no Echo, pois simulador não prova comportamento de voz em hardware.

## Pontos positivos observados

- Conversão de números por extenso, ordinais, decimais e valores em centavos fica no código local (`nlpHelper.js`), sem adicionar chamadas de modelo para interpretar pedidos.
- Consulta ao catálogo mantém escopo por usuário; listagem recente consulta pedidos com `userId` e limite.
- Cancelamento valida titularidade, vínculo, ambiente e estado cancellable (`dialog.js:968-991`). O fluxo de repetição também valida titularidade, vínculo, ambiente, expiração e estado terminal (`dialog.js:1045-1079`).
- A confirmação continua explícita antes do avanço final, e há limites para quantidade e valor.
- `dynamicEntities.js` agora tolera implementações/mocks de Firestore sem os métodos encadeados esperados.
- `repository.js` verifica a disponibilidade da coleção antes de gravar auditoria; os comentários indicam que não registra áudio, slots brutos ou nomes completos.

## Segurança, custo e entrega

- Não encontrei mudança no pull que remova as verificações de `uid`/vínculo/ambiente identificadas nos fluxos de cancelar e repetir. Isso é uma leitura estática; regras Firestore e execução em produção não foram verificadas nesta revisão.
- `git pull` apenas atualizou o repositório. Não confirma publicação do endpoint Firebase, modelo Alexa em desenvolvimento/produção, assets APL nem funcionamento no Echo. O workflow de skill publica o modelo em `development` quando executado por push em `alexa/**`; as mudanças em `functions/alexa/**` exigem deploy de Functions separado.
- A mudança em `functions/ai/geminiClient.js` diferencia `apiKey: ''` de opção ausente. Isso permite suprimir fallback para variável de ambiente quando uma chave vazia é explicitamente passada; não adiciona custo/latência de Gemini ao fluxo de parsing Alexa.
- O commit traz testes, mas nenhum foi executado nesta tarefa. `git diff --check` sobre o intervalo revisado não apontou erros de whitespace.

## Próximos passos recomendados

1. Corrigir o parse permissivo de quantidade e cobrir entradas com sufixos desconhecidos e texto monetário.
2. Resolver a sobreposição entre `{quantity}` e `{number}` no modelo e avaliar a seleção real no simulador.
3. Fazer a heurística de preço pedir esclarecimento quando cardinal e decimal forem plausíveis.
4. Definir e validar as regras de dia da semana/semana ISO, incluindo pedido para hoje.
5. Após essas correções, executar os testes Alexa existentes e validar o mesmo conjunto de frases no simulador, no endpoint publicado e em Echo físico.

