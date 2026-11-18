# Tarefas — password-reset-fallback-idempotency

- [x] **T1 — Chave compartilhada no cliente (RF-1, CA-1):** gerar a chave uma vez e encaminhar a mesma para Beta/GCP.
  - Evidência: teste do serviço compara o valor enviado ao Beta com o argumento da callable de fallback.
- [x] **T2 — Reserva transacional e estados (RF-2, RF-3, RF-4, CA-2, CA-3):** criar helper backend que persiste somente hash, status, timestamps e ID do Resend; deduplicar concluídas e bloquear incertas.
  - Evidência: testes unitários cobrem replay, concorrência, uncertain, retry antes do provedor e ausência de PII/chave bruta.
- [x] **T3 — Integração com a callable e Resend (RF-5, RF-6, RF-7, CA-4, CA-5):** aceitar chave opcional, compartilhar estado em Firestore e encaminhar chave derivada ao Resend.
  - Evidência: revisar teste/backend, preservação do caminho legado sem chave e resposta anti-enumeração.
- [x] **T4 — Validação técnica (CA-6):** typecheck, lint Functions, testes focados e diff-check.
  - Evidência: typecheck passou; lint validou 108 arquivos; 6 arquivos de teste passaram com 96 testes; `git diff --check` passou.
- [x] **T5 — Revisão documental e limites de publicação:** revisar docs/specs, impacto Gemini/MCP, link do catálogo e confirmar que nenhuma configuração/rota/deploy Beta foi alterada.
  - Evidência: spec/plano/tarefas e catálogo atualizados; Gemini/MCP sem impacto; diff limitado ao cliente, domínio `functions/users/`, testes e specs; `api/`, Cloudflare, workflows e `vercel.json` intactos.
- [x] **T6 — Fechamento:** concluir status depois de validação; sem deploy ou push implícito.
  - Evidência: implementação concluída localmente; nenhuma publicação remota ou alteração do estado publicado executada.
