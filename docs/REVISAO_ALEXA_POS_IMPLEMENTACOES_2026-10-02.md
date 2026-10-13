# Revisão pós-implementações — módulo Alexa
## 02/10/2026

## Escopo e estado analisado

Branch local: `develop`. HEAD local e referência local `origin/develop`: `91f19b9`. A referência remota não foi consultada por fetch. A revisão considera também as alterações ainda não commitadas em:

- `alexa/skill-package/interactionModels/custom/pt-BR.json`
- `functions/alexa/apl.js`
- `functions/alexa/dialog.js`
- `tests/unit/alexa/apl-and-dynamic-entities.test.ts`

Há ainda três scripts não rastreados na raiz: `patch.cjs`, `patch_apl.cjs` e `patch_test.cjs`, além de documentos locais. Nenhum arquivo foi alterado nesta revisão. Não rodei testes nem fiz deploy/publicação. Os achados abaixo são revisão estática; não confirmam o que a Alexa física ou a versão implantada está executando.

## Resumo

As mudanças locais adicionam `ProvideNumberIntent`, juntam slots de reais e centavos, substituem dois layouts APL e mudam a URL padrão da imagem para o host `app`. Ainda há conflitos no modelo de voz e regressões de compatibilidade visual. O relatório `ANALISE_ALEXA_VOZ_E_APL.md` chama algumas causas de “confirmadas” e afirma que os testes passaram, mas não apresenta envelopes de execução ou saída dos comandos. O código só permite confirmar os fatos abaixo.

## Achados prioritários

### P1 — “30” ainda pode colidir entre intents genéricas

O modelo agora tem `ProvideNumberIntent` com a amostra isolada `{number}`, mas `ProvidePriceIntent` ainda tem `{price}` isolado. As duas intents também têm padrões equivalentes para número seguido de centavos. A nova intent centraliza o roteamento no código, porém o modelo ainda oferece mais de um destino para a mesma fala.

A amostra isolada foi removida de `ProvideQuantityIntent`, então o resultado depende de a NLU escolher `ProvideNumberIntent` e preencher `number`. O handler encaminha esse número pelo `sessionAttrs.expectedInput`; a recuperação de draft só preenche esse atributo quando está ausente. O código depois também consulta o estado persistido, mas isso não elimina a incerteza de classificação anterior.

**Recomendação:** manter uma única intent para números sem qualificador, remover amostras de número puro das intents de preço e total e usar o estado esperado do draft autorizado para classificar o valor. Testar envelopes reais/simulados para cada intent e verificar no simulador qual intent é selecionada. Só um teste físico pode confirmar o ASR/NLU do Echo.

### P1 — documentos APL 2023.2 são enviados sem conferir o runtime

Os cartões de pedido e sucesso mudaram de APL 1.6 para 2023.2. `supportsApl` verifica somente se a interface APL existe; não compara `runtime.maxVersion` com a versão do documento. Dispositivos com APL mas runtime abaixo de 2023.2 podem recusar a renderização. A página oficial diz que um renderer deve recusar uma versão de documento que não suporte e recomenda alternativas para dispositivos mais antigos.

**Recomendação:** selecionar documento compatível com `runtime.maxVersion` ou fornecer fallback de menor versão. Testar pelo menos a versão 1.6 e a 2023.2 no authoring tool/simulador. Não inferir sucesso da emissão do `RenderDocument`.

Fonte: [versões APL e compatibilidade com runtimes antigos — Amazon](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-latest-version.html).

### P1 — a detecção desativa todo dispositivo com viewport circular

`supportsApl` retorna `false` para qualquer dispositivo que anuncie APL e tenha `Viewport.shape === ROUND`. Isso inclui potencialmente o Echo Spot original de 2017, que a Amazon documenta como compatível com APL. O Echo Spot 2024 já não anuncia APL; não é necessário desativar toda tela circular para tratá-lo por voz. O teste de suporte ao Echo Spot foi marcado `it.skip`, ocultando essa regressão da execução normal.

**Recomendação:** respeitar `supportedInterfaces` e suportar o perfil circular quando houver APL, ou documentar uma decisão explícita de retirar suporte também do modelo antigo. Não identificar o Echo Spot 2024 apenas pelo formato do viewport.

Fonte: [suporte APL por dispositivo, incluindo Echo Spot 2017 e 2024 — Amazon](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-latest-version.html).

### P2 — uma tela de sucesso não inclui altura explícita no Frame

O `Frame` principal de sucesso define `width` e `maxWidth`, mas não `height`. A documentação de APL orienta incluir largura e altura no `Frame`. O conteúdo varia com nome do produto/cliente; deixar a altura implícita cria risco de diferenças de layout/renderização entre runtimes e viewports.

**Recomendação:** definir geometria do Frame com altura apropriada ou reorganizar o documento para um contêiner cuja altura acompanhe o conteúdo; validar texto longo e viewports de TV/Show.

Fonte: [APL Frame — Amazon](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-frame.html).

### P2 — regressão aparente no contrato de dados de sucesso e teste enfraquecido

`buildOrderSuccessAplDirective` deixou de incluir `orderNumber` em `datasources.payload.success`. O teste ainda acessa essa propriedade para pedidos com e sem número (linhas 604 e 610 do teste), então as expectativas não correspondem à implementação atual. Há também um comentário solto `// expect removed` substituindo uma asserção e o teste circular do Echo Spot foi marcado como `it.skip`.

Isso é evidência estática de que a alegação “todos os testes passaram” no relatório de implementação precisa ser conferida; não rodei a suíte e não afirmo que conheço a saída atual.

**Recomendação:** decidir se `orderNumber` ainda faz parte do contrato e restaurar o campo ou remover/ajustar as expectativas de forma intencional. Restaurar teste ativo para os comportamentos que o módulo promete e não usar `skip` para esconder incompatibilidade sem registrar a decisão.

### P2 — imagem padrão mudou, mas os ícones do pacote da skill ainda apontam para dev

`functions/alexa/apl.js` agora usa `https://app.luisices.com.br/images/alexa-large-icon.png`, enquanto `alexa/skill-package/skill.json` mantém `largeIconUri` em `https://dev.luisices.com.br/images/alexa-large-icon.png`. O código local mostra o novo endereço, mas a disponibilidade pública dos dois endereços não foi confirmada nesta revisão. A ferramenta de navegação não conseguiu abrir nenhum deles; isso não prova que estejam fora do ar.

**Recomendação:** alinhar os URLs por ambiente e confirmar resposta HTTP pública, tipo de conteúdo, redirecionamentos e política de cache a partir de uma ferramenta externa ou da Alexa. O build local não comprova que Hosting já publicou o asset.

### P2 — layout ainda é um único arranjo horizontal para todos os retangulares

O cartão novo usa uma única linha `row`, imagem `35vw` com limites de 300dp, e coluna de texto para todos os viewports não circulares. Importar `alexa-viewport-profiles` não cria responsividade automaticamente; nenhum perfil é usado para trocar a composição. Tela grande pode ganhar espaço, mas telas retrato/compactas continuam recebendo uma composição horizontal. O sucesso também usa uma linha para cliente e total, sujeita a falta de espaço com texto longo.

Os `AlexaButton` são uma melhoria válida: o componente é documentado para toque e controle. Ainda assim, a revisão do código não comprova aparência, foco real ou acionamento no Echo Show 15/Fire TV.

**Recomendação:** usar perfis responsivos ou condições de viewport para composições distintas (paisagem, retrato e TV), tratar nomes longos e validar no simulador e no aparelho físico. O Echo Spot 2024 segue voz-only.

Fontes: [AlexaButton e compatibilidade de viewport — Amazon](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-alexa-button-layout.html) e [construir documentos APL responsivos — Amazon](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-build-responsive-apl-documents.html).

### P3 — scripts de patch temporários estão na raiz do repositório

`patch.cjs`, `patch_apl.cjs` e `patch_test.cjs` são arquivos locais não rastreados que contêm rotinas para substituir trechos de código e gravar diretamente nos arquivos da aplicação/teste. Eles parecem artefatos usados durante a edição, não fazem parte do produto e podem reescrever arquivos se forem executados novamente. Nesta leitura não encontrei credenciais nesses scripts.

**Recomendação:** não os incluir no commit; depois de confirmar que não são mais necessários, removê-los da área de trabalho. Não foram apagados para preservar os arquivos locais do usuário.

## Estado dos três sintomas relatados

| Sintoma | Evidência no código atual | Situação |
| --- | --- | --- |
| Decimais falados | Parser determinístico aceita vários formatos; nova intent combina slots `number` e `cents`. Modelo ainda tem padrões concorrentes. | Parcial no código; ASR/NLU e publicação não confirmados. |
| Quantidade “30” isolada | `ProvideNumberIntent` trata número isolado, mas `ProvidePriceIntent` ainda tem amostra isolada `{price}`. | Melhoria incompleta; colisão continua possível. |
| Imagem/layout Echo Show 15 | URL padrão do APL passou para host app; layout tem mais dimensões relativas e AlexaButton. Layout horizontal permanece universal e URL física não foi confirmada. | Melhoria parcial; rendering e asset público pendentes de validação. |

## Próxima ordem recomendada

1. Resolver a duplicidade de amostras numéricas e garantir um único caminho genérico contextual.
2. Tratar compatibilidade por `runtime.maxVersion` e restaurar suporte circular quando o dispositivo anunciar APL.
3. Corrigir o contrato `orderNumber`/teste e revisar o teste que está `skip`.
4. Criar layouts por perfil de viewport e confirmar os URLs públicos de imagem e manifesto.
5. Só então publicar Function, modelo Alexa e Hosting conforme as mudanças de cada artefato e validar no Echo Show 15/Fire TV.

## Limites desta revisão

Não executei testes, validação visual no simulador, deploy da Function, publicação do modelo Alexa ou validação física. O relatório de implementação afirma que executou testes, mas esta revisão não encontrou saída desses comandos; as inconsistências estáticas acima tornam necessária uma nova execução antes de confiar nessa afirmação.

