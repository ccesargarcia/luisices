# Tarefas — ai-chat-beta-gateway

- [x] **T1 — RF-1/RF-2:** adicionar rota Beta e limite incremental de corpo de chat.
  - Evidência: `tests/unit/api-beta-worker.test.ts`, 19 testes passaram, incluindo corpo acima de 4 MiB.
- [x] **T2 — RF-4:** proteger origem Vercel antes de preflight e autenticação.
  - Evidência: `tests/unit/ai-chat-api-origin.test.ts`, 2 testes passaram com 403 direto.
- [x] **T3 — RF-3/RF-5:** conectar cliente Beta e habilitar fallback específico.
  - Evidência: `tests/unit/backend-routing.test.ts`; somente erro específico é elegível, `resource-exhausted` e erros de negócio não.
- [x] **T4 — Validação:** executar typecheck e testes focados.
  - Evidência: `npm run typecheck` passou; Vitest focado: 3 arquivos, 23 testes passaram.
- [x] **T5 — Revisão documental e impacto de IA:** revisar docs, links e registrar impacto Copiloto/MCP.
  - Evidência: guias atualizados; Copiloto impactado em roteamento, MCP/ChatGPT sem mudança de contrato.
- [x] **T6 — Implantação fase 1:** publicar Worker Beta isolado e validar rota sem credencial do usuário.
  - Evidência: workflow [43992768696](https://github.com/ccesargarcia/luisices/actions/runs/43992768696) passou; `POST` remoto 401, `GET` 405 e `OPTIONS` 204.
- [ ] **T7 — Implantação fase 2:** publicar Vercel Beta e validar bloqueio da origem e gateway.
  - Evidência: workflows verdes, origem 403, gateway 401/405/OPTIONS 204.
- [ ] **T8 — Fechamento:** validar o Copiloto autenticado com texto e imagem e registrar status.
  - Evidência: confirmação do usuário; `api.dev` não foi alterada.
