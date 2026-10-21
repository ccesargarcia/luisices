# Fluxo E2E de integridade dos cálculos

Este roteiro cobre o percurso entre a entrada dos valores, os cálculos da interface, a gravação no Firestore, a leitura do orçamento e as regras que rejeitam gravações adulteradas.

## 1. Orçamento com quantidade e desconto percentual

1. Autenticar um usuário de teste com permissão para criar orçamentos.
2. Abrir **Orçamentos → Novo Orçamento** e cadastrar cliente, telefone, produto e data de entrega.
3. Informar quantidade `2`, preço unitário `R$ 150,00` e desconto percentual `10%`.
4. Conferir os valores antes de salvar:
   - subtotal: `R$ 300,00`;
   - desconto: `R$ 30,00`;
   - total: `R$ 270,00`.
5. Salvar. O serviço confere itens, desconto e total; as regras Firestore repetem a validação no servidor.
6. Reabrir o orçamento e confirmar o total persistido em `R$ 270,00`.
7. Excluir o registro de teste para não deixar dados artificiais.

Automatizado por `tests/e2e/quotes.spec.ts` (interface até leitura posterior) e `tests/integration/quotes-backend-validation.test.ts` (aceitação/rejeição pelas regras do Firestore).

## 2. Entradas inválidas no orçamento

1. Abrir um orçamento com subtotal de `R$ 100,00`.
2. Escolher desconto fixo e informar `R$ 150,00`.
3. Tentar salvar; a interface mantém o formulário aberto e informa que o desconto excede o subtotal.
4. Tentar gravar diretamente no Firestore um total adulterado, desconto acima do subtotal, percentual acima de 100%, quantidade fracionária, preço com precisão maior que centavos, campo extra no item ou 11 itens.
5. Confirmar que cada gravação é negada pelas regras do Firestore.

O limite de 10 linhas segue o limite já aplicado a pedidos, garantindo que um orçamento aprovado possa ser convertido em pedido.

## 3. Moeda e arredondamento

1. Calcular um item de `R$ 0,05` com desconto de `10%`.
2. Conferir desconto arredondado para `R$ 0,01` e total de `R$ 0,04` na interface e no backend.
3. Conferir o mesmo valor no PDF exportado.

## 4. Receita por produto

1. Abrir a ficha de um cliente com pedido concluído contendo item com quantidade `3` e subtotal salvo de `R$ 75,00`.
2. Conferir que a ficha mostra 3 unidades e `R$ 75,00` gerados; o subtotal do item já inclui quantidade e não deve ser multiplicado novamente.
3. Para registros antigos sem subtotal de linha, confirmar o cálculo de compatibilidade por `unitPrice × quantity`.

Coberto por `tests/unit/customer-xray-and-tiers.test.ts`.

## 5. Intervalos de datas

1. Selecionar semana, mês, trimestre e ano no dashboard e nos relatórios.
2. Confirmar que ambos usam janelas móveis de 7, 30, 90 e 365 dias e que a comparação anterior usa a janela imediatamente anterior de mesma duração.
3. Escolher intervalo personalizado de `2026-10-01` a `2026-10-05` em fuso `America/Sao_Paulo`.
4. Confirmar início local em 1º de outubro às 00:00 e fim em 5 de outubro às 23:59:59.999, sem deslocamento para o dia anterior.

Coberto por `tests/unit/quote-math.test.ts` e `tests/unit/orders-queries-and-dates.test.ts`.

## 6. Paridade da calculadora de preço

1. Enviar a mesma receita e configuração à calculadora web e ao motor Node usado pelo backend.
2. Comparar custo de materiais, custo unitário total, preço sugerido e faixas de lote.
3. Repetir com `totalCost = 0` e `unitCost > 0`: zero explícito deve continuar zero, sem cair no custo calculado por fallback.
4. Repetir com salário, dias e horas explicitamente zerados; zero não deve ser substituído pelos padrões.

Coberto por `tests/unit/ai/pricing-engine.test.ts` e `tests/unit/ai/response-contracts.test.ts`.

## Comandos

```sh
npm run typecheck
npx vitest run tests/unit/quote-math.test.ts tests/unit/customer-xray-and-tiers.test.ts tests/unit/orders-queries-and-dates.test.ts tests/unit/settings-and-dashboard-cards.test.ts tests/unit/ai/pricing-engine.test.ts tests/unit/ai/response-contracts.test.ts
npx firebase emulators:exec --config firebase.test.json --project demo-luisices-review --only firestore,storage "npx vitest run --config vitest.integration.config.ts tests/integration/quotes-backend-validation.test.ts"
npm run test:e2e:emulator -- tests/e2e/quotes.spec.ts
```

O E2E de navegador precisa ser executado em Linux/macOS/Windows com Chromium do Playwright instalado; o Playwright não inicia neste ambiente Termux/Android.
