# Avaliação da implementação de IA

Data: 26/09/2026. Escopo: código local, integrações do frontend, Cloud Functions e documentação oficial do Gemini. Nenhuma chamada de geração paga ou alteração de produção foi executada.

## Parecer

A arquitetura é adequada como ponto de partida: frontend → Firebase Callable autenticada → Gemini → ferramentas de negócio → resposta/cards para revisão. Entretanto, há erros concretos de assertividade, isolamento de contexto e cache. Não considero os resultados financeiros, cobranças e estimativas suficientemente confiáveis para uso sem conferência.

Velocidade e custo ainda não têm medição suficiente para comprovar eficiência em produção. A prioridade é corrigir os dados e a execução das ferramentas, reduzir trabalho desnecessário e só então comparar modelos.

## Estrutura encontrada

- `src/app/components/AiCopilotSheet.tsx`: conversa, histórico local, imagem e cards de ações.
- `src/services/firebaseAiAgentService.ts`: transporte para as funções, com timeout de 120 segundos no chat.
- `functions/index.js:1309`: copiloto, roteamento por function calling e nove ferramentas de negócio.
- `functions/index.js:2782`: painel de consumo e sondagem dos modelos.
- `functions/index.js:3092` e `3343`: enriquecimento visual da galeria e de produtos.
- `src/app/pages/StoreCustomization.tsx:1425`: geração institucional usando o endpoint genérico do chat.
- `server.ts` e `src/App.tsx`: outro fluxo de Studio. O entrypoint efetivo é `src/main.tsx` → `src/app/App.tsx`; os scripts e o hosting examinados não iniciam esse servidor nem encaminham `/api/studio`. Esse código não demonstra que o Studio esteja integrado ao aplicativo publicado. O typecheck também não inclui `server.ts`.

## O que está bem encaminhado

- Chave Gemini no Secret Manager, acessada pelo backend.
- Autenticação, checagem de perfil ativo e permissões de IA.
- Consultas específicas de pedidos, clientes e galeria com escopo por usuário.
- Cálculos e formatação das consultas executados em código, evitando uma segunda geração em consultas simples.
- Revisão humana dos rascunhos de pedidos e mensagens no frontend.
- Histórico enviado ao modelo limitado a seis mensagens; saída do chat limitada a 1.536 tokens.
- Redimensionamento de imagens do chat para até 800 px e WebP.
- Registro de tokens retornados pelo provedor, embora incompleto para gestão financeira.

## Achados prioritários

### 1. Alta — período financeiro ignorado

Em `functions/index.js:1993`, `executeFinancialSummary` espera um objeto com `period` e `userIdentifier`. Em `2672`, recebe somente `args.period || 'month'`. A leitura de `args.period` retorna undefined e a função usa o mês atual; o filtro por colaborador também se perde.

Reproduzi executando a função extraída do arquivo com fonte de pedidos simulada: `today`, `week`, `year` e `all` viraram `month`. Passando `{ period }`, o período foi preservado.

Correção: passar o objeto validado completo e testar período, colaborador e limites de data no fuso do negócio.

### 2. Alta — amostras apresentadas como resultados completos

`fetchScopedOrders` (`1329`) limita a consulta a 200 documentos por consulta antes de ordenar e filtrar em memória. Sem `orderBy` no Firestore, isso não garante os 200 mais recentes. Busca, briefing e totais financeiros podem omitir pedidos. A consulta já exclui `deletedAt != null`, apesar de existir uma opção posterior de busca por excluídos.

Clientes e galeria também têm limites aplicados antes da busca textual. Erros em algumas consultas são convertidos em listas vazias, podendo comunicar “não encontrado” quando houve falha.

Correção: filtros e ordenação no banco, paginação para buscas e agregações completas para totais. Diferenciar resultado vazio, parcial e indisponível. Reusar a definição de métricas do módulo oficial de relatórios.

### 3. Alta — contexto da galeria sem escopo e coleção de insumos divergente

`getDynamicCatalogKnowledge` (`1256`) lê galeria global com Admin SDK, sem usuário ou filtro de exclusão, e compartilha o resumo em cache global. Os títulos, categorias e papéis de artes de terceiros entram no prompt de qualquer usuário autorizado ao chat, mesmo quando a ferramenta de busca da galeria restringe o acesso. Há risco de exposição desses metadados nas respostas.

Além disso, o helper consulta `pricingSupplies`, enquanto `firebasePricingService.ts:34` grava os insumos em `supplies`. Os custos reais cadastrados nesse módulo não são carregados por essa consulta.

Correção: carregar apenas dados autorizados e necessários à tarefa; cache por escopo de acesso; corrigir o nome da coleção. O cache de leitura do Firestore não reduz os tokens do resumo, que é reenviado ao Gemini em cada geração.

### 4. Alta — cobrança sem conferência do pedido

Em `2558`, a ferramenta de WhatsApp aceita texto, valor e número de pedido gerados pelo modelo. Quando falta telefone, busca pelo nome, mas não consulta saldo, status ou vencimento para conferir a cobrança. `resolveCustomerPhone` aceita a primeira correspondência parcial, o que é ambíguo para homônimos.

Correção: resolver cliente/pedido por identificador, exigir desambiguação quando necessário e montar a cobrança com o saldo real. Manter revisão humana. Para mensagens padronizadas, templates em código podem dispensar geração.

### 5. Alta — estimativa de preço desconectada da calculadora

`executePricingEstimate` (`2355`) usa valores fixos: R$ 0,45/min, perda de 15%, custos padrão de R$ 15 + R$ 5 e margem padrão de 45%. Não lê `pricingSettings` nem reproduz a calculadora atual com custos fixos, taxas e aproveitamento de material.

Reprodução com a função extraída: custos e minutos explicitamente zero resultam em custo unitário de R$ 29,75 por causa de `Number(...) || padrão`. Matéria-prima de -100, personalização de 1 e tempo de 1 geram preço negativo de R$ -206,18.

Correção: compartilhar a regra de cálculo, validar números finitos e intervalos e explicitar dados ausentes. A IA deve extrair parâmetros; o backend deve obter custos e calcular.

### 6. Alta — cache perde ações e mistura contextos

Em `1615–1623`, a chave contém somente usuário e mensagem. A escrita em `2754` inclui respostas com histórico e imagens, mas a leitura sem histórico/imagem pode reutilizá-las. Exemplo: “quanto custa?” associado a uma foto pode reaparecer numa conversa nova com outra intenção.

A leitura devolve somente `reply` e `orderDraft`, descartando `whatsappDraft`, `pricingEstimate` e `galleryItems`. O usuário pode receber texto anunciando um card que não aparece. O Map não remove entradas expiradas nem tem tamanho máximo. Dados operacionais podem ficar desatualizados por três minutos.

Correção: mesma regra de elegibilidade na escrita e leitura, retorno completo, expiração com remoção e limite de tamanho. Evitar cache de resposta para saldos/status mutáveis; usar contexto e versão dos dados quando aplicável. A limpeza atual afeta somente a instância que atende a chamada.

### 7. Média — fallback amplia a latência sem aproveitar o modelo que funcionou

Em `2443–2506`, há até sete modelos sequenciais, com timeout de 12 segundos por tentativa. `preferredWorkingModel` é atualizado, mas não participa da ordenação da próxima chamada. A visão repete a estratégia com 15 segundos por tentativa. Só os temporizadores podem acumular aproximadamente 84 segundos no chat ou 105 na visão, antes dos demais trabalhos. Não são tempos medidos de produção.

O timer é removido antes da leitura do corpo HTTP, portanto não cobre toda a operação. Erros de credencial/payload também levam a novas tentativas sem correção da causa.

Correção: configuração central, modelo adequado à tarefa, no máximo uma alternativa controlada, prazo total de execução, classificação de erros e suspensão temporária de modelos com falhas recorrentes. Validar disponibilidade no projeto; a documentação oficial confirma a existência de Gemini 3.8 Flash, mas isso não comprova acesso pela chave implantada.

### 8. Média — execução parcial de ferramentas e JSON frágil

Em `2540`, `parts.find` executa somente a primeira chamada de ferramenta. Uma solicitação de resumo mais cobrança pode ficar incompleta; resultados não são devolvidos ao modelo para permitir dependências entre ferramentas. Consultas simples com resposta determinística continuam sendo uma boa opção de custo.

Visão usa instrução textual e `JSON.parse`, sem schema de saída nem limite explícito de tokens. Um JSON válido ainda pode ter tipos e conteúdos incorretos. Geração institucional também passa pelo chat com ferramentas e limite genérico de 1.536 tokens, inadequado como contrato confiável de um formulário extenso.

Correção: validação de argumentos e respostas no servidor; saída estruturada para visão e conteúdo institucional; tratamento de bloqueio/truncamento; fluxo limitado para múltiplas ferramentas apenas quando a tarefa exigir. Referências: [function calling](https://ai.google.dev/gemini-api/docs/function-calling) e [saídas estruturadas](https://ai.google.dev/gemini-api/docs/structured-output).

### 9. Média — painel não mede cota real nem custo

`getAiUsage` fixa 1.500 requisições/dia, 15/minuto e 45.000/mês. Faz GET de metadados de modelos, o que não comprova disponibilidade de geração nem saldo de cota. Usa meia-noite UTC para reset; a documentação informa reset diário no horário do Pacífico e limites por projeto, modelo e tier. [Limites oficiais](https://ai.google.dev/gemini-api/docs/rate-limits).

O modelo ativo é uma variável em memória: funções/instâncias diferentes não compartilham esse estado. Em erro, o frontend (`AiSettingsSection.tsx:140`) apresenta sucesso e uso zero. As gravações de logs não são aguardadas, falhas de parsing da visão podem consumir tokens sem registro e tokens de raciocínio não são separados para calcular custo.

O chat administrativo chama esse painel após cada resposta. Cada consulta relê logs do mês/dia/minuto, com sobreposição, e sonda sete modelos. O custo de leitura cresce com o histórico mensal.

Correção: agregados incrementais por dia/modelo/ação, atualização menos frequente, estado “indisponível” em falhas, registro confiável de cada tentativa e cálculo por tarifa vigente. Separar consumo observado de limite confirmado no provedor.

### 10. Média — proteção de gasto e imagens incompleta

Os limitadores (`24`, `30`) são locais à instância. Não há orçamento global por usuário/projeto, teto diário de tokens ou limite de tamanho de mensagem/histórico em caracteres. Limitar a quantidade de mensagens não limita seu tamanho.

A visão aceita downloads sem timeout/teto de bytes; a lojinha aceita URL enviada pelo cliente (`3378`). Restringir origens/caminhos autorizados, redirecionamentos, MIME e tamanho antes de processar. O chat ignora silenciosamente imagem acima do limite, podendo responder sem tê-la visto.

Correção: limites distribuídos e orçamento por ação; rejeição explícita de entradas inválidas; imagens dimensionadas conforme a tarefa. Texto pequeno exige resolução maior que simples classificação visual.

## Estratégia de velocidade e custo

1. Executar diretamente consultas e templates quando a intenção vier de um botão/comando estruturado.
2. Testar Flash-Lite para extração, classificação, tags e redação curta; manter Flash para tarefas que demonstrem precisar dele.
3. Enviar apenas contexto autorizado e relevante. Evitar catálogo e nove ferramentas em toda mensagem.
4. Centralizar cliente Gemini, schemas, limites, timeout e telemetria hoje repetidos em três fluxos.
5. Medir antes de alterar região, memória ou manter instâncias aquecidas: essas escolhas trocam custo fixo por latência e dependem da localização do banco e dos usuários.

### Exemplo de custo, não uma previsão da fatura

Hipótese: 10.000 chamadas, cada uma com 2.000 tokens de entrada e 500 de saída faturável, incluindo eventual raciocínio; sem imagens adicionais, cache, retries, Firebase ou impostos.

| Modelo | Entrada / milhão | Saída / milhão | Total da hipótese |
| --- | ---: | ---: | ---: |
| Gemini 3.8 Flash | US$ 0,75 | US$ 3,75 | US$ 33,75 |
| Gemini 3.1 Flash-Lite | US$ 0,25 | US$ 1,50 | US$ 12,50 |

Economia teórica de aproximadamente 63% ao usar Lite nesse volume, condicionada à mesma qualidade e quantidade de chamadas. Tarifa Standard consultada em 26/09/2026; o preço mostrado para 3.8 Flash vale até 31/12/2026. [Tabela oficial](https://ai.google.dev/gemini-api/docs/pricing).

## Validação realizada e limites

- `npm run typecheck`: passou.
- `npm run test:unit`: 38 testes passaram em seis arquivos.
- `node --check functions/index.js`: passou.
- Execução isolada das funções reais extraídas do arquivo confirmou os defeitos de período e preços; dependência de pedidos simulada, sem acesso ao banco.
- Não encontrei testes específicos exercitando os handlers de IA, fallback, schemas ou qualidade das respostas; os testes gerais não comprovam esses fluxos.
- Sem geração real, teste E2E do chat, leitura de logs de produção ou medição de fatura/latência. Não foi possível afirmar disponibilidade, qualidade ou custo real do serviço implantado.
- Alterações locais preexistentes em precificação foram preservadas. Esta entrega adiciona somente o relatório.

## Ordem recomendadacodex resume 01a0df09-8115-71e3-aa10-60964e67804a

**Primeiro:** corrigir período, escopo do contexto, coleção de insumos, cache, cobrança e precificação; garantir totais completos.

**Depois:** controlar tentativas, validar schemas, reduzir prompt, agregar métricas e aplicar orçamento de uso.

**Para comprovar o ganho:** comparar modelos com 30–50 casos representativos, incluindo homônimos, múltiplas intenções, imagens, dados ausentes, erro do provedor e acesso negado. Medir acerto da ferramenta, campos corretos, consistência dos valores, latência mediana/p95, tokens, leituras do banco e custo por tarefa concluída. Exigir zero exposição entre usuários e correspondência exata dos valores determinísticos antes da liberação.
