# Paginação da galeria no histórico de cliente

O histórico usa páginas de 30 documentos, filtradas no Firestore por parceiro e cliente e ordenadas por `createdAt`. O limite agora é aplicado antes da leitura, e não depois de carregar a coleção inteira.

`getCustomerPage` retorna itens, cursor e indicação de próxima página. O método legado `getItemsByCustomer` continua disponível, mas retorna somente a primeira página solicitada, com limite máximo de 100. O consumidor do histórico foi atualizado para permitir continuação explícita.

## Comportamento

- Cursor usa o último documento bruto da página, inclusive excluídos.
- Documentos excluídos não são exibidos nem têm suas URLs resolvidas.
- Uma página só de excluídos ainda permite continuar; não implica fim do histórico.
- Quando a última página tem exatamente o tamanho solicitado, uma consulta adicional vazia pode ser necessária para confirmar o fim.
- Requisições sobrepostas de continuação são bloqueadas; respostas de outro cliente/diálogo são descartadas.
- Erros são apresentados e podem ser repetidos, preservando as páginas já carregadas na continuação.
- Itens repetidos por alterações concorrentes são deduplicados por ID na interface.

## Custo e limites

Cada continuação lê no máximo 30 documentos, incluindo excluídos logicamente, além de possíveis cobranças do mecanismo de índices conforme a consulta. URLs são resolvidas apenas para itens ativos daquela página. Não há serviço novo nem migração automática.

O novo índice de `gallery` combina `userId`, `customerId` e `createdAt DESC`. Publicar e aguardar disponibilidade antes do frontend. Consultas ordenadas não incluem documentos sem `createdAt`: conferir dados legados antes da entrega. Não inventar datas na migração.

Esta alteração se limita à galeria por cliente no diálogo de histórico. A galeria principal e suas consultas globais continuam precisando de avaliação própria. Soft deletes continuam consumindo leituras; retenção/limpeza é uma etapa separada.

## Validação

Testes cobrem ordenação e limite enviados ao Firestore, cursor, página vazia, exclusão lógica, resolução somente de itens ativos e limites inválidos. Validar em DEV o índice, duas páginas, erro/repetição e troca rápida de cliente. Nenhum deploy é executado nesta etapa.
