# Plano — github-pages-origin-monitoring

## Escopo da promoção

Publicar em `main` somente o monitor de certificado da origem e sua documentação operacional. Não promover `develop` por inteiro: ele contém dezenas de commits de Beta e produto que não fazem parte desta entrega.

| Arquivo | Finalidade |
|---|---|
| `.github/workflows/monitor-github-pages-origin-tls.yml` | Agendamento diário, execução manual e permissão `pages: read` |
| `scripts/check-github-pages-origin-tls.mjs` | Consultar Pages API, sondar origem e enviar heartbeat Kuma |
| `scripts/github-pages-origin-tls.mjs` | Compartilhar prova TLS direta entre monitor e recuperação |
| `docs/GITHUB_PAGES_ORIGIN_TLS_MONITORING.md` e índice | Operação e configuração do Push |
| Esta spec e índice | Requisitos, evidências e status da promoção |

## Segurança e compatibilidade

- O segredo Push existe apenas em GitHub Actions Secrets; o workflow não imprime URL.
- `GITHUB_TOKEN` tem somente `contents: read` e `pages: read`.
- Nenhum deploy frontend/Cloudflare, alteração DNS, alteração de `api.dev`, mudança Gemini ou mudança MCP está no escopo.
- A verificação usa conexões TLS para IPs fixos com SNI e hostname validado, não depende do DNS Cloudflare.

## Verificação

- `npm run typecheck`, `node --check` nos scripts e parse YAML.
- CI da PR isolada para `main`.
- Após merge em `main`, execução manual da workflow e validação do heartbeat `UP` no monitor Push.
