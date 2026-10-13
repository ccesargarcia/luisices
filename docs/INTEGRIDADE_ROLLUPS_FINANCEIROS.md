# Integridade dos rollups financeiros

## Correções locais

O cálculo mensal filtra explicitamente `userId`, valida mês/parceiro e rejeita valores negativos, não finitos ou acima do limite seguro. As somas monetárias são feitas em centavos. Um pagamento superior ao valor do pedido exige conciliação, em vez de esconder a divergência.

`completed` não significa pagamento recebido. `totalPaid` usa exclusivamente `paidAmount` registrado; mesmo `paymentStatus: paid` sem valor não inventa um recebimento. `totalPending` é o valor restante dos pedidos válidos. Pedidos cancelados permanecem nas métricas de cancelamento, mas não compõem ranking ou recebimentos deste resumo.

## Significado das métricas

- `totalRevenue`: valor dos pedidos concluídos criados no mês, conforme a convenção existente.
- `totalValidAmount`: valor dos pedidos não cancelados criados no mês.
- `totalPaid`: pagamentos registrados nesses pedidos, independentemente de quando o pagamento ocorreu.
- `totalPending`: saldo desses pedidos.

Este resumo **não é fluxo de caixa por data de pagamento**. Pagamentos posteriores, estornos e valores recebidos de pedidos cancelados precisam de lançamentos datados e de conciliação própria. Não concluir que um pagamento foi estornado apenas porque o pedido foi cancelado.

## Histórico de clientes

A interface informa que o Raio X e as faixas usam os pedidos carregados e podem estar incompletos. O aviso reduz a falsa impressão de precisão; não corrige a falta de histórico. A etapa seguinte deve usar ledger completo direcionado ao cliente ou agregados reconciliados, sem remover limites globais indiscriminadamente.

## Entrega e pendências

Esta alteração não recalcula resumos persistidos nem integra o serviço mensal às telas. Não execute sobrescrita em massa sem comparar valores antigos e novos em dry-run. Registros legados com pagamentos inconsistentes devem ser conciliados antes.

Ainda pendentes: controle de versões na atualização dos resumos, alterações retroativas, fonte completa das métricas de cliente e definição de caixa por data de pagamento. Não tratar um cache mensal escrito pelo cliente como registro financeiro autoritativo.

Nenhum índice, regra ou serviço externo adicional é necessário para estas correções. Não aumentam leituras nas telas; o cálculo filtra dados já fornecidos. Testes unitários cobrem escopo, pagamentos parciais, concluído não pago, precisão, entradas inválidas e cancelamento.
