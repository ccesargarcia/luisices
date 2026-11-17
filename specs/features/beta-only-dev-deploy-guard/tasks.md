# Tarefas — beta-only-dev-deploy-guard

- [x] **T1 — Política do workflow (RF-1 a RF-4):** detectar PR mesclada marcada e bloquear todos os deploys Dev sem alterar a execução das validações.
  - Evidência: gates de Firebase, Cloudflare e cache conectados ao output; testes/validações continuam independentes.
- [x] **T2 — Testes e permissões (CA-1 a CA-4):** cobrir label, merge, evento, branch e fallback; conceder apenas leitura de PR.
  - Evidência: suíte de política passa e o workflow não imprime credenciais.
- [x] **T3 — Documentação e impacto de IA:** atualizar runbook, guia Beta, índice e skill Functions; registrar que Gemini e contratos MCP não mudam.
  - Evidência: links/referências conferidos e comportamento documentado.
- [x] **T4 — Validação:** typecheck, teste focado, YAML e diff.
  - Evidência: registrar resultados realmente executados; nenhuma publicação foi iniciada.
- [x] **T5 — Fechamento:** registrar PR/commit e status final sem marcar trabalho remoto não observado.
  - Evidência: commit `87c3532` + ajuste da revisão de preservação de validação de build frontend (`NEED_FRONTEND_VALIDATION=true` quando `SKIP_DEV_DEPLOY=true` e `DEPLOY_FRONTEND=true`) integrados via PR [#189](https://github.com/ccesargarcia/luisices/pull/189) em `develop`.
