# Recuperação do HTTPS do domínio principal

`luisices.com.br` e `www.luisices.com.br` são servidos pelo GitHub Pages atrás da Cloudflare. A zona usa `Full (strict)`, então o GitHub Pages precisa apresentar um certificado válido à Cloudflare.

## Recuperação de certificado expirado

Na workflow manual **Cloudflare - Auditoria de Status Provisionado**, siga estas etapas:

1. Confere os quatro IPs oficiais do GitHub Pages no domínio raiz e o CNAME `www` para `ccesargarcia.github.io`. Se houver qualquer divergência, encerra antes de alterar DNS.
2. Execute `github-pages-dns-only`. A workflow desativa temporariamente o proxy somente nesses cinco registros e aguarda a propagação.
3. Em GitHub → Settings → Pages, remova e salve o domínio customizado; em seguida cadastre novamente `luisices.com.br` e aguarde o certificado ficar válido. Mantenha HTTPS obrigatório.
4. Execute `restore-github-pages-proxy`. A rotina só restaura o proxy quando a API do GitHub confirmar `https_certificate.state = issued` e testa os dois endereços por HTTPS.

Se o certificado não for emitido, mantenha os registros em DNS-only e revise a validação de domínio/CNAME antes de restaurar o proxy. A operação não altera `api.dev`, outros Workers, registros de email, conteúdo, regras SSL/TLS ou outros registros DNS.

## Permissões e credenciais

A auditoria padrão é somente leitura. As etapas DNS usam `CLOUDFLARE_API_TOKEN` já armazenado nos GitHub Actions Secrets para atualizar exclusivamente os cinco registros verificados. A reautorização do domínio é feita pela interface GitHub Pages, sem conceder permissões adicionais ao workflow. Tokens não são impressos nos logs.

## Verificação

Após a execução, confirme `https_certificate.state = issued` na configuração Pages e respostas HTTPS sem erro para `https://luisices.com.br` e `https://www.luisices.com.br`.
