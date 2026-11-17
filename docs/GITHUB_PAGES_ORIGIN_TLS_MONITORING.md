# Monitoramento TLS da origem do GitHub Pages

O monitor HTTPS do domínio público verifica o certificado da borda Cloudflare. Ele não observa o certificado de origem que o GitHub Pages apresenta à Cloudflare no modo `Full (strict)`. Para cobrir essa camada, a workflow `Monitorar certificado de origem do GitHub Pages` consulta a API GitHub Pages e valida TLS direto em `luisices.com.br` e `www.luisices.com.br` contra os quatro IPs oficiais do Pages, usando SNI e validação de hostname.

A workflow executa diariamente às 09:17 UTC e também aceita execução manual. Ela não altera DNS ou configuração Pages. Certificado inválido ou com menos de 21 dias de validade causa falha da execução e envia `DOWN` ao Push configurado. Em sucesso, envia `UP` com a validade observada.

## Regra do alerta e prazo de resposta

O limite atual é **menos de 21 dias completos de validade**. Não há aviso prévio aos 30 dias: quando o limite é cruzado, o workflow falha e envia `DOWN`. Falha ao consultar a API Pages, domínio inesperado, estado diferente de `approved`/`issued`, erro de TLS, hostname inválido ou qualquer um dos oito pares host/IP com validade abaixo do limite também gera `DOWN`. O monitor Push ainda pode ficar `DOWN` se não receber heartbeat por cerca de 48 horas mais a tentativa de 1 hora configurada no Kuma.

Ao receber `DOWN`:

1. Abra a execução mais recente de **Monitorar certificado de origem do GitHub Pages** e identifique a causa e, em erro TLS, o hostname/IP. Execute a workflow manualmente uma vez para descartar falha transitória do runner/rede. Se a nova execução passar, registre como transitório e acompanhe a próxima execução diária; se repetir, prossiga imediatamente.
2. Se a causa for validade abaixo de 21 dias, estado Pages inválido ou erro TLS persistente, trate como incidente de certificado e inicie a recuperação no mesmo dia. Confirme que a zona continua em `Full (strict)` e que os únicos destinos do site são os quatro A abaixo no apex e o CNAME de `www`:
   - Apex A: `185.199.108.153`, `185.199.109.153`, `185.199.110.153` e `185.199.111.153`.
   - `www` CNAME: `ccesargarcia.github.io`.
3. No painel DNS Cloudflare, altere para **DNS only** somente esses cinco registros. Não altere `api.dev`, outros hostnames nem a configuração SSL/TLS.
4. Em GitHub → repositório → Settings → Pages, remova `luisices.com.br`, salve, cadastre novamente o domínio e mantenha **Enforce HTTPS** ativado. Aguarde a API Pages indicar `approved` ou `issued` e um novo prazo de validade.
5. Execute manualmente o monitor de origem. Só considere a emissão validada quando a API reportar o certificado esperado e o TLS direto passar nos dois hostnames contra todos os quatro IPs.
6. Volte ao DNS Cloudflare e reative proxy somente nos mesmos quatro A e no CNAME `www`. Confirme HTTPS público no apex e em `www`, o monitor da borda Cloudflare `UP` e a zona ainda em `Full (strict)`.

Se o passo 5 falhar, mantenha os cinco registros em DNS only e investigue a validação/domínio Pages; não restaure o proxy enquanto a origem não validar. A workflow `Cloudflare - Auditoria de Status Provisionado` disponível em `main` é **somente leitura**. A automação que alterna esses cinco proxies foi mergeada apenas em `develop`; até sua promoção, a mudança DNS de recuperação deve ser manual no painel Cloudflare.

## Mudança dos IPs publicados pelo GitHub

Os quatro IPs do apex são uma lista fixa no código e correspondem aos endereços que a documentação do GitHub Pages recomenda hoje. Eles podem mudar; o monitor não consulta a documentação em tempo real e não detecta uma alteração publicada enquanto os endereços antigos continuarem servindo um certificado válido. O CNAME `www` é menos sensível a mudanças de IP, segundo o GitHub.

Revise os destinos ao menos mensalmente e sempre que os probes apresentarem falhas persistentes ou o GitHub anunciar mudança. Compare com a lista de A records em [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site); consulte também [`GET https://api.github.com/meta`](https://api.github.com/meta) como sinal complementar. **Não copie todo o campo `pages` da API Meta para o DNS**: ele lista ranges adicionais além dos quatro A recomendados atualmente para o apex.

Quando a lista recomendada mudar, atualize `GITHUB_PAGES_IPS` em `scripts/github-pages-origin-tls.mjs`, ajuste somente os quatro A do apex na Cloudflare ao executar uma mudança aprovada, e registre a nova lista e a data nesta documentação. Preserve o CNAME `www`, os demais registros e `Full (strict)`. Execute a workflow manualmente e confirme os oito pares hostname/IP antes de considerar a atualização concluída.

**Última conferência da fonte oficial:** 2026-11-17. A documentação de domínios GitHub Pages lista os quatro A acima; `www` aponta ao CNAME do GitHub Pages e não depende desses IPs.

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
- O monitor usa IPs fixos e conexão TLS direta; DNS em cache da Cloudflare não mascara falha de certificado na origem.

Copiloto Gemini e MCP/ChatGPT não são afetados: esta é uma rotina de observabilidade de infraestrutura web, sem alteração de aplicação, API ou dados.
