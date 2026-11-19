# Tarefas — cross-tab-session-idle-timeout

- [x] **T1 — RF-1/RF-3/RF-4:** implementar persistência compartilhada e guarda cross-tab com expiração e logout sincronizado.
  - Evidência: `src/lib/firebase.ts`, `src/contexts/AuthContext.tsx`, `src/services/sessionInactivityService.ts`.
- [x] **T2 — RF-2/RF-5/RF-6:** adicionar opção global na tela de configurações, incluindo “Desativado — sem limite”, e salvar preferência por conta.
  - Evidência: `src/app/components/settings/SessionSecuritySection.tsx`, `src/app/pages/Settings.tsx`, `src/services/firebaseSettingsService.ts`.
- [x] **T3 — CA-6:** manter padrão de 30 minutos para configurações ausentes/inválidas.
  - Evidência: `normalizeSessionIdleTimeout` em `src/services/sessionInactivityService.ts`.
- [x] **T4 — Validação:** executar typecheck e revisão estática dos cenários de 0/15/30/60.
  - Evidência: `npm run typecheck` e `git diff --check` passaram; revisão de código cobre valor 0, opções válidas, fallback 30, atividade por BroadcastChannel/storage e atualização do setting em tempo real. Navegador autenticado ainda não foi validado.
- [x] **T5 — Revisão documental e impacto de IA:** corrigir documentação divergente, registrar riscos e conferir links; Copiloto/MCP sem impacto.
  - Evidência: `spec.md`, `plan.md`, spec `browser-local-data-encryption`, skill de segurança, docs de arquitetura/funcionalidades e `README.md` revisados.
- [x] **T6 — Fechamento:** registrar estado e evidências de publicação; a validação autenticada continua pendente.
  - Evidência: commit `73152d1` em `develop`; Firebase DEV `44459828519`, Vercel Beta `44459827732` e CodeQL `44459827638` passaram; DEV e Beta retornaram HTTP 200. Nenhum deploy de Worker Cloudflare ou produção foi executado.
