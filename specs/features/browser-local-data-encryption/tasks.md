# Tarefas — browser-local-data-encryption

- [x] **T1 — RF-1/RF-4:** Definir política universal e cifrar IndexedDB próprio de e-mail.
  - Evidência: `.agents/skills/luisices-platform-security/SKILL.md`, `specs/constitution.md`, `src/services/emailBodyCache.ts`.
- [x] **T2 — RF-2/RF-3/RF-5:** Desativar persistências SDK sem cifra e remover cache Firestore legado no bootstrap.
  - Evidência: `src/lib/firebase.ts`, `src/main.tsx`.
- [x] **T3 — RF-6:** Atualizar autenticação E2E para transportar sessão sem copiar banco IndexedDB.
  - Evidência: `tests/e2e/auth.setup.ts`, `tests/e2e/utils/auth.util.ts`.
- [x] **T4 — RF-7:** Atualizar specs, documentação viva e índices; avaliar Copiloto/MCP.
  - Evidência: arquivos desta pasta, `docs/FUNCIONALIDADES.md`, `docs/DEPENDENCIAS_E_ARQUITETURA.md`, README e índice de specs.
- [x] **T5 — Validação estática e deploy DEV/Beta:** executar typecheck, publicar conforme solicitação e registrar resultado; validação funcional autenticada no navegador permanece pendente.
  - Evidência: `npm run typecheck` e `git diff --check` passaram; busca estática confirmou que o único IndexedDB próprio restante cifra conteúdo antes da gravação. Deploy Firebase DEV `44457575451`, Vercel DEV/Beta `44457575322` e CodeQL `44457575318` passaram. Sem Functions/Cloudflare e sem E2E. Playwright não abriu porque Chromium não está instalado.
- [x] **T6 — Corrigir descrição da persistência Auth:** documentar `browserLocalPersistence` como localStorage cross-tab (não IndexedDB) e ligar a expiração por inatividade à spec dedicada.
  - Evidência: código revisado nesta mudança; validação de tipo ainda pendente.
