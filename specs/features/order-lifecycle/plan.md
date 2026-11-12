# Plano — order-lifecycle

## Abordagem

Consolidar o contrato atual de pedidos internos em uma spec de baseline. Nenhuma regra de negócio ou código de produção é alterado nesta etapa. Em futuras mudanças, usar esta spec como mapa inicial e aprofundar somente os domínios afetados.

## Componentes existentes

| Área | Arquivos/guias | Papel atual |
|---|---|---|
| Interface/serviço | `src/services/firebaseOrderService.ts`, `src/app/components/orders/`, `src/app/pages/Dashboard.tsx` | Criação, edição, status, concorrência, recuperação e telas de operação. |
| Backend | `functions/orders/index.js` | Callables autoritativas `createOrder` e `updateComplexOrder`. |
| Segurança | `firestore.rules` | Negação de criação direta, controles de edição, ledger, eventos e recibos. |
| Modelo | `src/app/types.ts` | Status de pedido, pagamento, itens e workflow. |
| Documentação | `docs/FUNCIONALIDADES.md`, `docs/SEGURANCA_LIMITE_CEL_PEDIDOS.md`, `docs/IDEMPOTENCIA_PEDIDOS.md`, `functions/README.md` | Jornadas, invariantes transacionais, recuperação e contratos. |
| Regressão | `tests/integration/create-order-function.test.ts`, `tests/integration/complex-order-function.test.ts`, `tests/integration/orders-backend-validation.test.ts` | Evidências automatizadas existentes para criação, edição e regras. |

## Contratos, dados e compatibilidade

- Nenhum contrato ou dado é alterado por esta entrega documental.
- Pedidos legados e o espelho `payment.history` permanecem cobertos pelas referências existentes; a spec não propõe migração.
- A loja pública, importação, orçamento, Alexa e MCP mantêm seus próprios fluxos; quando tocados, suas specs devem documentar a integração com `createOrder` sem duplicar seus contratos.

## Segurança e integridade

- Manter a divisão de responsabilidades observada entre cliente, Firestore Rules e Cloud Functions.
- Para implementação futura: consultar `luisices-platform-security`, `luisices-order-ledger-audit`, `luisices-firestore-rules` e `luisices-functions-deploy` conforme arquivos afetados.
- Nenhum secret, dado real de cliente ou recurso remoto será acessado nesta tarefa.

## UX e documentação

- Esta baseline complementa os guias de domínio; não os substitui.
- Atualizar a tabela do catálogo de specs para apontar para esta baseline.

## Validação e riscos

- Revisar afirmações contra os guias e arquivos citados; manter explícitos os limites de escopo e fatos ainda não confirmados.
- Executar `npm run typecheck`, obrigatório pelo `AGENTS.md`.
- Não executar a suíte completa de testes: não há mudança executável e os testes são listados como contrato/regressão para futuras alterações.
- Risco principal: documentação atual pode não refletir o deployment remoto; a spec declara essa limitação.

## Reversão

Reverter apenas os arquivos documentais desta pasta e a entrada correspondente no catálogo. Nenhum dado ou serviço é afetado.
