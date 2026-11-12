# Plano — public-store-checkout

## Abordagem

Registrar o baseline da vitrine, submissão pública, gestão e conversão usando as fontes atuais. Não alterar interface, Functions, Rules, Cloudflare ou dados nesta etapa.

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

- Nenhum contrato ou dado muda nesta entrega.
- Preservar nomes de callables, formato de resposta e status persistidos.
- O payload público é minimizado e não contém identificação de contato; conversão coleta esses dados no painel.
- Separar em specs futuras mudanças de `storeSettings`, catálogo, rate limit distribuído/edge e atendimento externo.

## Segurança e integridade

- Preço e disponibilidade são reconsultados no servidor; não confiar em valores enviados pelo browser.
- A criação direta de `catalogOrders` continua negada nas Rules.
- Não descrever `RateLimiterMemory` como proteção global/distribuída ou Cloudflare como proteção do checkout sem evidência por ambiente.
- Não incluir segredos, IPs reais, dados de clientes ou logs contendo PII.
- Consultar `luisices-platform-security` e `luisices-cloudflare` em implementação futura que altere o endpoint ou sua proteção.

## UX e documentação

- A mensagem de sucesso representa confirmação de registro no backend e disponibilização do link; não significa WhatsApp enviado nem pagamento/compra confirmados.
- Atualizar `docs/FUNCIONALIDADES.md` e os guias de ameaças/Cloudflare se o comportamento operacional for alterado.

## Validação e riscos

- Conferir estado, contratos e campos persistidos contra código e testes existentes.
- Executar `npm run typecheck` e `git diff --check`.
- Não executar testes de produto em etapa somente documental; referenciar suites como contratos de regressão.
- Risco operacional documentado: rate limiting em memória é por instância; regras edge para checkout não estão comprovadas pelos arquivos consultados.

## Reversão

Reverter os arquivos documentais desta pasta e a entrada correspondente no catálogo. Nenhum serviço, deployment ou documento remoto é afetado.
