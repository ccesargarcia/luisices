# Recuperação do HTTPS do domínio principal

`luisices.com.br` e `www.luisices.com.br` são servidos pelo GitHub Pages atrás da Cloudflare. A zona usa `Full (strict)`, então o GitHub Pages precisa apresentar um certificado válido à Cloudflare.

## Recuperação de certificado expirado

Na workflow manual **Cloudflare - Auditoria de Status Provisionado**, siga estas etapas:

1. Confere os quatro IPs oficiais do GitHub Pages no domínio raiz e o CNAME `www` para `ccesargarcia.github.io`. Se houver qualquer divergência, encerra antes de alterar DNS.
2. Execute `github-pages-dns-only`. A workflow desativa temporariamente o proxy somente nesses cinco registros e aguarda a propagação.
3. Em GitHub → Settings → Pages, remova e salve o domínio customizado; em seguida cadastre novamente `luisices.com.br` e aguarde a emissão do certificado. Mantenha HTTPS obrigatório.
4. Execute `restore-github-pages-proxy`. A rotina exige estado `approved` ou `issued`, validade futura e TLS válido diretamente nos quatro IPs do Pages para apex e www, com SNI e validação de hostname. Isso impede que DNS em cache faça a validação passar pela borda Cloudflare. Depois testa o HTTPS público pela Cloudflare.

Se o certificado não for emitido, mantenha os registros em DNS-only e revise a validação de domínio/CNAME antes de restaurar o proxy. A operação não altera `api.dev`, outros Workers, registros de email, conteúdo, regras SSL/TLS ou outros registros DNS.

## Monitoramento do certificado de origem no Uptime Kuma

O monitor HTTPS existente da Cloudflare acompanha o certificado apresentado na borda. Como o Cloudflare termina TLS para visitantes, esse monitor não verifica o certificado que o GitHub Pages apresenta à Cloudflare em `Full (strict)`. O workflow [`monitor-github-pages-origin-tls.yml`](../.github/workflows/monitor-github-pages-origin-tls.yml) faz essa verificação separadamente todos os dias às 09:17 UTC e também pode ser executado manualmente.

A checagem consulta o estado/expiração informado pela API Pages e abre conexões TLS diretas, com SNI e validação de hostname, para os dois domínios contra cada um dos quatro IPs oficiais do Pages. Falha se algum certificado não validar ou tiver menos de 21 dias restantes. Assim, um certificado incorreto em apenas um IP também é detectado.

Para encaminhar o resultado ao Uptime Kuma:

1. Crie um monitor dedicado do tipo **Push** no Kuma, com intervalo de heartbeat de 24 horas e tolerância suficiente para atrasos do agendamento (recomendação: 48 horas).
2. Copie a URL Push gerada pelo próprio Kuma e cadastre-a nos GitHub Actions Secrets do repositório como `UPTIME_KUMA_PAGES_CERT_PUSH_URL`. Não coloque a URL em arquivos, logs ou documentação, pois ela contém a credencial do monitor.
3. Execute manualmente a workflow **Monitorar certificado de origem do GitHub Pages** e confirme o heartbeat `UP` no monitor Push. O monitor Cloudflare existente permanece independente.

Sem esse secret a verificação técnica ainda executa, mas apenas registra um aviso na execução do GitHub Actions e não atualiza o Kuma. A falha da checagem envia estado `DOWN` ao Push, quando configurado, e falha a execução do workflow para também gerar alerta no GitHub.

## Permissões e credenciais

A auditoria padrão é somente leitura. As etapas DNS usam `CLOUDFLARE_API_TOKEN` já armazenado nos GitHub Actions Secrets para atualizar exclusivamente os cinco registros verificados. A reautorização do domínio é feita pela interface GitHub Pages. A workflow recebe somente `pages: read` para conferir o certificado antes de restaurar o proxy; usa o `GITHUB_TOKEN` efêmero e não imprime credenciais.

A workflow diária de monitoramento usa `pages: read` e `contents: read`; não altera DNS nem configuração Pages. O segredo de Push do Kuma é usado apenas para publicar o heartbeat e não é impresso.

## Verificação

Após a execução, confirme `https_certificate.state = approved` ou `issued`, `https_enforced = true` e respostas HTTPS sem erro para `https://luisices.com.br` e `https://www.luisices.com.br`.
