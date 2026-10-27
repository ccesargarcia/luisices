# Plano de desempenho e resiliência do Copiloto Gemini

**Status:** fases 1 e 3 iniciadas no working tree, ainda sem validação automatizada ou deploy.
**Escopo:** `aiAgentChat` e chamadas de texto do módulo de IA. Todos os modelos devem permanecer na família **Gemini 3.x**.
**Restrições:** manter autorização e execução de ferramentas no backend; não introduzir outro provedor; não usar versões Gemini anteriores à família 3.x; preservar as respostas determinísticas de ferramentas e limites de orçamento.

### Avaliação do Gemini 4 Argon

O Argon foi avaliado, mas não será incluído no fallback nem na configuração de produção deste plano: `gemini-4-argon` é da família 4.x e viola a restrição atual de operar somente com a família 3.x. A documentação oficial lista function calling como suportado, mas posiciona o modelo para raciocínio complexo e tarefas agentic longas, recomenda timeouts maiores e lista preço superior ao Flash. Portanto, não é uma escolha indicada para reduzir a latência de conversas rotineiras. Se a restrição de família mudar no futuro, ele poderá ser comparado em um benchmark isolado, sem tráfego de usuários, antes de qualquer rollout. Referências: [modelo Argon](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon), [migração e recomendações de timeout](https://ai.google.dev/gemini-api/docs/latest-model), [preços](https://ai.google.dev/gemini-api/docs/pricing).

## Objetivo

Diminuir a latência percebida e os erros transitórios sem enfraquecer autorização, segurança de dados ou confiabilidade das respostas. Melhorias serão medidas por estágio, para distinguir tempo do modelo, Firestore, inicialização da Function e trabalho posterior à resposta.

O Sentry já mostrou uma ocorrência com aproximadamente 40,7 s no handler, dos quais cerca de 35,5 s estavam em chamadas à API Gemini e uma tentativa durou aproximadamente 35 s. Isso indica que a prioridade é limitar chamadas lentas do provedor e usar fallback de forma previsível; otimizar apenas cold start não resolveria essa ocorrência.

## Arquitetura atual relevante

- `functions/ai/callables.js` expõe `aiAgentChat` como callable e dá até 120 s à Function.
- `functions/ai/handlers.js` carrega contexto de catálogo, monta histórico e ferramentas, chama Gemini e pode fazer uma segunda chamada opcional de síntese.
- `functions/ai/geminiClient.js` realiza chamadas REST, acompanha falhas por modelo e tenta fallbacks.
- `functions/ai/usage.js` grava logs e agregados de uso no Firestore antes de devolver o resultado.
- Antes desta alteração, o cliente permitia timeout total de chat de 55 s e uma tentativa do modelo podia durar até 35 s.
- Há uma lista de modelos alternativos em `config.js`, mas `index.js` fornecia apenas o fallback singular ao cliente. Isso impedia o uso efetivo da lista completa.
- O contexto de produtos, insumos e galeria é consultado novamente em cada mensagem. A síntese com outra chamada Gemini e a telemetria sequencial também podem acrescentar tempo.

## Fase 1 — Limites de latência e fallback Gemini 3.x

**Objetivo:** impedir que uma única tentativa lenta consuma quase todo o tempo da interação e garantir que os modelos alternativos configurados sejam realmente usados.

1. Configurar `thinkingLevel: LOW` para o Copiloto e sua síntese opcional. O nível é uma política inicial para conversa operacional; não altera regras de autorização nem a execução de ferramentas.
2. Definir orçamento total para chat, prazo menor para a tentativa primária e prazos de fallback menores. A tentativa deve ser abortada também durante a leitura do corpo da resposta.
3. Passar `FALLBACK_CHAT_MODELS` completo ao cliente e manter a quantidade de tentativas limitada pelo orçamento de tempo.
4. Usar fallbacks estáveis documentados da família Gemini 3.x. A lista inicial foi ajustada para `gemini-3.6-flash`, `gemini-3.5-flash-lite` e `gemini-3.1-flash-lite`, removendo um ID Pro que não consta na [lista oficial atual de modelos](https://ai.google.dev/gemini-api/docs/models) e o modelo Preview. Para `408`, `429`, `5xx`, timeout e falha de rede, aplicar espera curta, exponencial e com jitter antes de tentar outro modelo. Não repetir erros de autenticação, payload inválido ou cobrança; um `404` de modelo deve permitir seguir para o próximo modelo configurado.
5. Validar em runtime que o modelo primário configurado por ambiente e todos os fallbacks pertencem à família `gemini-3...`. Uma configuração incompatível deve falhar com erro explícito, sem chamar versões antigas.
6. Não enviar chamadas de escrita ao Firestore através do modelo: o modelo apenas propõe chamadas; o executor backend continua responsável por autorização, validação e execução.

**Implementação iniciada:** `config.js`, `index.js`, `handlers.js`, `geminiClient.js` e `usage.js` receberam os ajustes acima no working tree. Os valores iniciais são 30 s de orçamento de chat, 12 s para o modelo primário, 9 s para cada fallback e espera inicial de 250 ms com jitter. Devem ser tratados como valores de partida sujeitos a validação.

**Critérios para aceitar a fase:**

- Nenhuma tentativa individual de chat excede seu limite configurado, incluindo leitura do corpo HTTP.
- Um erro transitório no modelo principal pode chegar a outro modelo Gemini 3.x sem exceder o timeout total.
- Modelos de versões anteriores são recusados antes da requisição HTTP.
- Casos de tool calling, respostas de texto e erro retornado ao frontend preservam seus contratos atuais.
- Sentry mostra duração, status e modelo de cada tentativa sem registrar prompt, tokens de autenticação, dados de cliente ou argumentos sensíveis.

## Fase 2 — Perfil de latência e qualidade

**Objetivo:** confirmar com dados que o nível de raciocínio baixo melhora a experiência sem reduzir a qualidade das tarefas do negócio.

1. Criar ou atualizar casos de avaliação para respostas informativas simples, extração de rascunho de pedido, consulta financeira, resumo diário, consulta de clientes e chamadas de múltiplas ferramentas.
2. Comparar `LOW` com o nível atual em amostra representativa, observando qualidade, uso correto das ferramentas, latência p50/p95, tokens de raciocínio e taxa de erro.
3. Manter `LOW` para fluxo comum se cumprir critérios. Se tarefas complexas regredirem, usar classificação determinística do tipo de tarefa para selecionar `MEDIUM` somente nos casos que exigem mais raciocínio, com limite de tempo próprio.
4. Registrar duração e contagem de tentativas por modelo no Sentry/telemetria. Não guardar conteúdo da conversa para obter essas métricas.
5. Remover parâmetros de geração incompatíveis com a família do modelo. `temperature` foi removida dos payloads Gemini do módulo; a documentação informa que modelos Gemini 3.6+ ignoram esse parâmetro e podem futuramente rejeitá-lo. `maxOutputTokens` continua como limite superior, não como mecanismo primário para reduzir raciocínio.

**Critérios para aceitar a fase:** qualidade não piora nos fluxos críticos; latência p95 melhora; não ocorre aumento de pedidos mal interpretados ou uso indevido de ferramentas.

## Fase 3 — Retirar analytics de tokens do caminho crítico

**Decisão e implementação iniciada:** descontinuar o painel administrativo de consumo detalhado e a telemetria Firestore criada exclusivamente para alimentá-lo. O código não mede a cota real do provedor: exibia limites de RPM/TPM como “não confirmado”, usava 45 mil como limite mensal estimado, lia agregados próprios do Firestore e descrevia “sondas HTTP periódicas” que não são executadas por `getAiUsage`. Além de potencialmente induzir a erro, `recordAiUsage` fazia gravações sequenciais por solicitação e por modelo/tentativa.

**Manter separado:** `AiBudgetManager` e seus limites diários por usuário/projeto. Esse mecanismo reserva e reconcilia o consumo antes/depois da chamada e é uma proteção operacional, não um dashboard. Não o remover junto com o relatório. Para cobrança e limites do fornecedor, usar o console oficial do Gemini; para latência e erros técnicos, usar Sentry com metadados mínimos.

1. **Feito no working tree:** remover o painel de consumo por modelo das configurações e o indicador de quota do Copiloto.
2. **Feito no working tree:** remover as chamadas frontend a `getAiUsage`. O callable foi mantido temporariamente para compatibilidade com versões antigas em cache e para evitar exclusão remota implícita no próximo deploy; ele só lê dados históricos.
3. **Feito no working tree:** parar de gravar `ai_usage_logs`, `ai_usage_daily` e `ai_usage_monthly` nas rotas de IA. Preservar a reserva/reconciliação em `ai_budget_daily` e o limite global de projeto.
4. Substituir a necessidade diagnóstica por spans/medidas de Sentry: callable, modelo, status/categoria do erro, duração, tentativas e fallback utilizado. Não registrar prompt, conteúdo, identificadores de cliente ou chave.
5. Não apagar os documentos históricos das coleções de analytics automaticamente. Definir retenção e remoção separadamente, após conferir se há necessidade de auditoria.

**Critérios para aceitar a fase:** criação/edição/consulta do Copiloto continuam respeitando limites; o frontend não chama mais `getAiUsage`; nenhuma nova gravação nas coleções de analytics ocorre; Sentry continua explicando latência/falhas sem dados pessoais; deploy lida explicitamente com a remoção futura da callable. A aceitação ainda depende de executar as validações automatizadas.

## Fase 4 — Reduzir custo e latência do contexto

1. Medir separadamente autorização, reserva de orçamento, consultas de catálogo, preparação do prompt, Gemini, execução das ferramentas, reconciliação de orçamento e telemetria.
2. Implementar cache curto e limitado para o resumo de catálogo, com chave por escopo/permissões e invalidação após alterações relevantes. Não compartilhar dados entre usuários ou perfis com escopos distintos.
3. Reduzir o contexto enviado ao modelo para o mínimo necessário. Consultas específicas devem continuar consultando a fonte autorizada por ferramenta, não inferir que amostras parciais representam todo o catálogo.
4. Evitar a segunda chamada de síntese quando o resultado formatado pelo backend já responde corretamente. Manter a síntese apenas para resultados múltiplos que realmente precisam ser combinados.
5. Revisar o custo e a contenção das transações de reserva/reconciliação do orçamento somente após medir seu impacto. Não enfraquecer os limites nem substituir a contabilidade por escrita “fire-and-forget”.

**Critérios para aceitar a fase:** queda mensurável do tempo pré-modelo e pós-modelo; cache respeita separação de escopo; os totais e limites de orçamento continuam consistentes; respostas de dados mutáveis não são servidas de cache incorretamente.

## Fase 5 — Resiliência operacional e experiência de falha

1. Mapear erros Gemini para categorias claras: indisponibilidade temporária, limite/quota, configuração/autenticação e requisição inválida.
2. Exibir mensagem amigável ao usuário para indisponibilidade temporária, sem expor corpo HTTP, stack, prompt ou dados internos.
3. Instrumentar resultados por tentativa: modelo, status HTTP/categoria, latência, timeout, resultado do circuit breaker e se a resposta final foi obtida por fallback.
4. Alertar no Sentry sobre aumento de 503/429, p95 e timeout, separados por ambiente e callable; consultar gasto no painel oficial do Gemini.
5. Revisar o circuit breaker para que erros de cliente não abram o circuito e para que a recuperação após cooldown seja gradual, evitando que uma Function inteira mantenha estado desatualizado indefinidamente.

## Segurança, privacidade e limites

- API key continua apenas no backend em Secret Manager; nunca enviar chave ao frontend ou ao Sentry.
- Não registrar mensagens, histórico, nomes/telefones, resultados financeiros, imagens, argumentos de ferramentas nem corpos completos de erro.
- Restringir contexto e resultados das ferramentas ao escopo autorizado em cada chamada.
- Fallback continua dentro da família Gemini 3.x, segundo a restrição operacional do projeto.
- `maxOutputTokens` controla o teto da saída; reduzir esse valor demais pode truncar resposta ou chamada de ferramenta. O controle primário de raciocínio é `thinkingLevel`.
- Respostas financeiras e efeitos de negócio devem permanecer calculados/validados pelo backend, sem confiar em cálculos ou texto livre do modelo.

## Rollout e rollback

1. Executar validação automatizada local de cliente Gemini, fallback, orçamento e contratos do Copiloto antes do deploy.
2. Publicar primeiro em `develop`; comparar Sentry e avaliações antes/depois por pelo menos um ciclo representativo de uso.
3. Promover à produção somente após os critérios da Fase 1 e Fase 2 serem atendidos.
4. Se houver piora de qualidade/erro, reverter os valores de timeout e `thinkingLevel` para os anteriores mantendo o filtro de família 3.x e a lista de fallbacks corrigida, desde que estes continuem válidos.
5. Se a lista de modelos falhar por indisponibilidade ou remoção, ajustar apenas IDs documentados da família 3.x. Não reativar uma família antiga como rollback.

## Próximas ações

- Revisar o diff e a compatibilidade dos novos prazos com a experiência do frontend.
- Criar/ajustar testes de unidade para thinking config, fallback da lista completa, jitter limitado pelo orçamento, status não repetíveis e rejeição de modelos fora de 3.x.
- Rodar os testes focados do módulo de IA e, depois, regressão de contratos/autorizações.
- Atualizar documentação geral do Copiloto e métricas do Sentry após a validação.
- Não fazer commit, push ou deploy até haver validação explícita dos resultados.
