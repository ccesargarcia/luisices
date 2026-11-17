# Plano de implementação — orders-beta-gateway

## Abordagem

Desacoplar `functions/orders/index.js` e `functions/orders/superfrete.js` de `firebase-functions` e `@sentry/node` via `runtimeCompat.js`, expor os 4 handlers (`createOrder`, `updateComplexOrder`, `calculateSuperfreteShipping`, `createSuperfreteLabel`) no dispatcher existente `POST /api/order-tracking` (`api/order-tracking.ts`) já protegido pelo Worker `functions-beta`, sincronizar `SUPERFRETE_SANDBOX_TOKEN` na Vercel e conectar `firebaseOrderService` e `superfreteService` ao `executeWithGcpFallback('orderTrackingAdmin', ...)`.

## Componentes afetados

| Área | Arquivos/módulos | Alteração |
|---|---|---|
| Núcleo de Pedidos e Frete | `functions/orders/index.js`, `functions/orders/superfrete.js` | Usar `runtimeCompat.js` e exportar `handleCalculateSuperfreteShipping` e `handleCreateSuperfreteLabel` |
| Handler Vercel | `api/order-tracking.ts` | Validar `assertBetaEdgeRequest` antes de `OPTIONS`/método; despachar `createOrder`, `updateComplexOrder`, `calculateSuperfreteShipping` e `createSuperfreteLabel` |
| CI/CD Vercel | `.github/workflows/deploy-vercel-dev.yml` | Sincronizar `SUPERFRETE_SANDBOX_TOKEN` na Vercel |
| Serviços Frontend | `src/services/firebaseOrderService.ts`, `src/services/superfreteService.ts`, `src/app/components/settings/BackendRoutingSettingsSection.tsx` | Roteamento Beta com `executeWithGcpFallback('orderTrackingAdmin', ...)` e atualização do rótulo na UI |
| Testes | `tests/unit/orders-admin-api.test.ts`, `tests/unit/superfrete-service-routing.test.ts` | Cobrir proteção de origem, despacho e roteamento/fallback no cliente |
| Documentação | `docs/VERCEL_BETA_ROUTING.md`, `specs/features/README.md` | Atualizar tabela de rotas e catálogo de specs |

## Segurança, idempotência e impacto em IA

- **Segurança:** `assertBetaEdgeRequest` passa a ser verificado antes de `OPTIONS` e do método HTTP em `api/order-tracking.ts`.
- **Idempotência:** `createOrder` (`idempotencyKey`) e `updateComplexOrder` (`operationId`) gravam recibos transacionais em `orderOperationReceipts` no mesmo Firestore `luisices-dev`, garantindo que qualquer fallback para o GCP com a mesma chave seja estritamente idempotente.
- **Copiloto (Gemini) e MCP/ChatGPT:** sem impacto.
