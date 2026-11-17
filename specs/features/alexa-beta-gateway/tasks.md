# Tarefas — alexa-beta-gateway

- [x] **T1 — Spec e segurança (RF-1 a RF-8):** confirmar fronteira entre painel e webhook de voz, contratos, atores e permissões.
  - Evidência: spec e plano revisados contra handler, callables, serviço cliente, Worker e documentação Alexa; verificações granulares permanecem no módulo `functions/alexa/callables.js`.
- [x] **T2 — Worker Beta (RF-1, RF-2, RF-6):** allowlist POST, forwarding de bearer/body/segredo, 405, 429 e preflight.
  - Evidência: testes Worker passaram; [workflow Beta](https://github.com/ccesargarcia/luisices/actions/runs/43987633541) concluiu com sucesso e `POST /api/alexa` sem sessão no gateway retornou 401 antes da fase Vercel.
- [x] **T3 — Guard e cliente Beta (RF-3, RF-4, RF-5, RF-7):** segredo antes do Firebase Admin; cliente aponta para `api.beta`; dispatch e fallback preservados.
  - Evidência: testes de handler/cliente passaram; sessão e ação continuam delegadas aos mesmos callables. O serviço e dispatcher GCP não foram alterados.
- [x] **T4 — Qualidade local (CA-1 a CA-4):** typecheck, build, testes focados e diff check.
  - Evidência: typecheck/build passaram; 50 testes em 8 arquivos passaram; `git diff --check` passou. Nenhum arquivo do webhook Alexa foi alterado.
- [x] **T5 — Revisão documental e IA:** sincronizar guia Beta, runbook, catálogo e impactos Copiloto/MCP/Alexa.
  - Evidência: guia, runbook e catálogo atualizados; Copiloto/Gemini e MCP/ChatGPT sem impacto; endpoint de voz Alexa permanece separado.
- [x] **T6 — Deploy e verificação Beta (CA-5, CA-6):** publicar Worker, validar, publicar Vercel/cliente e confirmar isolamento Dev.
  - Evidência: Worker [publicado](https://github.com/ccesargarcia/luisices/actions/runs/43987633541), Vercel [publicada](https://github.com/ccesargarcia/luisices/actions/runs/43987891619); requests 401/403/204/405 conforme spec. Worker Dev e Functions Dev ficaram `skipped`; Firebase Hosting Dev publicou o frontend; `api.dev` não foi alterada.
- [ ] **T7 — Validação manual (CA-7):** abrir Configurações → Alexa no Beta e consultar status com uma sessão autorizada.
  - Evidência: confirmação do usuário de que a leitura `getStatus` funciona; não alterar permissões nem bindings durante a validação.
