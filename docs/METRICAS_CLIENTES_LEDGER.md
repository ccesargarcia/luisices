# Indicadores históricos de clientes

## Fonte de dados

A página Customers já assinava o ledger completo para os totais. Esta alteração reutiliza essa mesma consulta para os indicadores individuais, agrupando estritamente por `customerId` e `userId`. Não cria consulta ou listener por cliente.

As vendas são adaptadas ao contrato usado pelo cálculo do Raio X, preservando valor, quantidade, status, data e pagamento registrado. O histórico financeiro pode conter pedidos antigos que não estão entre os 200 registros operacionais.

A página e o Raio X do diálogo usam essa fonte comum. A lista de pedidos no diálogo continua operacional e informa que contém pedidos carregados; não é apresentada como lista histórica completa.

## Segurança e precisão

- Não associa vendas por nome: clientes homônimos permanecem separados.
- Ignora vendas sem vínculo ou com parceiro divergente do cadastro.
- Um histórico financeiro vazio confirmado não usa automaticamente totais antigos do cadastro como fallback.
- Falha de leitura do ledger é exibida e impede apresentar indicadores como se a consulta tivesse retornado um histórico vazio.
- O estado do ledger é limpo ao reinicializar sua assinatura, evitando reutilizar os resultados anteriores durante o carregamento.

## Limitações e entrega

Não há migração automática de dados sem `customerId`/`userId`. O ledger precisa estar reconciliado com os pedidos: registros ausentes ou incorretos ainda prejudicam as métricas. Esta etapa não transforma o ledger em backend autoritativo nem corrige todos os fluxos que o atualizam.

O universo de clientes da página ainda é limitado pela consulta existente de 1.000 cadastros. O agrupamento não corrige essa paginação. A consulta completa do ledger também continua tendo custo proporcional ao histórico; não houve aumento de leituras, mas sua redução futura exige agregados reconciliados.

Validar em DEV/QA com cliente antigo, mais de 200 pedidos, dois clientes homônimos e parceiros distintos. Conferir os indicadores com o ledger antes da entrega. Não executar associação em massa por nome ou telefone.

Não são necessários novos índices, regras, Functions ou infraestrutura para esta etapa. Nenhum deploy foi executado.
