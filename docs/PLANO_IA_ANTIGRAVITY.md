# Plano de execução para o Antigravity — IA Luisices

Data: 26/09/2026. Repositório: `/home/caiogarcia/luisices`.
Base observada: commit `e1b9444`. Revalidar HEAD e estado local antes de executar.
Referência: [avaliação técnica](AVALIACAO_IA.md).

## 1. Missão e resultado esperado

Corrigir os achados da avaliação, preservar os fluxos atuais e tornar a IA confiável, rápida e economicamente controlada. Entregar código, testes, evidências e documentação de operação. Este documento é um plano: nenhuma tarefa abaixo deve ser considerada implementada por constar aqui.

Prioridade de decisão: autorização dos dados e correção dos resultados → compatibilidade → latência → custo. Uma resposta barata e incorreta não representa melhoria. Otimizar custo por tarefa concluída corretamente, incluindo novas tentativas, Firestore e Cloud Functions.

Trabalhar até completar as tarefas locais e informar claramente qualquer validação que dependa do ambiente. Preparar publicação e reversão; publicação, migração de dados, envio de mensagens reais e benchmarks pagos dependem da autorização correspondente. A entrega deste plano não autoriza essas operações externas.

## 2. Antes de editar

- [ ] Ler instruções locais aplicáveis, `docs/AVALIACAO_IA.md`, este plano e os arquivos de cada tarefa.
- [ ] Registrar branch, HEAD e `git status --short`. Preservar alterações existentes; não usar reset, checkout de arquivos modificados ou limpeza indiscriminada.
- [ ] Revalidar os achados no código atual. As linhas citadas na avaliação são referências históricas; buscar pelos nomes das funções.
- [ ] Ler a precificação atual e seus testes. O commit `e1b9444` inclui avanços recentes em cálculo, frete e setup que precisam ser preservados.
- [ ] Executar baseline de typecheck, testes unitários e sintaxe das Functions. Registrar falhas anteriores separadamente.
- [ ] Identificar projeto Firebase de desenvolvimento, região do banco, autenticação e scripts de emuladores sem exibir segredos.
- [ ] Não inferir integração pelo nome dos arquivos: o entrypoint é `src/main.tsx` → `src/app/App.tsx`. Investigar `server.ts`/`src/App.tsx` como fluxo separado.

## 3. Contratos que devem ser preservados

- Callables existentes: `aiAgentChat`, `getAiUsage`, `enrichGalleryItemWithAi`, `enrichStoreProductWithAi` e envio de WhatsApp.
- Resposta do chat: `success`, `reply`, `orderDraft`, `whatsappDraft`, `pricingEstimate`, `galleryItems`. Campos novos devem ser opcionais ou introduzidos com adaptação compatível.
- Histórico, imagens, cards, revisão de rascunhos e preenchimento de formulários no frontend.
- Fluxos de pedidos, clientes, galeria, lojinha, precificação, relatórios e WhatsApp.
- Nenhuma ação externa deve ser executada automaticamente porque o modelo a sugeriu. Preservar confirmação humana de envio e gravações de negócio.
- O backend verifica permissão em toda ferramenta, inclusive se a chamada for fabricada pelo cliente ou pelo modelo.
- Responder em pt-BR e distinguir dado confirmado, estimativa, ambiguidade, resultado parcial e falha.

## 4. Organização sugerida

Extrair módulos pequenos de `functions/index.js`, mantendo os exports públicos nesse arquivo. Uma estrutura possível dentro de `functions/ai/`: `authorization`, `schemas`, `geminiClient`, `modelPolicy`, `context`, `cache`, `repositories`, `tools`, `usage` e `budget`. Criar apenas divisões úteis; evitar uma migração extensa antes das correções críticas.

A regra pura de precificação deve ter uma única fonte usada pelo frontend e backend. Resolver explicitamente o empacotamento: Functions usa CommonJS, frontend usa TypeScript/ESM e o deploy publica `functions/`. Não importar arquivos fora desse diretório em runtime sem um build que os inclua. Testar o artefato realmente implantável. Evitar duas cópias editáveis da fórmula.

## 5. Fases e tarefas

### Fase A — autorização e correção dos dados (bloqueia liberação)

#### IA-01 — contexto autorizado e fontes corretas

Arquivos: `functions/index.js` (`getDynamicCatalogKnowledge` e ferramentas), regras Firestore e serviços de galeria/precificação.

- [ ] Centralizar cálculo do escopo autorizado a partir do perfil atual. Conciliar regras da plataforma com as restrições atuais do copiloto; não ampliar acesso implicitamente durante refatoração.
- [ ] Passar esse escopo para carregamento de catálogo, galeria, insumos, equipe e caches.
- [ ] Remover leitura global de galeria do contexto de usuários sem autorização e excluir itens removidos.
- [ ] Usar a coleção real `supplies`, conferir os campos do serviço e respeitar suas permissões.
- [ ] Carregar apenas contexto necessário à intenção; minimizar dados pessoais enviados ao modelo.
- [ ] Tratar texto de catálogo, imagens e resultados de ferramentas como dados, nunca como novas instruções de permissão.
- [ ] Autorizar antes de consultar cache e considerar mudanças de papel/permissão nas chaves ou invalidação.

Aceite: usuário A não consegue obter metadados, preços privados ou registros de B pelo prompt, ferramenta, cache ou histórico fabricado. Admin e funcionário mantêm exatamente o acesso previsto. Insumos existentes são encontrados na fonte correta.

#### IA-02 — financeiro e consultas completas

- [ ] Corrigir `executeFinancialSummary(args.period || 'month')` para receber o objeto completo validado.
- [ ] Definir o fuso do negócio em configuração e usar intervalos com início inclusivo/fim exclusivo. Separar esse fuso do reset de cota do provedor.
- [ ] Documentar semântica de hoje, semana, mês, ano e histórico e alinhar rótulos da interface.
- [ ] Reusar a definição oficial de faturamento, recebido, pendente, cancelamentos e exclusões; verificar `orders`/`salesLedger` e relatórios antes de escolher a fonte.
- [ ] Aplicar filtros e ordenação no banco onde houver suporte, com índices versionados.
- [ ] Para totais, usar agregações confiáveis ou percorrer páginas completas com limite operacional explícito. Se o limite for atingido, não anunciar total completo.
- [ ] Para buscas textuais, não fingir que Firestore faz substring nativa: adotar índices/normalização apropriados ou busca paginada com indicação de cobertura. Não adicionar um serviço pago de busca sem justificar a necessidade.
- [ ] Eliminar `limit` anterior à busca como fonte silenciosa de falsos negativos. Incluir cursor/hasMore quando aplicável.
- [ ] Implementar consulta autorizada de excluídos separadamente ou retirar essa capacidade anunciada com explicação compatível.
- [ ] Deduplicar pedidos associados por `userId`, `createdBy` e `assignedTo`.
- [ ] Diferenciar erro de banco e lista vazia; colaborador não resolvido não deve resultar em totais globais.

Aceite: bases com mais de 200 pedidos e mais de 500 clientes retornam resultados corretos; pedido relevante na última página aparece; períodos e filtros por colaborador são respeitados; totais coincidem com o módulo oficial nas mesmas condições.

#### IA-03 — cobranças baseadas em pedidos reais

- [ ] Resolver cliente/pedido por ID ou identificador inequívoco. Nomes parciais e homônimos exigem seleção.
- [ ] Buscar saldo, status, prazo e telefone no escopo autorizado antes de gerar o rascunho.
- [ ] Não aceitar valor ou destinatário inventado pelo modelo como fonte de verdade.
- [ ] Usar templates para cobrança, produção, retirada e confirmação quando suficientes.
- [ ] Tratar pedido pago, cancelado, excluído ou saldo alterado enquanto o rascunho estava aberto.
- [ ] Revalidar a informação de cobrança ao confirmar envio; se houver mudança material, atualizar o rascunho e pedir nova revisão. Preservar o endpoint genérico para mensagens sem vínculo com pedido.
- [ ] Preservar revisão humana e testar integração de envio com transporte simulado.

Aceite: nenhuma cobrança usa saldo desatualizado ou cliente escolhido pela primeira correspondência parcial. Nenhuma mensagem real é enviada nos testes.

#### IA-04 — precificação única e validada

- [ ] Extrair/reusar cálculo atual, preservando setup, frete, aproveitamento, perdas, taxas, margem/markup e custos fixos existentes.
- [ ] Carregar `pricingSettings`, insumos e receitas autorizadas; usar IDs para resolução inequívoca.
- [ ] Diferenciar zero de ausência com validação explícita. Definir quais campos permitem zero.
- [ ] Rejeitar negativos inválidos, NaN, infinito, quantidades inválidas e margens que tornam o cálculo indefinido.
- [ ] Para dados ausentes, solicitar os campos essenciais ou mostrar hipótese identificada; não inventar custo e apresentá-lo como cadastrado.
- [ ] Retornar parâmetros utilizados, origem dos valores e arredondamento consistente, preservando os cards.

Aceite: mesmo conjunto de dados gera os mesmos centavos na calculadora e na IA. Testar receitas por folha/lote, tempo e setup, taxas, margem/markup, frete e limites. Custos explícitos zero não viram R$ 15/R$ 5; entrada inválida nunca gera preço negativo.

### Fase B — contratos de IA, cache e execução (depende da Fase A)

#### IA-05 — cache correto e limitado

- [ ] Aplicar a mesma elegibilidade na escrita/leitura e armazenar a resposta completa.
- [ ] Desabilitar cache de resposta para saldos, status, cobranças e demais dados mutáveis sem mecanismo seguro de versão.
- [ ] Para conteúdo estável, incluir usuário/escopo, tarefa, parâmetros, modelo e versão de prompt/schema na chave. Histórico/imagem só podem participar com identidade inequívoca; preferir excluí-los inicialmente.
- [ ] Adicionar TTL real com remoção e limite de entradas/bytes.
- [ ] Evitar chamadas simultâneas duplicadas para a mesma geração elegível, sem compartilhar contextos de usuários.
- [ ] Corrigir mensagem de limpeza: cache local não é limpeza global. Se for necessário invalidar todas as instâncias, implementar versão compartilhada e seu custo.
- [ ] Não cachear falhas, bloqueios ou respostas truncadas.

Aceite: cache hit preserva todos os cards; mesma frase após foto/histórico não contamina conversa nova; mudança de permissão impede reaproveitamento; memória permanece limitada.

#### IA-06 — cliente Gemini e política de tentativas

- [ ] Centralizar comunicação dos três fluxos, mantendo configuração de modelo por tarefa e ambiente.
- [ ] Verificar modelos, recursos e preços na documentação oficial vigente; verificar acesso real no projeto quando autorizado.
- [ ] Usar um modelo principal e no máximo uma tentativa adicional por operação; definir orçamento total compartilhado entre rodadas de ferramentas e retries.
- [ ] Cobrir fetch e leitura do corpo no timeout. Propagar cancelamento e limpar timers em `finally`.
- [ ] Não repetir erros de credenciais, autorização ou payload inválido. Tratar 429/5xx/timeouts com política documentada, Retry-After quando viável e respeito ao prazo total.
- [ ] Suspender temporariamente modelos com falhas recorrentes; usar preferência saudável por capacidade/tarefa, sem uma variável global apresentada como estado de todo o sistema.
- [ ] Validar `finishReason`, bloqueio, ausência de candidato e saída truncada. Registrar cada tentativa.
- [ ] Ajustar timeout dos callables no frontend para não encerrar antes do prazo suportado; especialmente galeria.

Valores iniciais propostos para testes: 20 s de prazo total no chat e 30 s na visão, com folga de transporte no frontend. Ajustar com medições; não sacrificar qualidade nem declarar esses valores como latência já atingida.

Aceite: provedor lento ou indisponível produz erro útil dentro do prazo; não existe cascata de sete modelos; 400/401/403 não multiplicam gerações; streams/corpos lentos também são interrompidos.

#### IA-07 — ferramentas e saídas estruturadas

- [ ] Validar entradas do callable, argumentos de ferramentas e saídas do modelo no servidor.
- [ ] Autorizar cada ferramenta em execução e rejeitar nome desconhecido.
- [ ] Tratar todas as chamadas retornadas: paralelizar apenas leituras independentes; sequenciar dependências.
- [ ] Manter caminho determinístico de uma consulta. Usar nova rodada com resultados apenas quando a tarefa precisar; preservar metadados exigidos pelo protocolo atual do Gemini.
- [ ] Limitar inicialmente a duas rodadas de modelo e quatro ferramentas por solicitação, dentro do orçamento total; ao atingir o limite, informar o que foi concluído e o que falta.
- [ ] Definir schema de visão, tamanhos de campos/arrays, categorias permitidas e tipos numéricos. JSON válido não dispensa validação semântica.
- [ ] Separar geração institucional por tarefa/endpoint próprio com schema, limite adequado e sem ferramentas de pedidos. Atualizar `StoreCustomization` com compatibilidade.
- [ ] Preservar contexto estruturado mínimo de pedido/cliente nos acompanhamentos sem confiar nos IDs enviados pelo frontend.

Aceite: “resuma meus pedidos e prepare cobrança do pedido X” completa ambas as partes ou explica a limitação; saída malformada não grava campos inválidos; texto institucional não é perdido por truncamento silencioso.

#### IA-08 — entradas e imagens

- [ ] Limitar texto individual, total de histórico, número de mensagens, bytes e tipos antes de consumir o provedor. Documentar valores configuráveis.
- [ ] Rejeitar imagem grande explicitamente; nunca prosseguir fingindo que a analisou.
- [ ] Preferir referência autorizada do Storage. Para URLs, restringir protocolo, hosts, caminhos e redirecionamentos; rejeitar destinos privados e downloads sem limite.
- [ ] Usar timeout, limite de bytes lidos e validação do conteúdo/MIME. Não confiar somente no header ou extensão.
- [ ] Dimensionar resolução por tarefa: classificação pode usar menor resolução, leitura de texto pode precisar de mais detalhe. Não afirmar redução de tokens proporcional ao tamanho WebP sem medição.
- [ ] Evitar nova análise da mesma imagem/versão/tarefa quando o resultado válido e autorizado já existe; oferecer reanálise explícita.

Aceite: testes de URL indevida, redirect, base64 inválido, MIME falso, arquivo acima do limite, download lento e imagem com texto pequeno.

### Fase C — custos, observabilidade e desempenho

#### IA-09 — uso e painel honestos

- [ ] Registrar requestId, tentativa, tarefa, modelo pedido/usado, versão, duração, status, cache hit, tokens de entrada/saída/raciocínio/cache e estimativa de custo quando disponíveis.
- [ ] Conferir semântica de usageMetadata para não contar tokens duas vezes. Uso desconhecido em timeout deve aparecer como desconhecido, não zero.
- [ ] Registrar consumo mesmo quando resposta do provedor foi paga mas falhou na validação; aguardar gravação ou usar mecanismo durável comprovado.
- [ ] Não registrar chaves, base64, prompts completos ou dados pessoais desnecessários.
- [ ] Criar agregados por período/modelo/tarefa com idempotência por tentativa e proteção contra eventos duplicados. Avaliar contenção antes de usar um único documento global.
- [ ] Trocar varredura mensal a cada mensagem por leitura de agregados; manter paginação de logs e retenção documentada.
- [ ] Remover sondagem de sete modelos por atualização. Separar modelo configurado, último usado, disponibilidade conhecida e verificação de metadados.
- [ ] Substituir cotas inventadas por limite confirmado/configurado ou “não disponível”. Diferenciar orçamento interno e cota do provedor.
- [ ] Usar reset de cota com timezone do provedor e horário de verão. Não confundir com datas financeiras.
- [ ] Em falha, mostrar indisponível/última atualização. Nunca transformar erro em sucesso com consumo zero.
- [ ] Tarifas versionadas por vigência/moeda, sem câmbio BRL inventado. Documentar se custo inclui apenas Gemini ou também infraestrutura.

Aceite: painel bate com fixtures de logs e preços, não aumenta leituras proporcionalmente ao histórico mensal e exibe estado de erro correto. Tokens/raciocínio/cache não são contados duas vezes.

#### IA-10 — orçamento e limite distribuído

- [ ] Substituir proteção exclusivamente em memória por controle compartilhado por usuário/projeto/ação, com transação ou mecanismo equivalente.
- [ ] Reservar orçamento antes da chamada, reconciliar com uso real e tratar concorrência, abandono e expiração. Em timeout, não liberar integralmente uma reserva quando pode ter havido cobrança.
- [ ] Definir tetos configuráveis de chamadas/tokens/custo e aviso ao usuário. Não inventar orçamento comercial: implementar configuração e documentar o valor escolhido para desenvolvimento.
- [ ] Bloquear novas gerações quando o orçamento autorizado for consumido; manter consultas/templates gratuitos disponíveis quando possível.
- [ ] Considerar App Check conforme implantação existente, com ativação coordenada para não bloquear clientes legítimos.

Aceite: solicitações concorrentes em instâncias diferentes não ultrapassam o orçamento reservado; chamadas duplicadas não duplicam contabilização; indisponibilidade do controle tem comportamento documentado.

#### IA-11 — otimização guiada por evidências

- [ ] Botões de ações conhecidas enviam intenção estruturada para caminhos determinísticos, com validação e autorização normais.
- [ ] Reduzir system prompt e contexto por tarefa e oferecer somente ferramentas pertinentes.
- [ ] Usar política configurável Lite/Flash, escolhida por avaliação; não trocar todos os fluxos indiscriminadamente.
- [ ] Instrumentar tempo de autorização, banco, provedor e serialização; distinguir instância fria/aquecida quando possível.
- [ ] Medir antes de alterar região, memória, minInstances ou introduzir cache externo. Evitar custos fixos sem ganho demonstrado.
- [ ] Streaming é opcional: adotar apenas se melhorar experiência medida e sem mostrar JSON ou argumentos incompletos como resposta final.

Aceite: comparação antes/depois com mesma suíte e volume; redução de custo não vem de respostas incompletas. Registrar custo por tarefa correta e p50/p95 por categoria.

### Fase D — integração e manutenção

#### IA-12 — Studio e documentação

- [ ] Mapear imports/rotas/scripts de `server.ts`, `src/App.tsx`, `ArchiveManager`, `GeneratorForm` e `ResultViewer`.
- [ ] Documentar o que está ativo, isolado ou legado. Não publicar esse servidor nem apagar o fluxo como efeito colateral deste trabalho.
- [ ] Se o Studio precisar de correções para um uso comprovadamente ativo, incluir autenticação, persistência, schemas, telemetria e política de modelos equivalentes; registrar trabalho adicional com evidência.
- [ ] Atualizar README das Functions, contratos, variáveis, índices, política de cache, métricas, orçamento e instruções de testes.
- [ ] Remover promessas de “instantâneo”, “cota em tempo real” ou “modelo ativo global” que a implementação não sustente.

## 6. Matriz mínima de testes

| Área | Casos obrigatórios | Critério |
| --- | --- | --- |
| Autorização | admin, funcionário permitido/negado, user, desativado, sem perfil, A/B, permissão revogada, histórico fabricado | nenhum acesso indevido |
| Financeiro | todos os períodos, fronteira de dia/mês, fuso, mais de 200 pedidos, dupla associação, excluídos/cancelados | igualdade com referência oficial |
| Busca | registro na última página, homônimo, colaborador desconhecido, banco indisponível | sem falso total ou falso vazio |
| Precificação | fixtures atuais, setup/lote, frete, zero, ausência, negativos, margem inválida, taxas | mesmos centavos da calculadora |
| Cobrança | pago, parcial, cancelado, telefone ambíguo, saldo muda antes de enviar | dados reais e nova revisão quando necessária |
| Cache | todos os cards, imagem/histórico, escopo, TTL, eviction, concorrência | contexto e contrato preservados |
| Gemini | 400/401/403/404/429/5xx, timeout de corpo, bloqueio, truncamento, JSON inválido | tentativas e prazo limitados |
| Ferramentas | duas independentes, dependência, desconhecida, argumentos inválidos, limite de rodadas | execução completa ou limitação explícita |
| Visão | Storage privado, URL indevida, redirect, MIME, tamanho, texto pequeno | segurança e qualidade verificadas |
| Uso/orçamento | retries, parsing falha, evento repetido, concorrência entre instâncias, reserva expirada | sem dupla contagem nem gasto ilimitado |
| UI | abrir chat, enviar imagem/texto, cards, revisão, histórico, falha de uso, formulário institucional | sem regressão visual/funcional |

Implementar testes de lógica pura e handlers com provedor simulado. Não limitar cobertura a testes que apenas espelham a implementação. Para autorização e consultas reais, usar Auth/Firestore/Storage/Functions em emuladores ou testes de handlers com contexto autenticado e banco emulado.

A configuração atual `firebase.test.json` inicia apenas Firestore e Storage. Estender com configuração específica para IA se necessário; os testes atuais de regras não comprovam funcionamento dos callables.

Comandos existentes a executar e registrar:

```bash
npm run typecheck
npm run test:unit
node --check functions/index.js
npm run test:integration
npm run build
git diff --check
```

Adicionar comando explícito para testes de IA se a configuração atual não os descobrir. Executar Playwright para os fluxos alterados com autenticação/emuladores e provedor simulado; confirmar no relatório quais testes rodaram. Problemas de ambiente devem ser descritos com comando, erro e validações restantes.

## 7. Avaliação de qualidade e metas

Criar conjunto versionado com pelo menos 40 casos sintéticos: 8 financeiro/busca, 8 preço, 8 cobrança/rascunho, 6 visão, 4 institucional e 6 autorização/ambiguidade. Acrescentar casos de falha e concorrência aos testes de engenharia. Não usar dados pessoais reais nas fixtures.

Separar tarefas determinísticas de avaliações com modelo. Comparar os candidatos nas mesmas entradas e configurações; registrar versão do modelo, prompt, horário, tokens, duração, número de tentativas, acerto e custo. Smoke tests pagos e benchmark no projeto dependem de limite financeiro autorizado.

Critérios de liberação:

- Zero falhas de isolamento na suíte e valores determinísticos 100% compatíveis com a referência.
- Todos os cenários críticos de cobrança e preço passam; nenhum erro crítico pode ser compensado por média de acerto alta.
- Meta inicial de pelo menos 95% de acerto nos demais casos, com critérios de julgamento publicados e falhas listadas. Amostra pequena não prova taxa real de produção.
- Metas propostas para ambiente medido: p95 de até 2 s em caminhos determinísticos aquecidos, 8 s em chat simples e 15 s em visão. Reportar o resultado real e ajustar a estratégia caso não atinja; não inventar medições.
- Nenhum ganho de custo alegado sem comparação equivalente. Reportar custo Gemini e leituras/execução separadamente quando não houver custo completo disponível.

## 8. Sequência de entrega e publicação

1. Baseline e testes de regressão que reproduzem os defeitos.
2. IA-01 a IA-04: segurança, fontes, consultas, cobrança e preço.
3. IA-05 a IA-08: cache, cliente, ferramentas, schemas e imagens.
4. IA-09 e IA-10: uso confiável, painel e orçamento distribuído.
5. IA-11 e IA-12: otimização medida, integração e documentação.
6. Validação local completa; revisão do diff e dos contratos antigos/novos.
7. Preparar pacote para desenvolvimento: artefatos de Functions, índices/regras, configuração e frontend. Evitar scripts que removam versões de secrets como efeito colateral sem necessidade.
8. Publicar somente no ambiente autorizado; aguardar índices antes de ativar consultas dependentes e validar com dados sintéticos.
9. Preparar rollout gradual por configuração e critérios de rollback: falha de permissão, valor divergente, aumento de erro/latência ou gasto acima do limite.
10. Preparar reversão para versão segura com configuração anterior e compatibilidade de schema; não reativar o vazamento de contexto ou cobranças incorretas para restaurar disponibilidade. Desabilitar somente o recurso afetado quando necessário.

## 9. Entrega obrigatória do Antigravity

Criar `docs/RESULTADO_IMPLEMENTACAO_IA.md` contendo:

- Commit/base e arquivos alterados, com justificativas.
- Tabela IA-01 a IA-12: concluído, parcial ou pendente; evidência e motivo.
- Comandos executados, resultados, quantidade de testes e limitações de ambiente.
- Medições antes/depois ou declaração explícita de que faltou execução real.
- Política de modelos, limites, tarifas, orçamento e mecanismo de invalidação.
- Compatibilidade de contratos e qualquer migração necessária.
- Plano concreto de publicação/reversão e decisões que dependem de autorização.
- Riscos residuais e próximos passos, sem apresentar trabalho pendente como concluído.

Não encerrar apenas com mudanças de prompt ou troca de modelo. Os defeitos principais estão na integração com dados, contratos, execução e observabilidade.

## 10. Prompt de início

> Execute o plano em `docs/PLANO_IA_ANTIGRAVITY.md`, usando `docs/AVALIACAO_IA.md` como evidência inicial e revalidando o código atual. Comece pelo baseline e pelas tarefas IA-01 a IA-04. Preserve os avanços recentes de precificação e todas as alterações preexistentes. Implemente as fases locais até concluir, com testes de regressão e contratos compatíveis. Não faça deploy, migração, benchmark pago ou envio real de mensagens sem autorização correspondente. Registre a entrega em `docs/RESULTADO_IMPLEMENTACAO_IA.md`, com status e evidências por tarefa. Priorize correção e isolamento, depois velocidade e custo por tarefa correta.

## 11. Revisão com Antigravity via `agy`

Em 26/09/2026, o Antigravity recebeu os dois documentos pelo CLI em modo `plan`, com instrução expressa de somente revisar. Confirmou entendimento e executabilidade. Nenhuma implementação foi solicitada nessa chamada. As observações úteis foram incorporadas nas definições abaixo; conclusões da revisão não substituem verificação técnica.

### Definições adicionais para execução

1. **Teste do backend desde o início:** separar handlers da montagem dos exports. Injetar cliente Gemini, relógio, repositórios e telemetria por fábrica de dependências do servidor. Testes usam implementações simuladas; produção usa dependências reais. Nunca permitir que um parâmetro recebido pelo callable selecione mocks ou desligue autorização. Testar também o adaptador público do callable e seu envelope de erros.

2. **Fonte única de precificação:** proposta inicial é um módulo puro TypeScript em `shared/pricing/`, importado pelo frontend e compilado para CommonJS em `functions/lib/shared/` antes dos testes de empacotamento e deploy. Reusar compilador/dependências existentes se possível. Configurar build determinístico e predeploy explícito; garantir que o artefato gerado está incluído no upload. Tipos de domínio compartilhados não devem importar componentes React. Um módulo JS puro com tipos é alternativa aceitável se mantiver a fonte única e facilitar o empacotamento. Documentar a escolha; não criar sincronização manual entre fórmulas.

3. **Busca com custo limitado:** começar por IDs/número normalizado, telefone normalizado e consultas de igualdade; para nome, definir prefixos e ordenação compatíveis com o Firestore. Busca por trecho arbitrário é uma capacidade diferente e não deve ser prometida como prefixo. Se exigir índice auxiliar/backfill, preparar plano separado e não executar migração sem autorização. Durante transição, consulta paginada com orçamento explícito deve indicar parcialidade; nunca anunciar ausência global depois de ler só uma amostra. Serviço externo não está proibido, mas requer justificativa, custo e autorização para adoção.

4. **Orçamento concorrente:** começar com reserva atômica e idempotente por usuário/dia e limite de projeto coordenado, medindo contenção. Particionar contadores sem coordenação não preserva um teto global estrito. Se a carga justificar, distribuir cotas reservadas entre partições com soma limitada ao orçamento global. TTL deve servir à limpeza, não ser o único mecanismo de expiração/reconciliação. Simular falha após reserva, após geração e antes da contabilização final.

5. **Streaming fora do caminho crítico:** manter a resposta atual dos callables nesta entrega. Só propor streaming posteriormente, verificando versões instaladas, suporte oficial vigente e compatibilidade de clientes. Não assumir que a migração para outro tipo de endpoint é obrigatória. Ganhos iniciais devem vir da redução de consultas, contexto e tentativas.

6. **Fuso do negócio:** `America/Sao_Paulo` é uma hipótese inicial a conferir nas configurações existentes. Não alterar silenciosamente a semântica dos relatórios nem usar esse fuso para o reset de cotas do Gemini.

Ordem confirmada com o Antigravity: baseline e infraestrutura de testes → IA-01 → IA-02 → IA-03 → IA-04 → demais fases conforme dependências deste plano.
