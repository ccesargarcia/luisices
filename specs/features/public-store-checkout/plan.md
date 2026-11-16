# Plano — public-store-checkout

## Abordagem

Manter o fluxo de negócio e acrescentar um gateway Cloudflare para as rotas selecionadas da Vercel Beta, com rate limit de borda e autenticação entre Worker e origem Vercel.

## Componentes existentes

| Área | Arquivos/guias | Papel atual |
|---|---|---|
| Vitrine/checkout | `src/app/pages/PublicCatalog.tsx` | Catálogo, sacola, observações, chave de tentativa, confirmação e link de WhatsApp. |
| Serviço de catálogo | `src/services/firebaseCatalogOrderService.ts` | Callables públicas, leitura/gestão de `catalogOrders` e conversão para pedido interno. |
| Projeção pública | `functions/orders/catalog.js` | Leitura allowlist com cache de produção. |
| Submissão pública | `functions/orders/index.js` | Validação server-side, rate limiting, idempotência e gravação transacional de `catalogOrders`. |
| Limites | `functions/common/rateLimiters.js` | Limitador de memória para checkout público. |
| Acesso | `firestore.rules` | Regras de configurações, produtos e histórico de encomendas. |
| Operação | `src/app/pages/StoreOrders.tsx` | Acompanhamento, mudança de status, exclusão e conversão. |
| Regressão | `tests/unit/public-checkout-callable.test.ts`, `tests/unit/security-hardening.test.ts`, `tests/e2e/store-checkout.spec.ts` | Preço oficial, payload persistido, limites e jornada de checkout. |

## Contratos, dados e compatibilidade

- Nenhum contrato de payload, resposta ou dado persistido muda nesta entrega.
- As URLs de transporte do Beta mudam para `api.beta.luisices.com.br` nas rotas de submissão pública e acompanhamento.
- O gateway Beta deve ser implantado em Worker próprio (`functions-beta`); sua automação só pode atualizar a associação de `api.beta`, sem executar deploy ou alteração DNS/rota em `api.dev` (`functions-dev`).
- `x-beta-edge-secret` é interno Worker→Vercel; o navegador não o envia e o Worker substitui qualquer valor recebido pelo segredo configurado.
- Preservar nomes de callables, formato de resposta e status persistidos.
- O payload público é minimizado e não contém identificação de contato; conversão coleta esses dados no painel.
- Separar em specs futuras mudanças de `storeSettings`, catálogo, rate limit distribuído/edge e atendimento externo.

## Segurança e integridade

- Preço e disponibilidade são reconsultados no servidor; não confiar em valores enviados pelo browser.
- A criação direta de `catalogOrders` continua negada nas Rules.
- O Worker aplica 30 req/min por caminho/IP usando o namespace Dev existente; o limiter é aproximado por localidade. O limitador backend do checkout continua ativo.
- Secrets `DEV_ORIGIN_SECRET` (ou `ORIGIN_SECRET`) são necessários. Os handlers Vercel falham fechado quando `BETA_VERCEL_ORIGIN_SECRET` não está configurado.
- Não incluir segredos, IPs reais, dados de clientes ou logs contendo PII.
- Consultar `luisices-platform-security` e `luisices-cloudflare` em implementação futura que altere o endpoint ou sua proteção.

## UX e documentação

- A mensagem de sucesso representa confirmação de registro no backend e disponibilização do link; não significa WhatsApp enviado nem pagamento/compra confirmados.
- `docs/VERCEL_BETA_ROUTING.md` registra o domínio, limites, proteção de origem e status de provisionamento. Copiloto e MCP não são afetados porque suas rotas e contratos não mudam.

## Validação e riscos

- Conferir estado, contratos e campos persistidos contra código e testes existentes.
- Executar `npm run typecheck` e `git diff --check`.
- Não executar testes de produto em etapa somente documental; referenciar suites como contratos de regressão.
- Risco operacional: o limite Cloudflare é aproximado por localidade; a publicação do Custom Domain, DNS, certificado e secrets depende de sucesso dos workflows com permissões Cloudflare e Vercel.

## Reversão

Reverter os arquivos documentais desta pasta e a entrada correspondente no catálogo. Nenhum serviço, deployment ou documento remoto é afetado.
