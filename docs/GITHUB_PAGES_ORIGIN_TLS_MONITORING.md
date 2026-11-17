# Monitoramento TLS da origem do GitHub Pages

O monitor HTTPS do domínio público verifica o certificado da borda Cloudflare. Ele não observa o certificado de origem que o GitHub Pages apresenta à Cloudflare no modo `Full (strict)`. Para cobrir essa camada, a workflow `Monitorar certificado de origem do GitHub Pages` consulta a API GitHub Pages e valida TLS direto em `luisices.com.br` e `www.luisices.com.br` contra os quatro IPs oficiais do Pages, usando SNI e validação de hostname.

A workflow executa diariamente às 09:17 UTC e também aceita execução manual. Ela não altera DNS ou configuração Pages. Certificado inválido ou com menos de 21 dias de validade causa falha da execução e envia `DOWN` ao Push configurado. Em sucesso, envia `UP` com a validade observada.

## Configuração do Uptime Kuma

Crie um monitor separado do tipo **Push**, por exemplo com o nome `GitHub Pages — certificado de origem`.

- **Heartbeat Interval:** `172800` segundos (48 horas). A execução é diária; a janela maior acomoda atrasos no agendamento.
- **Heartbeat Retry Interval:** `3600` segundos (1 hora).
- **Retries:** `1`, para confirmar a falta de heartbeat antes de declarar o monitor como indisponível.
- Ative o monitor e associe a notificação que deve receber alertas.

Copie a URL Push gerada no monitor e salve-a nos Actions Secrets do repositório com o nome `UPTIME_KUMA_PAGES_CERT_PUSH_URL`. A URL contém a credencial do monitor: não a inclua em commits, logs ou mensagens.

Depois que esta workflow estiver presente em `main`, execute-a manualmente na aba Actions e confirme `UP` no monitor Kuma. O monitor de borda Cloudflare permanece separado. Sem o Actions Secret, o probe TLS continua no GitHub Actions, mas não envia heartbeat ao Kuma.

## Verificações cobertas

- API GitHub Pages confirma domínio, estado `approved`/`issued` e pelo menos 21 dias de validade.
- TLS com SNI e certificado confiável para os dois domínios em todos os quatro IPs oficiais, totalizando oito pares host/IP.
- A recuperação manual também usa o mesmo probe direto, evitando que DNS em cache faça a validação passar pela Cloudflare.

Copiloto Gemini e MCP/ChatGPT não são afetados: esta é uma rotina de observabilidade de infraestrutura web, sem alteração de aplicação, API ou dados.
