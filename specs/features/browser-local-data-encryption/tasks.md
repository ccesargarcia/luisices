# Tarefas — browser-local-data-encryption

- [x] **T1 — RF-1/RF-4:** Definir política universal e cifrar IndexedDB próprio de e-mail.
  - Evidência: `.agents/skills/luisices-platform-security/SKILL.md`, `specs/constitution.md`, `src/services/emailBodyCache.ts`.
- [x] **T2 — RF-2/RF-3/RF-5:** Desativar persistências SDK sem cifra e remover cache Firestore legado no bootstrap.
  - Evidência: `src/lib/firebase.ts`, `src/main.tsx`.
- [x] **T3 — RF-6:** Atualizar autenticação E2E para transportar sessão sem copiar banco IndexedDB.
  - Evidência: `tests/e2e/auth.setup.ts`, `tests/e2e/utils/auth.util.ts`.
- [x] **T4 — RF-7:** Atualizar specs, documentação viva e índices; avaliar Copiloto/MCP.
  - Evidência: arquivos desta pasta, `docs/FUNCIONALIDADES.md`, `docs/DEPENDENCIAS_E_ARQUITETURA.md`, README e índice de specs.
- [x] **T5 — Validação estática e fechamento local:** executar typecheck e registrar resultado; validação funcional no navegador permanece pendente.
  - Evidência: `npm run typecheck` passou; `git diff --check` passou; busca estática confirmou que o único IndexedDB de produto restante é `emailBodyCache`, que cifra conteúdo antes da gravação. Nenhum teste E2E ou deploy executado.
