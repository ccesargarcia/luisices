# Tarefas — github-pages-cert-recovery

- [x] **T1 — Diagnóstico (RF-1, CA-1):** identificar camada de falha e conferir DNS/Pages/TLS remotamente.
  - Evidência: `bad_authz`, TLS expirado e destinos Cloudflare correspondentes ao GitHub Pages observados.
- [x] **T2 — Recuperação delimitada (RF-2 a RF-5):** implementar workflow manual, restrição a cinco registros e restauração segura.
  - Evidência: commit `11bad77` colocou os cinco registros em DNS-only no workflow `44137573785`; commit `83e25fc` reconhece TLS direto e estado de certificado `approved`.
- [ ] **T3 — Validação final (CA-2 a CA-4):** restaurar proxy após validar certificado e comprovar HTTPS em apex e www.
  - Evidência parcial: certificado `approved` até 2027-02-15 e HTTPS direto válido; tentativa de restauração `44139321462` falhou ao consultar o endpoint Pages sem permissão; a rotina agora usará `pages: read`.
- [x] **T4 — Documentação e impacto de IA:** documentar procedimento e avaliar Gemini/MCP.
  - Evidência: runbook e spec registram ausência de impacto em ambos.
- [ ] **T5 — Fechamento:** registrar PR/commits e estado remoto após recuperação.
  - Evidência: preencher após execução do workflow.
