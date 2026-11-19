# Plano de implementação — shipping-label-payment-confirmation

## Abordagem

Reconhecer mensagens explícitas e estados conhecidos de pagamento pendente na resposta do checkout. Só considerar pago quando houver status final reconhecido ou link de impressão; toda resposta de checkout não conclusiva vira `payment_unconfirmed`. Persistir o ID remoto dentro da transação do pedido, evitando reemitir. Preservar os campos de frete nos dois mapeadores que leem pedidos do Firestore. Atualizar os componentes existentes para exibir claramente a pendência e suprimir ações próprias de etiqueta liberada. Não inventar endpoint de consulta da SuperFrete sem contrato verificável.

## Componentes existentes

| Área | Arquivos/módulos atuais | Alteração proposta |
|---|---|---|
| Checkout servidor | `functions/orders/superfrete.js` | Confirmação positiva, classificação de pendência e persistência segura do identificador/custo |
| Resposta cliente | `src/services/superfreteService.ts` | Tipar status/message da resposta |
| Diálogo | `src/app/components/shipping/SuperfreteGenerateLabelDialog.tsx` | Exibir pendência sem declarar sucesso/liberação |
| Resumo do pedido | `src/app/components/orders/OrderShippingSection.tsx` | Estado de pagamento pendente sem permitir reemissão |
| Tipo de pedido | `src/app/types.ts` | Incluir `pending_payment` e `payment_unconfirmed` |
| Leitura de pedidos | `src/contexts/OrdersContext.tsx`, `src/services/firebaseOrderService.ts` | Preservar campos de etiqueta no estado carregado/reaberto |
| Documentação | `docs/FUNCIONALIDADES.md`, `specs/features/README.md` | Explicar pendência e limitação de sincronização |

## Contratos, dados e compatibilidade

- Contratos/API/schema: sem mudança de argumentos; resposta adiciona mensagem opcional e usa status novo conhecido pelo cliente.
- Dados/migração: sem backfill; status novo é aditivo. Pedidos antigos não mudam.
- Integrações/ambientes: Function SuperFrete somente em Dev; Vercel Dev/Beta publica a interface alterada conforme workflow de `develop`. Cloudflare Worker, `api.dev` e produção fora do escopo.

## Segurança e integridade

- Autorização e ownership: conservar `authorizeSuperfrete` e `reserveOrderForLabel`.
- Validação/redação/limites: sanitizar mensagem antes de persistir; não logar conteúdo integral do provedor.
- Transações/idempotência/valores: gravar o tag ID pendente/não confirmado em transação e impedir repetição do carrinho/checkout.
- Ameaças/casos de abuso: respostas 2xx sem evidência de pagamento não afirmam emissão paga; cotação não é prova de pagamento.

## UX e documentação

- UI/acessibilidade/design system: usar tokens semânticos e texto de status; remover rastreio/PDF/WhatsApp para os estados pendente/não confirmado.
- Documentação/specs existentes revisadas: documentação de SuperFrete, guia de funcionalidades, specs de gateway e cotação.
- Documentação viva a atualizar: guia e catálogo/spec desta feature.
- Índices, exemplos, comandos e links a conferir: link de status oficial da SuperFrete.
- Copiloto (Gemini): sem impacto; não usa este fluxo.
- MCP/ChatGPT: sem impacto; sem alteração de tools/scopes/contracts.
- Compatibilidade/paridade entre Copiloto e MCP: canais mantidos como estão.

## Validação e riscos

- Typecheck: `npm run typecheck`.
- Validação de sintaxe: `npm --prefix functions run lint`.
- Deploy: revisar workflows Firebase Dev e Vercel Dev/Beta após push; confirmar que Worker/Cloudflare não foi publicado.
- Risco e mitigação: a atualização do pagamento feito externamente não é automática; não permitir reemissão até confirmação/reconciliação. A conta Sandbox pode ter carteira não mockada, mas não representa carteira de produção.

## Reversão

Reverter a classificação e a renderização, avaliando manualmente os pedidos já gravados como `pending_payment` ou `payment_unconfirmed`; não limpar IDs remotos sem conferência no painel SuperFrete.
