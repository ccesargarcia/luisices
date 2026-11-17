# Tarefas — github-pages-origin-monitoring

- [x] Implementar verificação diária da API Pages e TLS/SNI direto nos oito pares host/IP.
- [x] Criar monitor Push dedicado e cadastrar `UPTIME_KUMA_PAGES_CERT_PUSH_URL` em GitHub Actions Secrets (confirmado pelo operador).
- [x] Merge da PR de implementação em `develop` (`6a1ba082`).
- [x] Preparar promoção isolada para `main`, evitando os 63 commits adicionais de `develop`.
- [ ] Revisar e mergear PR de promoção para `main`.
- [ ] Executar workflow manual após estar em `main` e confirmar heartbeat `UP` no Uptime Kuma.
