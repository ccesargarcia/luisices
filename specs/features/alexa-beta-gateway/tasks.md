# Tarefas — alexa-beta-gateway

- [x] **T1 — Spec e segurança (RF-1 a RF-8):** confirmar fronteira entre painel e webhook de voz, contratos, atores e permissões.
  - Evidência: spec e plano revisados contra handler, callables, serviço cliente, Worker e documentação Alexa; verificações granulares permanecem no módulo `functions/alexa/callables.js`.
- [x] **T2 — Worker Beta (RF-1, RF-2, RF-6):** allowlist POST, forwarding de bearer/body/segredo, 405, 429 e preflight.
  - Evidência: testes Worker passaram; [workflow Beta](https://github.com/ccesargarcia/luisices/actions/runs/43987633541) concluiu com sucesso e `POST /api/alexa` sem sessão no gateway retornou 401 antes da fase Vercel.
- [ ] **T3 — Guard e cliente Beta (RF-3, RF-4, RF-5, RF-7):** segredo antes do Firebase Admin; cliente aponta para `api.beta`; dispatch e fallback preservados.
  - Evidência: testes do handler/cliente e testes existentes de autorização Alexa.
- [ ] **T4 — Qualidade local (CA-1 a CA-4):** typecheck, build, testes focados e diff check.
  - Evidência: registrar resultados exatos; confirmar que webhook Alexa não mudou.
- [ ] **T5 — Revisão documental e IA:** sincronizar guia Beta, runbook, catálogo e impactos Copiloto/MCP/Alexa.
  - Evidência: links e afirmações de roteamento revisados; registrar integrações de IA sem impacto.
- [ ] **T6 — Deploy e verificação Beta (CA-5, CA-6):** publicar Worker, validar, publicar Vercel/cliente e confirmar isolamento Dev.
  - Evidência: links de workflows e respostas remotas; deploys Dev skip e `api.dev` intocado.
