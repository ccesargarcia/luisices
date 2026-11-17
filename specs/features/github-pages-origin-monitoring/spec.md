# Monitoramento TLS da origem do GitHub Pages

- **ID:** `github-pages-origin-monitoring`
- **Status:** PR isolada para `main` em preparação; heartbeat remoto pendente de validação
- **Referências:** `scripts/check-github-pages-origin-tls.mjs`, `scripts/github-pages-origin-tls.mjs`, `.github/workflows/monitor-github-pages-origin-tls.yml`, `docs/GITHUB_PAGES_ORIGIN_TLS_MONITORING.md`.

## Contexto e objetivo

O site está atrás da Cloudflare em `Full (strict)`. O monitor HTTPS usual observa o certificado da borda, enquanto a falha de produção ocorreu no certificado que o GitHub Pages apresenta à Cloudflare. A rotina adiciona uma verificação recorrente e alerta separado para a origem.

## Requisitos e critérios

- Consultar a API Pages usando apenas `pages: read` e validar domínio, estado do certificado e validade mínima de 21 dias.
- Testar TLS direto, com SNI e hostname verificado, para `luisices.com.br` e `www.luisices.com.br` nos quatro IPs oficiais do Pages.
- Rodar diariamente às 09:17 UTC e permitir execução manual; a rotina não altera DNS, settings Pages nem recursos Cloudflare.
- Enviar `UP`/`DOWN` a um monitor Push separado quando o Actions Secret `UPTIME_KUMA_PAGES_CERT_PUSH_URL` estiver definido; nunca registrar seu valor.
- Manter o monitor Cloudflare de borda sem alterações.

## Validação e estado

- O probe TLS confirmou localmente os oito pares host/IP e certificados válidos até 2027-02-15.
- `npm run typecheck`, sintaxe Node dos scripts, parse dos workflows e `git diff --check` passaram na implementação original; os checks da PR para `develop` também passaram.
- A alteração original foi mergeada em `develop`, mas `main` é o default e diverge por muitas mudanças não relacionadas. Esta promoção contém apenas os arquivos do monitor e documentação mínima.
- Após merge desta promoção em `main`, executar a workflow manualmente e confirmar `UP` no Kuma.

## Impacto de IA

Copiloto Gemini e MCP/ChatGPT não afetados; a mudança só verifica certificados e envia heartbeat de observabilidade.
