# Tarefas — github-pages-origin-monitoring

- [x] Implementar verificação diária da API Pages e TLS/SNI direto nos oito pares host/IP.
- [x] Criar monitor Push dedicado e cadastrar `UPTIME_KUMA_PAGES_CERT_PUSH_URL` em GitHub Actions Secrets (confirmado pelo operador).
- [x] Merge da PR de implementação em `develop` (`6a1ba082`).
- [x] Promover isoladamente o monitor para `main` (`549f406a`), sem as alterações não relacionadas de `develop`.
- [x] Executar workflow manual em `main`: execução `44145613031`, oito pares TLS válidos, heartbeat Kuma `UP` aceito.
- [x] Documentar o limite atual de 21 dias e o procedimento de resposta quando o Kuma ou a checagem indicarem `DOWN`.
- [x] Documentar possibilidade de mudança dos IPs e processo de revisão da fonte oficial.
