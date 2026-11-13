# Tarefas — copilot-mcp-quality

Cada tarefa aponta para requisitos e critérios de `spec.md`. T1–T3 estão concluídas; a avaliação live e o fechamento da iniciativa continuam pendentes.

- [x] **T1 — Registro, escopo e dispatcher (RF-1/RF-2, CA-1):** adicionar teste offline de paridade entre nomes de `TOOLS_METADATA`, `TOOL_SCOPE_MAP` e dispatcher; validar escopo único, duplicidade e métodos de handler existentes.
  - Evidência: `tests/unit/mcp-tool-contract.test.ts`; typecheck passou e Vitest verbose passou (4 testes). Verifica nomes ausentes/extras/duplicados, alinhamento de escopos, declaração de escopo e método de executor existente.
- [x] **T2 — Catálogo e distinção Copiloto/MCP (RF-3/RF-4, CA-3):** atualizar catálogo documental a partir das fontes de schema/escopo; registrar nove declarações Gemini e 31 ferramentas MCP, sem inferir paridade.
  - Evidência: manual esclarece que os 11 exemplos detalhados não são a lista completa, inclui a 31ª ferramenta e separa os contratos Gemini/MCP. O teste `tests/unit/mcp-tool-contract.test.ts` também valida nomes e escopos documentados contra o código.
- [x] **T3 — Regressão sintética offline (RF-5/RF-8, CA-4/CA-7):** classificar a suíte atual como determinística e acrescentar guardrails de autorização e despacho; mapear cenários existentes para ambiguidade, prompt injection, tenant, redação financeira e argumentos inválidos.
  - Evidência: `tests/unit/ai/offline-regression-guardrails.test.ts` acrescenta três cenários com Gemini mockado; `synthetic-quality-eval.test.ts` usa relógio fixo. A matriz focada, composta por sete arquivos, passou com 130 testes; `npm run typecheck` passou. Fixtures são sintéticas e não houve chamada de rede/provedor ou efeito operacional.
- [ ] **T4 — Avaliação live isolada (RF-6/RF-7/RF-9/RF-10/RF-11, CA-5/CA-6):** criar workflow manual que exige modelo e chave dedicados, usa apenas fixtures sintéticas, pontua por rubrica e publica relatório seguro sem deploy.
  - Implementação pronta para configuração: `.github/workflows/gemini-synthetic-evaluation.yml`, `scripts/ai-eval/live-gemini-eval.cjs` e `tests/fixtures/ai/copilot-live-eval.json`; chave exclusiva `GEMINI_EVAL_API_KEY`, smoke/full, Gemini 3.x sem fallback, sem permissões de publicação, artefato com retenção de 14 dias.
  - Revisão da PR #179: o cenário financeiro usa perfil admin, cujo escopo inclui todos os pedidos sintéticos; os valores esperados agora correspondem aos totais emitidos (`988.054,32`), recebidos (`200,00`) e pendentes (`987.854,32`). O caso cross-tenant separado continua rodando como usuário comum.
  - Pendente para concluir: cadastrar a chave dedicada e executar manualmente ao menos uma vez em branch permitida. Evidência final deve registrar SHA/modelo/hash do prompt, rubrica e ausência de dados reais/segredos.
- [ ] **T5 — Segurança e compatibilidade (CA-2/CA-8):** executar e complementar regressões de OAuth, escopos, redaction, idempotência, confirmação e contratos; resolver divergências de implementação somente por decisão explícita.
  - Evidência: resultados registrados para testes unitários e de integração aplicáveis, sem afirmar deploy remoto.
- [ ] **T6 — Revisão documental e impacto de IA:** sincronizar guias, catálogos, exemplos, links e evidências; registrar diferenças intencionais entre Copiloto e MCP.
  - Evidência: catálogo documental coerente com schema/escopos; links conferidos; justificativa de não alteração para documentos não afetados.
- [ ] **T7 — Validação e fechamento:** typecheck, testes determinísticos e workflow live isolado; atualizar status somente após evidências.
  - Evidência: comandos/resultados exatos, status final e limitações do ambiente anotados.
