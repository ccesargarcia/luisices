# Segunda revisão da IA — develop

Data: 26/09/2026. HEAD: `e1b9444` mais alterações locais não commitadas. Revisão sem modificar a implementação, sem chamadas externas de geração e sem deploy.

## Parecer

**Melhorou, mas ainda não está pronta para publicação.** O relatório de implementação continua afirmando que todos os 15 achados foram resolvidos; isso não corresponde à execução atual.

## Correções confirmadas

- R01: import de `MODEL_CONFIG` corrigido. Handler com banco/telemetria simulados executa sem ReferenceError.
- R04: Timestamp real do Firebase Admin é convertido corretamente; `productName` é preservado na projeção do pedido.
- R05: consulta de insumos agora filtra proprietário para não-admin e aplica filtro adicional no resultado. O vazamento global anterior foi corrigido; acesso ampliado por permissão de precificação ainda não é tratado nessa consulta.
- R13: reprodução da fronteira `2026-09-26T01:00Z` agora inicia o dia de São Paulo em `2026-09-25T03:00Z`.
- R03 parcial: `messageText` e `productName` voltaram ao retorno. O campo `type` do WhatsApp ainda recebe enum diferente do frontend (`cobranca_saldo`/`pedido_pronto` versus `cobranca`/`pronto_retirada`).
- R02/R12 parcial: imagens voltaram ao payload e a lojinha passou a ler URL/MIME. Porém, o download ainda precisa das correções abaixo.
- R08 parcial: o exemplo do setup deixou de multiplicar dez vezes o custo; configurações do usuário são carregadas. O resultado ainda mistura custo unitário de uma peça com preço unitário do lote.
- R14 parcial: tarifas de 2.5 Flash/Lite foram atualizadas para os valores verificados na revisão anterior. O parâmetro de raciocínio foi acrescentado ao cálculo, mas não chega à telemetria pelo cliente/handlers.
- R15 parcial: respostas de ferramentas são concatenadas; limites de histórico e quantidade de ferramentas foram aplicados. Não há validação completa dos argumentos nem execução de dependências entre rodadas.

## Pendências prioritárias

### 1. P1 — consumo diário lê a coleção errada e o painel anuncia disponibilidade fictícia

`functions/ai/usage.js:145` consulta `ai_budget_daily/{data}`. O registro de consumo grava `ai_usage_daily/{data}`; reservas usam `ai_budget_daily/{uid}_{data}`. Portanto, a leitura normal não encontra o agregado e mostra zero.

Reproduzido com banco simulado contendo nove chamadas no agregado correto: `totalDaily.used` retornou zero. O retorno também continua sem `daily`, usado pela badge do chat. `models` declara `ONLINE`, HTTP 200 e uso zero do fallback sem sondagem ou agregação por modelo. Cotas 1.500/dia e 45.000/mês continuam fixas; erros de leitura viram sucesso com zero.

Correção: consultar o agregado correto, compatibilizar consumidores/campos e exibir indisponível quando o estado não é conhecido. Remover alegações de limites confirmados sem fonte de configuração. Reset fixo às 08:00 UTC ainda ignora horário de verão do Pacífico.

### 2. P1 — financeiro e demais dados mutáveis continuam em cache

`handlers.js:308` impede cache de rascunho e preço, mas permite consultas financeiras, pedidos, clientes, briefing e galeria. Reproduzi duas consultas financeiras idênticas: a segunda reutilizou a primeira sem chamar a ferramenta/provedor.

A separação por papel/histórico/imagem melhorou e corrigiu a reprodução antiga de mistura com conversa sem histórico. Ainda faltam versão de permissões/modelo e política que exclua dados mutáveis. A escrita com histórico/imagem continua, embora essas entradas não sejam recuperadas pelo caminho atual; ocupa memória sem benefício.

Correção: cache somente para tarefas comprovadamente estáveis e elegibilidade igual na leitura/escrita. Invalidar por mudanças relevantes de escopo/configuração. `coalesce` segue sem uso no handler.

### 3. P1 — consultas permanecem incompletas

`repositories.js:65–72` mantém 200 pedidos admin e 100 por vínculo para usuários; sem paginação. Clientes: 150 admin/100 usuário. Galeria: 50. Os totais e `hasMore` continuam calculados sobre essa amostra.

Além disso, clientes e galeria de não-admin passaram a consultar somente `userId`, embora o filtro de autorização reconheça também `createdBy` (e, para clientes, `assignedTo`). Registros acessíveis só por esses outros vínculos ficam fora da consulta.

Correção: consultas completas no escopo autorizado, deduplicação e agregações/paginação reais. Testes precisam conter registro relevante depois do limite e registros acessíveis pelos diferentes vínculos.

### 4. P1 — cobrança aceita valor arbitrário em customText

Em `tools.js`, `generatedText = customText` continua impedindo o template de saldo real quando há texto fornecido. Reproduzi pedido com saldo R$ 100 e `customText: 'Pague R$ 999,00'`: `messageText` retornou R$ 999,00.

Telefone real substitui o fornecido quando disponível e cancelados agora têm mensagem específica, mas homônimos continuam resolvidos com `.find`. O frontend também tem fallback por primeira correspondência parcial de nome. Não há revalidação do saldo na confirmação do envio.

Correção: para cobrança vinculada, valor/destinatário/status devem vir do pedido autorizado; texto livre não pode sobrescrever os fatos. Exigir seleção para ambiguidades e nova revisão se o saldo mudar.

### 5. P1 — orçamento da lojinha não é injetado e a reconciliação ainda não é idempotente

`functions/ai/index.js:60` monta `createEnrichStoreProductHandler` sem `budgetManager`. O handler ganhou código de reserva, mas o fluxo de produção não o executa. Galeria agora recebe e usa o gerenciador.

`budget.js` permanece sem registro do estado de cada reserva: repetir reconciliação aplica o ajuste novamente. Não aplica o teto de projeto e usa fallback local em erro de Firestore, reiniciado pela fábrica a cada solicitação. Reserva fixa de 2.000 tokens não limita efetivamente os tokens que serão consumidos. Timeout ou erro de parsing no cliente pode consumir tokens e terminar com liberação da reserva como consumo zero/desconhecido.

Correção: conectar gerenciador em todos os fluxos, persistir transições idempotentes por reserva, controlar teto global e tratar consumo incerto conservadoramente. Testar o caminho da fábrica, não apenas instâncias criadas manualmente nos testes.

### 6. P1 — download de imagem permite destinos arbitrários e perde timeout no corpo

`handlers.js:23–48` faz `fetch(imageUrl)` sem verificar protocolo, host, caminho ou redirecionamento. O timer é cancelado logo após os headers. O tamanho só é conferido depois de carregar o corpo inteiro na memória.

Reproduzido com fetch simulado: URL `http://127.0.0.1/private` foi aceita; corpo que levou 30 ms completou com timeout configurado em 5 ms e sinal sem abortar. Nenhuma conexão a esse destino foi feita na reprodução.

A galeria voltou a depender de GET HTTP público em vez do Admin Storage para imagens privadas/URLs antigas da CDN. Corrigir leitura autorizada por caminho de Storage, validação de URL/redirect e limite durante streaming com timeout até o término. Base64 da lojinha ainda não tem limite de tamanho/conteúdo aplicado antes do provedor.

### 7. P2 — precificação mistura bases e mantém defaults silenciosos

Reprodução com dez unidades, setup 30 minutos e custos/tempo unitário zero:

- `unitCost`: R$ 14,13 (base de uma peça, incluindo todo o setup).
- `suggestedUnitPrice`: R$ 3,10 (base diluída no lote).
- `suggestedTotalPrice`: R$ 31,00.
- Tabela de lote calculada separadamente: R$ 31,04 no cenário anterior; explicitar política de arredondamento entre preço unitário e total.

O card pode exibir custo maior que preço e, ao mesmo tempo, afirmar margem de lucro. Custos ausentes ainda viram R$ 15/R$ 5/15 minutos sem explicitar hipótese. Quantidades fora dos tiers usam fórmula manual adicional, criando uma terceira forma de calcular além das duas cópias frontend/backend.

Correção: retornar todos os custos, ponto de equilíbrio, margem e breakdown na quantidade efetiva, com arredondamento documentado e fonte única. Não tratar defaults de custo como dados cadastrados.

### 8. P2 — telemetria de raciocínio e falhas continua subestimada

`usage.js` aceita `reasoningTokens`, mas `geminiClient.js` não extrai `thoughtsTokenCount` e os handlers não repassam esse campo. Falhas após consumir tokens passam `totalTokens`, sem entrada/saída, fazendo o custo calculado ficar zero. Não há contabilização de todas as tentativas nem idempotência dos agregados.

Correção: propagar usageMetadata por tentativa, inclusive falhas com resposta disponível, e distinguir custo desconhecido de zero. Preservar contexto suficiente para reconciliação sem gravar segredos ou dados pessoais.

### 9. P2 — recursos declarados ainda não estão conectados

- Circuit breaker reinicia a cada `createAiServices`, pois cria um novo cliente por chamada.
- `MAX_TOKENS` não é rejeitado como truncamento no cliente Gemini.
- Declarações JSON de ferramentas não são validação de argumentos no servidor.
- Mais de quatro ferramentas são truncadas silenciosamente com `.slice`; dependências não recebem segunda rodada de modelo.
- Geração institucional continua no chat genérico; o novo handler não está ligado ao frontend/callable.
- Não há caminho operacional determinístico que dispense geração para consultas/templates conhecidos.
- Catálogo completo continua sendo consultado a cada geração, sem seleção por intenção ou cache dos dados estáveis.

## Validação executada nesta revisão

- `npm run typecheck`: passou.
- `npm run test:unit`: 119 testes passaram em 15 arquivos.
- `node --check functions/index.js` e `git diff --check`: passaram.
- Reproduções adicionais locais confirmaram as correções de chat/Timestamp/fuso e as pendências de cache, cobrança, painel e download. Foram usadas dependências simuladas e Timestamp real da biblioteca; sem geração ou tráfego externo.
- Build não repetido: as alterações desta rodada concentram-se em JavaScript das Functions; o build anterior não comprova esses handlers. Não foram executados Playwright, emuladores ou benchmarks reais nesta rodada.

A suíte continua com 119 testes. Passar nessa suíte não comprova as alegações de todos os achados resolvidos: as reproduções acima exercitam situações não cobertas.

## Próximo encaminhamento

Corrigir primeiro itens 1–6 e adicionar regressões nos handlers montados pela fábrica real, com repositórios e banco emulado. Depois alinhar preço/telemetria e completar integrações. Atualizar `RESULTADO_IMPLEMENTACAO_IA.md` para separar corrigido, parcial e pendente, com evidência verificável. Preservar as correções já confirmadas.
