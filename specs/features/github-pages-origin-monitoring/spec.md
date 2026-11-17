# Monitoramento TLS da origem do GitHub Pages

- **ID:** `github-pages-origin-monitoring`
- **Status:** Monitor ativo em `main`; follow-up de runbook e IP drift pendente de revisão
- **Referências:** `scripts/check-github-pages-origin-tls.mjs`, `scripts/github-pages-origin-tls.mjs`, `.github/workflows/monitor-github-pages-origin-tls.yml`, `docs/GITHUB_PAGES_ORIGIN_TLS_MONITORING.md`.

## Contexto e objetivo

O site está atrás da Cloudflare em `Full (strict)`. O monitor HTTPS usual observa o certificado da borda, enquanto a falha de produção ocorreu no certificado que o GitHub Pages apresenta à Cloudflare. A rotina adiciona uma verificação recorrente e alerta separado para a origem.

## Requisitos e critérios

- Consultar a API Pages usando apenas `pages: read` e validar domínio, estado do certificado e validade mínima de 21 dias.
- Testar TLS direto, com SNI e hostname verificado, para `luisices.com.br` e `www.luisices.com.br` nos quatro IPs oficiais do Pages.
- Rodar diariamente às 09:17 UTC e permitir execução manual; a rotina não altera DNS, settings Pages nem recursos Cloudflare.
- Enviar `UP`/`DOWN` a um monitor Push separado quando o Actions Secret `UPTIME_KUMA_PAGES_CERT_PUSH_URL` estiver definido; nunca registrar seu valor.
- Manter o monitor Cloudflare de borda sem alterações.
- Documentar que a lista de quatro IPs é fixa no código e pode mudar; definir a conferência periódica com a lista oficial do GitHub e os passos para atualizar DNS e monitor sem copiar ranges históricos da API Meta.

## Validação e estado

- O probe TLS confirmou localmente e no workflow os oito pares host/IP; execução `44145613031` enviou heartbeat `UP`; certificado válido até 2027-02-15 (89 dias restantes em 2026-11-17).
- `npm run typecheck`, sintaxe Node dos scripts, parse dos workflows e `git diff --check` passaram na implementação original; os checks da PR para `develop` também passaram.
- A implementação original foi mergeada em `develop` e a promoção isolada em `main` pelo merge commit `549f406a`; nenhuma outra mudança de `develop` foi incluída.
- O workflow manual e agendado está ativo em `main`; a primeira execução confirmou `UP` no Kuma.
- A atualização da lista publicada de IPs exige revisão humana antes de alterar os quatro A; `www` continua por CNAME.

## Impacto de IA

Copiloto Gemini e MCP/ChatGPT não afetados; a mudança só verifica certificados e envia heartbeat de observabilidade.
