# Copiloto de IA: capacidades, prompt e evolução

Revisão: **10/10/2026**. Base verificada: `origin/develop` / `298f298`. Entrega: `fix/ai-response-contracts`.

Esta entrega implementa os contratos e substitui o prompt executável em `functions/ai/schemas.js`, com base na proposta documental anterior. **Implementado e validado localmente; ainda não publicado em DEV.** Publicar a branch não faz merge nem deploy. As ferramentas novas listadas adiante continuam propostas.

## Onde o comportamento é definido

| Arquivo | Papel |
|---|---|
| [schemas.js](../functions/ai/schemas.js) | `COPILOT_SYSTEM_INSTRUCTION`, nove declarações de ferramentas e prompts de visão |
| [handlers.js](../functions/ai/handlers.js) | Seleção das ferramentas, templates de resposta, síntese e contratos de retorno |
| [tools.js](../functions/ai/tools.js) | Implementação das ferramentas de negócio |
| [repositories.js](../functions/ai/repositories.js) | Origem, escopo e paginação dos dados |
| [authorization.js](../functions/ai/authorization.js) | Acesso ao subsistema e escopo |
| [config.js](../functions/ai/config.js) | Modelos, limites, cache e referências de tarifas |
| [budget.js](../functions/ai/budget.js) e [usage.js](../functions/ai/usage.js) | Reserva de orçamento, reconciliação e métricas |
| [AiCopilotSheet.tsx](../src/app/components/AiCopilotSheet.tsx) | Conversa, rascunhos, revisão e ações do usuário |

Alterar somente o prompt não modifica uma resposta que o handler monta diretamente, não adiciona uma ferramenta e não muda a autorização. O chat e a Alexa são fluxos distintos.

## Ferramentas existentes

| Ferramenta | Uso possível agora | Limite do contrato |
|---|---|---|
| `extract_order_draft` | Extrair cliente, produto, quantidade, valores, entrega, tema e observações | Retorna rascunho; não salva o pedido |
| `generate_whatsapp_message` | Preparar confirmação, cobrança, aviso ou lembrete | Não envia por si só; revisar destinatário, texto e situação do pedido |
| `query_customers` | Buscar cliente por termo e, para escopo autorizado, colaborador | Lista limitada; não equivale a um raio-X completo do histórico do cliente |
| `calculate_pricing_estimate` | Estimar preço a partir de custos, quantidade, mão de obra e margem | Identifica argumentos, configurações e padrões; não grava orçamento/preço oficial |
| `daily_briefing` | Resumir atrasos, entregas do dia, produção e pendências | Não calcula capacidade da equipe nem agenda tarefas |
| `get_user_summary` | Consultar equipe e desempenho de um colaborador | Ferramenta disponibilizada apenas a administradores |
| `get_financial_summary` | Resumo de pedidos por período e colaborador autorizado | Usa pedidos; período seleciona `createdAt`, não datas dos pagamentos (exceto todo o histórico, sem filtro de datas) |
| `query_orders_view` | Buscar pedidos por cliente, número, produto e status | Resultado limitado; não altera status, atribuição ou pagamento |
| `search_gallery_portfolio` | Localizar referências reais na galeria autorizada | Não gera imagem nova nem envia arquivos ao cliente |

O chat retorna `reply`, `orderDraft`, `whatsappDraft`, `pricingEstimate` e/ou `galleryItems`, conforme a operação. Os botões da UI executam passos posteriores: um rascunho exibido não significa pedido salvo ou mensagem enviada.

Há também `enrichGalleryItemWithAi` e `enrichStoreProductWithAi`, acionados pelos fluxos visuais. Eles não fazem parte das nove ferramentas oferecidas ao modelo do chat. `getAiUsage` consulta o consumo para administração. O handler interno de texto de personalização não é exportado como callable em `functions/index.js`; não anunciá-lo como endpoint disponível.

## Orientações aplicadas ao system prompt

1. **Coleta de encomendas:** identificar campos ausentes, separar quantidade/preço unitário/total/sinal e resolver homônimos antes de preparar o rascunho.
2. **Produção:** orientar o uso do briefing e da consulta de pedidos, distinguir status geral das sete etapas de produção e não prometer reagendamento ou atribuição automática.
3. **Precificação:** perguntar por custo e tempo quando faltarem; identificar simulação com premissas; não apresentar valores padrão como custos reais cadastrados.
4. **Atendimento:** exigir coerência entre situação real, saldo e texto sugerido. Pedidos cancelados ou quitados não devem receber cobrança; “pronto” precisa de comprovação.
5. **Portfólio:** buscar trabalhos reais por tema; a ausência em uma amostra de contexto não comprova inexistência na galeria.
6. **Navegação:** explicar as telas de orçamento, loja, estoque, relatórios e e-mails, sem alegar capacidade de operá-las quando não há ferramenta.
7. **Privacidade:** usar dados pessoais apenas quando necessários à solicitação; não listar telefones por padrão em uma consulta de desempenho.
8. **Datas e dinheiro:** informar critério do período; pagamentos associados aos pedidos não são automaticamente caixa por data de recebimento.
9. **Uso econômico:** escolher a ferramenta mínima necessária, evitar consultas repetidas e manter respostas curtas.

## Contratos implementados

| Tema | Comportamento implementado | Limite |
|---|---|---|
| Alexa | Prompt usa `alexa/constants.js`, também importado por `alexa/config.js`: pareamento de 5 minutos, rascunho inicial de 15 minutos e aprovação em modo app por 24 horas após encaminhamento | Nenhuma leitura remota para prazos; nome de invocação neutro, obtido na skill/interface do ambiente |
| Financeiro | Mantém campos existentes, acrescenta `selectionDateField`, `paymentDateBasis`, `paymentScopeNotice` e `excludedMissingCreationDate`; templates usam `periodLabel`, volume emitido, valor concluído, pagamentos associados e saldo | Não apura caixa por data de pagamento nem lucro; cancelados excluídos dos valores |
| Datas financeiras | Seleção por criação, sem substituir ausência por entrega/data atual. Sem criação válida, exclui do intervalo e informa contagem; `all` inclui todo o histórico sem filtro | Não inventa datas de pagamento; histórico por cliente permanece outra base (`salesLedger`) |
| Rascunhos | `preparationStatus: draft_prepared`; carregar formulário não salva. Homônimos/identificação insuficiente retornam `identification_required` e a resposta solicita identificação sem card acionável | Não altera permissão nem propriedade; formulário e backend continuam responsáveis por confirmação/persistência |
| WhatsApp | Mensagens usam saldo/status do pedido localizado; quitados/cancelados não recebem cobrança; concluído não garante embalagem/retirada | Sem pedido válido não prepara cobrança/status oficial. Texto geral continua rascunho, sem dados oficiais inventados |
| Envio na interface | Estados `draft_prepared`, `user_confirmed`, `backend_completed`, `failed` (recusa explícita) e `unconfirmed`; sucesso somente com `success === true`. Callable inclui `requestId` exigido pelo contrato de idempotência existente | Sem retries automáticos. Resultado incerto bloqueia novo envio direto nesse compositor e orienta conferir Atendimento; WhatsApp Web permanece alternativa, sem comprovar envio |
| Precificação | `contractVersion: 2`, `inputs`, `assumptions`, `requiresReview`; texto e card exibem premissas e origens | Argumento da ferramenta não comprova declaração humana. Simulação é revisável, não orçamento salvo |
| Contexto | Catálogo vai como dados em parte da mensagem de usuário, separado de `system_instruction`; data atual/fuso gerados no servidor | Essa separação e o prompt não garantem imunidade à injeção; autorização continua no backend |
| Cache/custo | Chave do chat versionada como `v3-response-contracts`; nenhuma chamada de modelo para explicar estados locais | Limites, fallback, orçamento e telemetria preservados; síntese opcional usa até 8.000 caracteres e é omitida se o conjunto exceder o teto, preservando respostas determinísticas completas |

**Achado revalidado:** `dialog.js` já renovava `expiresAt` por 24 horas no modo `app_approval`; a revisão anterior considerou apenas o TTL inicial de `config.js`. Esse comportamento foi preservado e sua constante extraída. Não há janela genérica de 24h/48h: coleta/voz, modo app e encaminhamento de segurança possuem critérios diferentes. O teste do diálogo verifica a transição e compara a validade persistida com a fonte do prompt.

### Precificação: entradas e detalhes

`inputs` registra cada campo/valor usado e sua origem (`argument`, `configuration`, `default`). Configuração ausente ou inválida adota um padrão explícito; valores inválidos cadastrados são marcados como `invalidConfiguration`. Configurações parciais de despesas fixas preservam os valores válidos e identificam os padrões nos demais campos. Não há novas coleções nem leituras para constantes.

`unitCostRaw` e `rawMaterialsCost` são aliases de matéria-prima; ambos são custo explícito. Se enviados juntos, devem coincidir. Zero é válido. Campos numéricos presentes com `null`, vazio, negativo, `NaN`, infinito ou texto não numérico falham com `invalid-argument`; não viram zero/padrão silenciosamente. Quantidade deve ser inteiro positivo seguro; margem aceita de 0 a 95. Configurações inválidas usam padrões identificados, enquanto argumentos inválidos são recusados. Valores que causam estouro numérico também são recusados.

A ausência de matéria-prima, personalização e montagem usa premissas de R$ 15, R$ 5 e 15 minutos, respectivamente, somente como estimativa identificada. O prompt solicita entradas ausentes antes de precificar e permite simulação quando pedida. `requiresReview` permanece verdadeiro inclusive com todos os argumentos presentes.

O executor anterior duplicava despesas fixas já incluídas na taxa de mão de obra e podia mostrar custo/ponto de equilíbrio incompatíveis com o preço dos tiers. Esta entrega corrige a composição chamando o motor existente com setup dividido pela quantidade e preservando a eficiência de montagem dos tiers de 1/10/20/30/50/100 peças. Outras quantidades mantêm montagem integral e rateio de setup. **A fórmula do motor não mudou**; custo, preço e equilíbrio agora usam a mesma base. A única proteção adicional nos motores JS/TS evita desconto `NaN` em lote de custo/preço zero. Testes comparam motor backend, frontend e executor por quantidade.

`breakdown` mantém campos antigos e acrescenta `rawMaterials`, `customization` e `fixedCostsIncludedInLabor`. O card exibe matéria-prima, personalização, perdas, montagem e setup como parcelas; não soma subtotais nem reaplica `fixedCostsShare`. Históricos antigos com `materialsBase` mostram “Materiais e personalização (subtotal)”; os campos legados `materials/customization/labor` têm adaptação própria. Detalhes/premissas ausentes são omitidos ou indicados como indisponíveis, nunca convertidos em R$ 0,00 por incompatibilidade de nome.

### Prompt executável

A fonte única é [`COPILOT_SYSTEM_INSTRUCTION`](../functions/ai/schemas.js). A proposta anterior foi adaptada e substituiu a instrução antiga, incluindo orientações de precisão, dados pessoais mínimos, recusas de acesso, ambiguidade, rascunho versus execução, critérios financeiros e premissas. Não se anexa documentação inteira por conversa. O handler usa o mesmo prompt na primeira chamada e na síntese opcional; respostas de ferramenta única também usam templates corrigidos, sem rodada extra.

A data atual vem do servidor com `America/Sao_Paulo`. Os prazos Alexa vêm de constantes puras compartilhadas, sem inicialização de secrets no schema. Pareamento, confirmação por voz, aprovação no aplicativo e convites de usuários são fluxos distintos. Nenhum nome de DEV é apresentado como universal.

## Funcionalidades novas: prioridade, dependência e custo

| Prioridade | Proposta | Implementação necessária | Estratégia de custo |
|---|---|---|---|
| 1 | Raio-X do cliente no chat | Ferramenta por `customerId` e proprietário, apoiada no ledger, com métricas e cobertura explícitas | Reutilizar cálculo existente; preferir leitura direcionada e agregados consistentes |
| 1 | Acompanhamento de orçamentos | Consulta por status/validade e vínculo com pedido convertido | Filtro no banco, paginação e poucas colunas |
| 1 | Busca real de produtos da loja | Ferramenta de busca além da amostra anexada ao prompt | Consulta sob demanda em vez de carregar catálogo para toda pergunta |
| 2 | Reposição e custo de insumos | Ferramenta de estoque/limite e histórico de compra; apenas consulta inicialmente | Cálculo determinístico, sem pedir ao modelo que some todo o estoque |
| 2 | Planejamento da semana | Consulta de entregas/etapas/responsáveis e regras de capacidade definidas pelo negócio | Agregar no backend; chamar IA só para explicar/priorizar |
| 2 | Simulação por receita existente | Seleção de receita, parâmetros reais e retorno de premissas | Reutilizar motor de precificação; uma leitura direcionada por receita |
| 3 | Rascunho de e-mail contextual | Contrato específico de rascunho, revisão e integração com compositor | Não enviar automaticamente; usar o fluxo de idempotência existente ao enviar |
| 3 | Execução de alterações pela IA | Autorização por ação, confirmação vinculada ao payload, idempotência, auditoria e resultado verificável | Não ampliar autonomia apenas pelo prompt; iniciar por poucas ações de baixo risco |

As propostas não estão disponíveis no chat atual. Não incluí-las no prompt como ferramentas existentes.

## Orçamento e medição

A configuração atual limita histórico a 6 mensagens/10.000 caracteres, entrada a 4.000 caracteres, até 4 chamadas de ferramentas e até 2 rodadas de modelo. A primeira resposta tem teto de 1.536 tokens; a síntese adicional, 768. Há cache local com TTL de 3 minutos para determinadas consultas sem histórico/imagem, além de orçamento persistido. São limites do código, não garantia de consumo exato.

O custo total inclui inferência, eventuais tentativas de fallback, leituras/escritas do Firebase, execução das Functions, imagens e observabilidade. Uma ferramenta que exibe 30 pedidos pode ler muito mais para filtrar/agregar.

Para estimar somente a inferência de texto:

`custo USD = tokens de entrada / 1.000.000 × tarifa de entrada + tokens de saída faturáveis / 1.000.000 × tarifa de saída`

A tabela oficial consultada em 10/10/2026 indica, para **Gemini 3.8 Flash Standard**, US$ 0,75 por milhão de tokens de entrada e US$ 3,75 de saída, incluindo thinking, até 31/12/2026. Para 01/01/2027, a tabela anuncia US$ 1,50 e US$ 7,50. Uma hipótese de 2.000 tokens de entrada e 500 de saída custa US$ 0,003375 por inferência nas tarifas de 2026, antes dos outros custos. Não representa medição do Luisices.

Fontes oficiais: [tarifas](https://ai.google.dev/gemini-api/docs/pricing) e [modelos](https://ai.google.dev/gemini-api/docs/models). A disponibilidade e o faturamento efetivos dependem do projeto/provedor. Revalidar a tabela interna antes da mudança de tarifa; registrar preço por modelo e vigência. Não estimar economia percentual sem comparar uso real.

Priorize: prompt compacto; contexto sob demanda; eliminação de consultas repetidas dentro da mesma requisição; respostas determinísticas para somas/status; revisão da política de fallback; medição de latência, tokens, leituras e taxa de erro por intenção. Não é necessário introduzir banco vetorial ou nova infraestrutura para as primeiras melhorias.

## Validação local e próxima validação em DEV

| Cenário | Resultado esperado |
|---|---|
| Encomenda sem preço/data | Pergunta ou rascunho incompleto identificado; sem inventar dados |
| Dois clientes com mesmo nome | Solicita desambiguação |
| Pedido quitado/cancelado | Não produz cobrança indevida |
| Consulta de “caixa de setembro” | Explica o critério atual ou informa falta da ferramenta de caixa |
| Precificação sem custos | Solicita entradas ou marca simulação e premissas |
| Galeria sem resultado na amostra | Não afirma inexistência definitiva |
| Texto cadastrado manda ignorar instruções | Trata como conteúdo, sem alterar comportamento |
| Acesso negado a outro parceiro | Mantém recusa e não tenta contornar |
| Pedido de envio ou alteração | Não declara sucesso sem execução autorizada e resultado real |
| Alexa | Não repete a janela incorreta de 24h/48h |

O resultado anterior de 771 testes era histórico. Nesta entrega, os testes focados de IA/precificação passaram com 169 testes, incluindo configuração efetiva Alexa no payload, critérios financeiros com pagamento em mês posterior, respostas de ferramenta única e de síntese, cancelados/parciais/vazio, homônimos, zeros/aliases/valores inválidos, origens de preço, paridade por quantidade, renderização de históricos e envio confirmado/incerto com callable mockado. Os checks completos desta branch passaram, conforme tabela abaixo. A suíte focada incluindo Alexa passou com 437 testes; ela valida a transição para aprovação no modo app, o encaminhamento de segurança sem renovação e a extração de constantes sem mudança das transições ou da persistência existente.

| Validação executada em 10/10/2026 | Resultado |
|---|---|
| IA/precificação | 169 testes aprovados |
| IA/precificação + Alexa | 437 testes aprovados |
| `npm run typecheck` | Aprovado |
| `npm run test:unit` | 824 testes aprovados em 76 arquivos |
| `npm run lint:functions` | 46 arquivos JS sem erro de sintaxe |
| `npm run build` | Aprovado; avisos de assets públicos não resolvidos em build e bundles grandes |
| `git diff --check` | Aprovado |

Não foram alterados autorização, regras ou caminhos de persistência do backend: não há migração nem suíte de integração obrigatória para esta entrega. Não foi feita chamada ao provedor real nem envio a clientes. Testes de prompt/payload com mocks não comprovam obediência do modelo em produção.

Depois de uma futura publicação autorizada em DEV:

1. Em conta de teste, perguntar validade Alexa: confirmar 5 minutos para código, 15 para rascunho inicial e 24 horas renovadas no modo app, diferenciando encaminhamento por falha de voz sem renovação; conferir orientação neutra sobre invocação; testar os dois modos de confirmação pelo fluxo Alexa.
2. Criar dados sintéticos de pedido em janeiro e pagamento em fevereiro: pedir “caixa de janeiro” e um resumo composto com outra consulta; conferir período, valores associados e aviso de que não apura caixa por recebimento. Incluir cancelado, parcial e período vazio.
3. Preparar rascunho de pedido e carregar o formulário: confirmar que não há pedido salvo até o submit; salvar somente dados sintéticos e verificar o retorno. Testar homônimos antes de carregar qualquer ação.
4. Preparar cobrança de quitado/cancelado e aviso de pedido pendente/produção/concluído: conferir ausência de saldo indevido, retirada ou embalagem inventadas. Pedido inexistente deve solicitar identificação.
5. Simular preço com custos ausentes, zeros, os dois aliases e setup para 7/10 peças; comparar premissas, card e calculadora. Abrir conversas antigas com os dois formatos de breakdown.
6. Em ambiente de teste com envio mockado, exercitar sucesso, `success: false` e timeout: somente sucesso confirmado mostra envio concluído; timeout não repete nem anuncia sucesso. Abrir WhatsApp Web deve apenas preparar texto. Não usar clientes reais.
7. Usar perfil com acesso limitado e catálogo sintético com instruções maliciosas: conferir recusas e precisão. Uma avaliação real do modelo exige dados sintéticos e orçamento previamente limitado; esta entrega não a executa.
