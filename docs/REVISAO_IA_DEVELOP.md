# Revisão da atualização de IA na develop

Data: 26/09/2026. Base: `e1b9444`, mais alterações locais em Functions e arquivos novos de IA/testes. A implementação revisada ainda não está commitada. Revisão de código e reproduções locais com dependências simuladas; nenhuma geração paga, deploy ou envio de mensagens.

## Parecer

**Não aprovar para publicação neste estado.** A extração em módulos melhora a organização e há avanços no limite de tentativas, cache limitado e repasse do período financeiro. Porém, foram introduzidas regressões funcionais e persistem achados do plano. O relatório `RESULTADO_IMPLEMENTACAO_IA.md` anuncia conclusão integral e compatibilidade que o código atual não sustenta.

## Bloqueadores e achados

### R01 — P1: chat falha no caminho real com banco conectado

`functions/ai/handlers.js:270` e `289` usam `MODEL_CONFIG`, mas o import na linha 7 contém somente `INPUT_LIMITS` e `TIMEOUTS`. Com `db` presente, uma geração bem-sucedida termina em `ReferenceError: MODEL_CONFIG is not defined`. O catch volta a referenciar a mesma variável e mascara erros anteriores. Chamadas satisfeitas pelo cache podem escapar desse caminho, tornando o comportamento intermitente.

Reprodução local com o handler real, provedor simulado e `db` presente confirmou o erro. O teste de chat existente não passa `db`, por isso não alcança o defeito. Corrigir import e testar o handler com dependências equivalentes à fábrica de produção, incluindo sucesso e erro de telemetria.

### R02 — P1: visão da galeria deixou de enviar a imagem

`handlers.js:375–385` monta `contents.parts` apenas com título/descrição. A imagem é exigida no documento, mas não é baixada nem incluída como `inlineData`/`fileData`. O resultado é salvo como análise visual mesmo sem o modelo ter visto a foto. Reproduzido inspecionando o payload enviado ao cliente simulado.

Restaurar leitura autorizada da imagem privada pelo Storage e testar presença/bytes/MIME no payload. Não gravar uma descrição substituta como sucesso quando o JSON é inválido.

### R03 — P1: contrato dos rascunhos foi quebrado

`tools.js:398–404` retorna WhatsApp com `text` e `messageType`; `AiCopilotSheet.tsx:97` e `103` consome `messageText`, e o contrato existente utiliza `type`. Resultado: compositor sem o texto preparado. `tools.js:492–502` retorna `productSummary`; `NewOrderDialog.tsx:146` espera `productName`, deixando de preencher o produto.

Reproduções confirmaram os campos antigos ausentes. Manter o contrato público ou adaptar conjuntamente serviços, tipos e consumidores, com testes de integração dos cards e formulários.

### R04 — P1: datas e nome do produto não são normalizados para os dados reais

`repositories.js:14` não lê `productName`, campo gravado por `firebaseOrderService`. A descrição vira `Personalizado Luisices`. Em `repositories.js:22`, `createdAt` preserva o objeto Firestore Timestamp; `tools.js:134` e a ordenação convertem com `new Date`, produzindo data inválida.

Reprodução com `Timestamp.fromDate(...)` real confirmou `Invalid Date` e perda do nome do produto. Isso pode excluir pedidos legítimos dos relatórios por período. Restaurar normalização de Timestamp/string/Date e mapear o schema real do pedido; testar o repositório com documentos iguais aos do serviço, não apenas objetos já normalizados.

### R05 — P1: contexto de insumos ignora escopo de acesso

`repositories.js:143–158` recebe `scope`, mas lê os primeiros 50 insumos globalmente e descarta o proprietário no mapeamento. `getCatalogKnowledge` injeta esses custos no prompt de qualquer usuário com IA. As regras de `supplies` restringem leitura por proprietário/admin/permissão de precificação, mas o Admin SDK não aplica essas regras.

Reprodução: chamada com escopo A retornou insumo privado de B. Aplicar o escopo antes de montar contexto e verificar permissão do módulo; testar isolamento A/B e funcionário sem acesso à precificação.

### R06 — P1: cache ainda mistura contexto e pode reutilizar dados privilegiados

`handlers.js:61–69` monta chave só com UID, ação, texto e versão. A escrita em `257` permite histórico, imagem, respostas financeiras e galeria; a leitura em `70` ocorre sem histórico/imagem. Não inclui permissões/modelo e não marca dados mutáveis como `noCache`.

Reprodução: a mesma pergunta com histórico e depois sem histórico gerou somente uma chamada ao modelo. Um admin rebaixado a usuário com IA ainda autorizada também pode receber a resposta privilegiada anterior para a mesma chave. Corrigir elegibilidade simétrica, escopo/versões e exclusão de dados mutáveis. A função `coalesce` existe, mas o handler não a utiliza.

### R07 — P1: consultas continuam truncadas; alguns limites pioraram

`repositories.js:49–56`: 200 pedidos admin, 100 por vínculo para outros usuários, sem paginação ou ordenação no banco. Clientes: 150 globais (`85`), galeria: 50 globais (`195`), com filtro de proprietário/busca só depois. Um usuário pode não encontrar nenhum registro próprio se os primeiros documentos globais forem de outros usuários.

`hasMore` e `totalFound` em `tools.js:241` descrevem apenas a amostra já carregada. Erros das três consultas de pedidos de não-admin são convertidos em listas vazias. Corrigir busca no escopo e paginação/agregação real; testar registro fora da primeira página e indisponibilidade parcial. Não apresentar amostras como totais completos.

### R08 — P1: cálculo de lote e configurações reais continuam incorretos

`tools.js:258–307` usa custos padrão R$ 15/R$ 5/15 minutos e `DEFAULT_PRICING_SETTINGS`, sem consultar a configuração do ateliê. Multiplica preço da unidade por quantidade, mesmo com setup que deveria ser diluído no lote. A fórmula foi copiada em `functions/ai/pricing/pricingCalculator.js`; frontend continua com outra fonte editável.

Reprodução: quantidade 10, custos/tempo unitário zero e setup 30 minutos retornam total de R$ 310,40, enquanto `batchTiers[quantity=10].totalPrice` retorna R$ 31,04. Usar cálculo para a quantidade efetiva, configurações reais e fonte única empacotada. Testar a ferramenta pública além da paridade entre calculadoras isoladas.

### R09 — P1: cobrança ainda aceita texto e destinatário sem vínculo comprovado

`tools.js:335` aceita `recipientPhone` fornecido pelo modelo; não o substitui pelo telefone real quando já preenchido. `customText` (`361`, `381`) impede geração do template baseado no saldo, permitindo valor arbitrário mesmo com pedido encontrado. Homônimos exatos ainda usam `.find`, sem desambiguação. Não há bloqueio específico de cobrança de pedido cancelado nem revalidação antes do envio no endpoint existente.

Buscar pedido/cliente inequívocos, derivar destinatário/saldo da fonte autorizada e validar novamente antes da confirmação. Manter envio humano e separar texto livre de cobrança vinculada.

### R10 — P1: análises visuais escapam de orçamento e telemetria

Os handlers de galeria e lojinha chamam o provedor sem `reserveBudget`, reconciliação ou `recordAiUsage`. A galeria recebe `budgetManager` e não o usa; a lojinha sequer o recebe. Os limitadores antigos não são chamados pelos novos wrappers. Assim, consumo visual não entra no orçamento nem no painel.

No chat, a reserva fixa de 1.500 tokens não cobre necessariamente a entrada/saída. O catch libera reserva após consumo e pode até liberar novamente após reconciliação. Reservas não têm estado persistido por ID para impedir dupla reconciliação. `DAILY_TOKENS_PROJECT_CEILING` está declarado, mas não aplicado. Em erro de Firestore, o fallback em memória reinicia por chamada porque a fábrica cria novo gerenciador.

Controlar todas as gerações, reservar por limite conservador, reconciliar idempotentemente e preservar custo desconhecido/pago em falhas. Testar concorrência e erros com banco real emulado.

### R11 — P1: contrato de consumo foi trocado sem atualizar o frontend

`usage.js:158` retorna `today`, `month`, `providerQuota`; a interface espera `daily`, `totalDaily`, `totalMonthly`, `models`, `recentLogs` e `activeModel`. A badge do chat deixa de aparecer e Settings usa fallbacks de zero/1.500 e lista antiga de modelos.

Além disso, erros de leitura continuam convertidos em sucesso com zero. Preservar/adaptar contrato em conjunto; mostrar indisponibilidade em falha e diferenciar cota do provedor de orçamento interno. O reset fixo às 08:00 UTC ignora horário de verão do Pacífico.

### R12 — P2: lojinha ignora URL e MIME, e não valida limite de imagem

`handlers.js:432` ignora `imageUrl` e `mimeType`. O frontend envia URL para fotos já salvas (`StoreProducts.tsx:202`) e WebP para uploads otimizados. O backend envia todo base64 como JPEG e permite gerar sem imagem. Reproduzido com URL: payload contém somente texto.

Restaurar ambos os formatos suportados, MIME verdadeiro, validação de bytes/conteúdo e leitura autorizada com timeout. Os limites declarados em config não demonstram que foram aplicados.

### R13 — P2: fuso financeiro configurado não é usado no intervalo

`tools.js:11–39` usa `setHours`, `getFullYear` e `getMonth` do fuso do processo. `BUSINESS_TIMEZONE` não é aplicado nesse cálculo. Reproduzido em UTC: para `2026-09-26T01:00Z`, “hoje” inicia `2026-09-26T00:00Z`; em São Paulo deveria iniciar `2026-09-25T03:00Z`. Implementar limites no fuso configurado e testes fixos em fronteiras.

### R14 — P2: custo estimado usa tarifas erradas e ignora raciocínio

`config.js:30–31` define Gemini 2.5 Flash a US$ 0,075/0,30 e Lite a US$ 0,0375/0,15 por milhão de tokens de entrada/saída. Na tabela oficial Standard consultada, são US$ 0,30/2,50 e US$ 0,10/0,40, respectivamente. O cálculo ainda considera apenas `candidatesTokens`, sem separação de tokens de raciocínio faturáveis. Portanto, subestima o gasto.

Usar tabela vigente/versionada por modalidade e semântica correta de usageMetadata. Fonte: [preços oficiais Gemini](https://ai.google.dev/gemini-api/docs/pricing).

### R15 — P2: ferramentas, proteção e otimização estão incompletas

- `handlers.js` executa todas as chamadas de uma resposta, mas sobrescreve `finalAnswer` a cada ferramenta; só a última consulta fica no texto. Não há rodada com resultados para dependências.
- `MAX_TOOL_CALLS_PER_REQUEST`, `MAX_MODEL_ROUNDS` e `MAX_HISTORY_CHARS` estão declarados, mas não aplicados. `schemas.js` descreve argumentos ao modelo; não valida esses argumentos em runtime.
- `geminiClient.js` só rejeita `SAFETY`; `MAX_TOKENS` pode ser tratado/cacheado como sucesso.
- A fábrica cria novo `GeminiClient` a cada callable, reiniciando o mapa de falhas: suspensão após três falhas não persiste entre requisições.
- Não há caminho determinístico de consultas/templates no handler antes da geração, apesar da alegação no relatório.
- O contexto completo continua sendo carregado em toda geração, agora sem o antigo cache de catálogo, aumentando leituras.
- O handler institucional existe, mas não foi exportado como callable nem conectado a `StoreCustomization`, que continua chamando o chat genérico.

Conectar as capacidades à execução real e adicionar testes no nível de handler/fábrica/consumidor, em vez de testar somente helpers isolados.

## O que realmente melhorou

- Módulos menores com injeção de dependências tornam correções e testes mais simples.
- Repasse do objeto de filtros ao financeiro foi corrigido.
- Filtro de proprietário da galeria foi adicionado ao contexto; o problema equivalente de insumos permanece.
- Cache retorna resposta inteira e tem limite de entradas/expiração, embora sua política de uso ainda esteja errada.
- Cliente limita candidatos a dois e mantém timeout durante leitura do corpo.
- Consulta de consumo por agregados reduz leituras, quando contabilização e contrato forem corrigidos.

## Validação e cobertura

- `npm run typecheck`: passou.
- `npm run test:unit`: 119 testes passaram em 15 arquivos. São os testes da suíte unitária; não comprovam integração Firebase nem qualidade real do Gemini.
- `node --check functions/index.js`: passou.
- `npm run build`: passou, com avisos de assets públicos não resolvidos no build e chunks grandes; isso não valida o JavaScript das Functions em execução.
- `git diff --check`: passou.
- Reproduções isoladas confirmaram: ReferenceError com db, galeria sem imagem, URL de loja ignorada, campos incompatíveis dos rascunhos/consumo, cache contaminado por histórico, insumos fora do escopo, fuso incorreto, Timestamp inválido e setup multiplicado por lote.
- Os 40 casos sintéticos incluem testes de regex/JSON/auxiliares; não constituem 40 avaliações reais de respostas do modelo. Testes usam strings de datas e repositórios simulados, deixando de exercitar os schemas reais do Firestore.
- Integração com emuladores, Playwright e geração real não foram executados nesta revisão. Não há comprovação de latência, qualidade ou gasto em produção.
- O arquivo `RESULTADO_IMPLEMENTACAO_IA.md` deve ser corrigido: marcar tarefas parciais/pendentes e remover alegações de implementação integral, contratos totalmente preservados, testes de integração executados e métricas não medidas.

## Encaminhamento

1. Corrigir R01 e preservar contratos R03/R11 para recuperar o fluxo básico.
2. Corrigir R02/R04/R05/R06 antes de expor resultados: imagem, schema real e isolamento.
3. Completar consultas, preço, cobrança e orçamento (R07–R10).
4. Resolver R12–R15 e conectar institucional/telemetria.
5. Adicionar regressões para cada reprodução, executar handlers com banco emulado e Playwright nos cards/visão/painel.
6. Reavaliar o plano IA-01–IA-12 com evidência por tarefa e só depois preparar publicação.

Nenhum arquivo de implementação foi alterado nesta revisão.
