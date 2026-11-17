# Renovação assistida do certificado do site de produção

- **ID:** `github-pages-cert-recovery`
- **Status:** Em andamento
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-17
- **Referências:** `scripts/recover-github-pages-certificate.mjs`; `.github/workflows/audit-cloudflare.yml`; `docs/GITHUB_PAGES_CERT_RECOVERY.md`.

## Problema e contexto

Em 2026-11-17, `luisices.com.br` e `www.luisices.com.br` retornaram Cloudflare 526. A API oficial do GitHub Pages informou `https_certificate.state = bad_authz`, certificado com expiração em 2026-11-17 e descrição indicando reinício da autorização ACME. Uma conexão direta aos IPs oficiais do GitHub Pages apresentou certificado Let's Encrypt expirado às 06:12:09 UTC. `api.luisices.com.br` e `beta.luisices.com.br` responderam normalmente. O DNS observado aponta aos IPs/CNAME corretos do Pages, mas todos os cinco registros estavam proxied e a zona opera em `Full (strict)`.

## Objetivos

- Reiniciar a emissão automática do certificado do GitHub Pages com exposição mínima e delimitada do DNS.
- Restaurar o proxy Cloudflare e validar HTTPS quando o certificado for emitido.
- Preservar todos os demais hosts, principalmente `api.dev`.

## Fora de escopo

- Mudar conteúdo, build, workflow de publicação do site, configurações SSL/TLS globais ou qualquer hostname além do apex e `www`.
- Alterar `api.dev`, outros Workers, Firebase, Vercel ou registros de email.
- Tornar a renovação do GitHub Pages dependente de uma rotina recorrente própria; esta rotina é apenas uma recuperação manual para falhas de autorização.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Operador com acesso a Actions | Disparar a operação manual de recuperação | Não consegue selecionar outros domínios ou registros |
| Workflow | Alternar proxy nos quatro A do apex e CNAME `www`; reiniciar autorização Pages | Exige correspondência exata de destinos e token Cloudflare secreto; não imprime credenciais |

## Requisitos funcionais

- **RF-1:** comparar os registros apex e `www` com os destinos esperados do GitHub Pages e abortar sem mutações se não coincidirem.
- **RF-2:** alterar temporariamente apenas o estado proxied desses quatro A e um CNAME para DNS-only.
- **RF-3:** confirmar DNS público DNS-only; a pessoa operadora reinicia a autorização removendo e cadastrando novamente o domínio em Settings → Pages.
- **RF-4:** restaurar o proxy apenas após a API pública confirmar certificado emitido e não expirado; verificar HTTPS nos dois hosts.
- **RF-5:** impedir restauração do proxy enquanto o certificado não for válido e relatar o estado sem tocar em outros registros.

## Critérios de aceitação

- **CA-1:** destinos DNS inesperados impedem qualquer mutação.
- **CA-2:** somente os quatro A do domínio raiz e o CNAME `www` mudam temporariamente para DNS-only.
- **CA-3:** `api.dev`, API, Beta, Workers, email e SSL/TLS global não são alterados.
- **CA-4:** a etapa de restauração só prossegue depois de o GitHub confirmar certificado válido; resultado final requer HTTPS funcional nos dois hosts.

## Requisitos não funcionais e integridade

- Segurança: Cloudflare token vem de Actions Secret; workflow recebe apenas `pages: read`, não escrita; logs não podem imprimir credenciais.
- Integridade: destinos, nomes e contagem de registros são verificados antes das atualizações; operação repetida é segura.
- Disponibilidade: durante DNS-only e emissão, o site pode permanecer inacessível por HTTPS; a política SSL do Cloudflare não é reduzida.
- Compatibilidade: sem alteração de aplicativo, APIs, dados, Copiloto Gemini ou MCP/ChatGPT.

## Impacto na documentação

- Guias revisados: runbook Cloudflare, workflow de auditoria e documentação operacional do release.
- Gemini: não afetado; o fluxo só recupera o TLS do site público.
- MCP/ChatGPT: não afetado; nenhum domínio de API ou contrato OAuth é alterado.
- Diferenças Gemini/MCP: não aplicável.

## Decisões e dúvidas

- **Confirmado:** o host principal usa GitHub Pages, Cloudflare está em Full Strict e a API GitHub Pages reporta `bad_authz` com certificado expirado.
- **Confirmado:** DNS Cloudflare vigente apontava os destinos corretos do Pages, com proxy ativo no apex e `www`.
- **Confirmado:** a rotina separa a etapa DNS-only da restauração, que exige certificado válido; a remoção e readição do domínio ficam na interface Pages. A checagem do certificado usa somente `pages: read`.

## Validação

- Comparar o DNS live com os destinos esperados antes da operação.
- Verificar a configuração e estado do certificado via API GitHub Pages antes de restaurar o proxy.
- Revalidar `curl -I` para apex e `www` após restaurar o proxy.
- Validar sintaxe JS e YAML antes de executar o workflow.

## Evidências de conclusão

- A API Pages retornou `bad_authz`, domínios `luisices.com.br` e `www.luisices.com.br`, expiração 2026-11-17.
- TLS direto para `185.199.108.153` apresentou certificado Let's Encrypt expirado em 2026-11-17 06:12:09 UTC.
- Cloudflare audit run `44133050217` confirmou SSL Full Strict e proxy ativo nos cinco registros; workflow `44137573785` confirmou DNS-only; workflow `44139321462` não restaurou proxy porque faltava permissão de leitura Pages. A política SSL continua Full Strict.
