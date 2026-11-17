# Plano de implementação — github-pages-cert-recovery

## Abordagem

Adicionar operações manuais e opt-in à workflow de auditoria existente. A rotina valida os destinos DNS e permite alterar temporariamente somente o proxy dos registros GitHub Pages. A reautorização do domínio é feita pela UI do GitHub Pages; uma segunda operação valida o certificado antes de restaurar o proxy. Um workflow independente monitora diariamente o certificado de origem diretamente nos quatro IPs oficiais do Pages, sem alterar DNS. Não conceder escrita Pages ao workflow nem alterar settings SSL/TLS globais.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Auditoria Cloudflare | `.github/workflows/audit-cloudflare.yml` | Adicionar operações manuais explícitas de DNS-only e restauração, mantendo escopo mínimo |
| Recuperação | `scripts/recover-github-pages-certificate.mjs`; `scripts/github-pages-origin-tls.mjs` | Conferir DNS, alternar proxy dos cinco registros, validar TLS/SNI diretamente nos oito pares host/IP e testar HTTPS público |
| Monitoramento de origem | `scripts/check-github-pages-origin-tls.mjs`; `scripts/github-pages-origin-tls.mjs`; `.github/workflows/monitor-github-pages-origin-tls.yml` | Consultar Pages API e sondar TLS/SNI dos dois hosts nos quatro IPs diariamente; notificar monitor Push do Kuma se configurado |
| Documentação | `docs/GITHUB_PAGES_CERT_RECOVERY.md`; `docs/README.md`; spec | Registrar falha observada, procedimento, escopo e permissões |

## Contratos, dados e compatibilidade

- APIs: chamadas administrativas apenas à API DNS Cloudflare e à API GitHub Pages; sem alteração em APIs do produto.
- Dados: sem mudança em dados Firebase ou conteúdo do site.
- Ambientes: produção website (`luisices.com.br`/`www`) somente; Dev, API, Beta e Workers permanecem fora do escopo.

## Segurança e integridade

- Cloudflare token é obtido de Actions Secret e nunca aparece em saída.
- Nenhum token de escrita do Pages é concedido ao workflow; a atualização do domínio é feita pela pessoa operadora na UI do GitHub.
- Validação rígida dos quatro destinos A e CNAME de `www`; em divergência, não altera nada.
- Certificado inválido impede a restauração do proxy; a política SSL não é reduzida.
- Recuperação e checagem usam o mesmo probe TLS direto para evitar resultado baseado em DNS cache/Cloudflare. O monitor testa oito pares host/IP e sinaliza validade inferior a 21 dias. Usa `pages: read`; não tem permissões de mutação DNS ou Pages.
- O monitor HTTP já existente observa a borda Cloudflare. O heartbeat Push separado observa o certificado da origem; o Push URL fica exclusivamente no Actions Secret `UPTIME_KUMA_PAGES_CERT_PUSH_URL`.

## UX e documentação

- UI: nenhuma.
- Documentos revisados: guia Cloudflare, fluxo de produção, README de docs e índice/spec de features.
- Copiloto (Gemini): sem impacto no produto ou nos contratos.
- MCP/ChatGPT: sem impacto em schema, ferramentas, escopos ou OAuth.
- Compatibilidade Copiloto/MCP: não aplicável; ambos permanecem inalterados.

## Validação e riscos

- `node --check scripts/recover-github-pages-certificate.mjs`
- Parse YAML do workflow.
- Verificação estrutural de host allowlist, condição manual e permissões.
- `npm run typecheck` obrigatório pela constituição; `node --check` no probe e validação estrutural do YAML agendado.
- Execução remota e ação manual na página Pages são necessárias para comprovar emissão; DNS-only expõe diretamente o endpoint Pages enquanto dura a emissão.
- Confirmação do heartbeat Kuma exige criar o monitor Push e cadastrar o secret no repositório.

## Reversão

O workflow de auditoria continua read-only por padrão. Para reverter a etapa DNS-only, use a opção de restaurar proxy somente se aceitar que HTTPS voltará ao erro 526. Se o código precisar ser removido, reverter os arquivos adicionados; não desfazer o estado DNS após cert válido.
