# Tarefas — github-pages-cert-recovery

- [x] **T1 — Diagnóstico (RF-1, CA-1):** identificar camada de falha e conferir DNS/Pages/TLS remotamente.
  - Evidência: `bad_authz`, TLS expirado e destinos Cloudflare correspondentes ao GitHub Pages observados.
- [ ] **T2 — Recuperação delimitada (RF-2 a RF-5):** implementar workflow manual, restrição a cinco records e restauração segura.
  - Evidência: workflow validado; execução ainda não iniciada.
- [ ] **T3 — Validação final (CA-2 a CA-4):** emitir certificado, restaurar proxy e comprovar HTTPS em apex e www.
  - Evidência: cert remoto `issued`, HTTPS 2xx/3xx sem 526.
- [x] **T4 — Documentação e impacto de IA:** documentar procedimento e avaliar Gemini/MCP.
  - Evidência: runbook e spec registram ausência de impacto em ambos.
- [ ] **T5 — Fechamento:** registrar PR/commits e estado remoto após recuperação.
  - Evidência: preencher após execução do workflow.
