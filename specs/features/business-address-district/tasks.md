# Tarefas — business-address-district

- [x] **T1 — RF-1: adicionar campo de bairro ao negócio:** integrar modelo, formulário, carregamento, persistência e reset.
  - Evidência: `BusinessInfoSection.tsx`, `Settings.tsx`, `firebaseSettingsService.ts`.
- [x] **T2 — RF-2: preencher bairro pelo CEP:** mapear o retorno ViaCEP sem apagar valor atual quando `bairro` estiver ausente.
  - Evidência: `BusinessInfoSection.tsx`.
- [x] **T3 — RF-3: usar bairro na etiqueta:** aplicar a configuração no formulário e reforçar a preferência server-side.
  - Evidência: `SuperfreteGenerateLabelDialog.tsx`, `functions/orders/superfrete.js`.
- [x] **T4 — Documentação:** atualizar guia, catálogo e registrar impactos Copiloto/MCP.
  - Evidência: `docs/FUNCIONALIDADES.md`, `specs/features/README.md`, esta spec.
- [x] **T5 — Validação e deploy:** typecheck, lint Functions, diff check e confirmar CI Firebase Dev/Vercel; Worker Cloudflare deve continuar sem deploy.
  - Evidência: validações locais passaram; Firebase Dev `44427416678`, Vercel Dev/Beta `44427416604` e CodeQL `44427416761` concluídos com sucesso; Workers ignorados.
