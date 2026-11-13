# Plano — quote-to-order

## Abordagem

Documentar a conversão nativa da interface como baseline, seguindo o caminho existente de `createOrder` e identificando diferenças com MCP sem unificar contratos ou fazer alterações de código.

## Componentes existentes

| Área | Arquivos/guias | Papel atual |
|---|---|---|
| Jornada da interface | `src/app/components/quotes/QuoteDetailsDialog.tsx`, `src/app/pages/Quotes.tsx` | Aprovar, rejeitar, marcar envio e atualizar a lista. |
| Cálculos e transferência | `src/app/components/quotes/quoteHelpers.ts` | Validar totais e distribuir desconto/subtotais no pedido. |
| Serviço de orçamento | `src/services/firebaseQuoteService.ts` | Criar, consultar, editar, mudar status e excluir. |
| Criação autoritativa | `src/services/firebaseOrderService.ts`, `functions/orders/index.js` | Chamar `createOrder`, validar autorização/estado/validade e persistir transação. |
| Rules | `firestore.rules` | RBAC e validação da matemática de `quotes`. |
| Alternate channel | `functions/ai/tools.js`, `functions/ai/repositories.js` | Aprovação/conversão MCP com passos separados; fora da implementação desta baseline. |
| Regressão | testes unitários, integração e E2E citados na spec | Cobrir centavos, replay, autorização, conversão e jornada UI. |

## Contratos, dados e compatibilidade

- Nenhum contrato muda nesta etapa.
- Preservar campos de vínculo do orçamento e do pedido, status canônicos e total financeiro.
- Não converter orçamento aprovado já vinculado em um novo pedido.
- Manter explícita a diferença entre conversão nativa atômica e sequência MCP, sem prometer paridade.

## Segurança e integridade

- Conversão exige autorização de orçamento e de criação de pedido no backend.
- `quoteId` não deve ser tratado como prova suficiente de que o payload submetido é a versão vigente; revisar a divergência de correspondência do conteúdo antes de mudança funcional.
- Preservar matemática exata em centavos e validação de Rules; ao alterá-las, executar a suíte de regras no emulador.
- Aprovação não confirma pagamento; sinal deve continuar zero até registro explícito.
- Em implementação futura, consultar as skills `luisices-platform-security`, `luisices-order-ledger-audit`, `luisices-firestore-rules` e `luisices-functions-deploy` quando os arquivos correspondentes forem afetados.

## UX e documentação

- Esta spec não altera interface nem o envio externo da proposta.
- Manter `docs/FUNCIONALIDADES.md` e guias financeiros sincronizados com qualquer alteração futura.

## Validação e riscos

- Validar as afirmações com os testes referenciados; esta etapa não executa as suítes de produto.
- Executar `npm run typecheck` e `git diff --check`.
- Risco principal: conversão pode usar dados antigos do cliente sem comparação integral com o orçamento que o backend validou como elegível.
- Risco de canal: MCP não tem a mesma transação da interface; mudanças devem tratar os canais separadamente.

## Reversão

Reverter os documentos desta pasta e a entrada correspondente no catálogo. Nenhum dado ou serviço é afetado.
