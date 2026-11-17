# Tarefas — github-pages-cert-recovery

- [x] **T1 — Diagnóstico (RF-1, CA-1):** identificar camada de falha e conferir DNS/Pages/TLS remotamente.
  - Evidência: `bad_authz`, TLS expirado e destinos Cloudflare correspondentes ao GitHub Pages observados.
- [x] **T2 — Recuperação delimitada (RF-2 a RF-5):** implementar workflow manual, restrição a cinco registros e restauração segura.
  - Evidência: commit `11bad77` colocou os cinco registros em DNS-only no workflow `44137573785`; commit `83e25fc` reconhece TLS direto e estado de certificado `approved`.
- [x] **T3 — Validação final (CA-2 a CA-4):** restaurar proxy após validar certificado e comprovar HTTPS em apex e www.
  - Evidência: certificado `approved` até 2027-02-15, `https_enforced=true`; workflow `44139755587` restaurou proxy; apex HTTP 200 e www 301→apex HTTP 200; DNS público voltou a resolver IPs Cloudflare, sem erro 526.
- [x] **T4 — Documentação e impacto de IA:** documentar procedimento e avaliar Gemini/MCP.
  - Evidência: runbook e spec registram ausência de impacto em ambos.
- [x] **T5 — Fechamento da recuperação:** commits `11bad77`, `83e25fc`, `63bd83a` publicados na branch `fix/github-pages-production-certificate`; recuperação remota concluída.
- [x] **T6 — Monitoramento separado da origem (CA-5, CA-6):** adicionar workflow diária de Pages API e probes TLS diretos, além de instruções para o Uptime Kuma Push.
  - Evidência local: `scripts/check-github-pages-origin-tls.mjs`, workflow diária às 09:17 UTC, validação TLS/SNI de oito pares host/IP e limite de alerta de 21 dias. A integração Kuma fica aguardando cadastrar o monitor Push e Actions Secret.
  - Impacto IA: Gemini e MCP/ChatGPT sem impacto; somente observabilidade da origem do site público.
