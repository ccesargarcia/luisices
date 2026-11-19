# Tarefas — email-body-local-cache

- [x] **T1 — RF-3/RF-4:** Criar cache IndexedDB cifrado com expiração, limites e fallback best effort.
  - Evidência: `src/services/emailBodyCache.ts`.
- [x] **T2 — RF-1/RF-2/RF-5:** Integrar consulta/gravação no carregamento de corpo e ações de leitura, resposta e cópia.
  - Evidência: `src/services/emailService.ts`, `src/app/pages/Emails.tsx`.
- [x] **T3 — RF-6:** Limpar dados e chaves em logout/mudança de conta.
  - Evidência: `src/contexts/AuthContext.tsx`.
- [x] **T4 — Validação/documentação:** Executar typecheck; conferir docs e links, além do impacto de Copiloto/MCP.
  - Evidência: `npm run typecheck` passou; documentação e skill registram AES-GCM, gestão de chave, limites e ameaça residual; Copiloto/MCP não afetados.
- [x] **T5 — Fechamento local:** Registrar limites, sem afirmar deploy.
  - Evidência: implementação estática concluída; validação funcional no navegador e publicação permanecem pendentes.
