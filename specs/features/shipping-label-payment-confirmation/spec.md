# Confirmação do pagamento de etiquetas SuperFrete

- **ID:** `shipping-label-payment-confirmation`
- **Status:** Correção em andamento
- **Responsável:** Não definido
- **Atualizado em:** 2026-11-18
- **Referências:** `functions/orders/superfrete.js`; `src/contexts/OrdersContext.tsx`; `src/services/firebaseOrderService.ts`; `src/app/components/shipping/SuperfreteGenerateLabelDialog.tsx`; `src/app/components/orders/OrderShippingSection.tsx`; `docs/FUNCIONALIDADES.md`; [status de etiquetas SuperFrete](https://ajuda.superfrete.com/artigo/o-que-significam-os-status-das-etiquetas-geradas-via-integracao-na-superfrete/)

## Problema e contexto

O código tratava uma resposta HTTP 2xx do checkout como etiqueta liberada sem verificar se o JSON reportava falta de saldo ou pagamento pendente. A documentação de ajuda da SuperFrete distingue “Aguardando pagamento” (etiqueta criada, pagamento não confirmado) de “Processando” (pagamento confirmado e etiqueta pronta). O código Luisices usa `https://sandbox.superfrete.com` com a credencial `SUPERFRETE_SANDBOX_TOKEN`; não há consulta local/mock de carteira, e não foi encontrada tela no Luisices que exiba o saldo da SuperFrete.

Após o primeiro ajuste, foi identificado um segundo defeito: os campos de frete eram persistidos, mas `OrdersContext.mapSnapshot` e `FirebaseOrderService.mapOrderDoc` não os copiavam para o objeto `Order`. Assim, recarregar ou reabrir um pedido podia ocultar o estado pendente na interface. Além disso, um erro de checkout não reconhecido liberava a reserva, embora o provedor pudesse ter processado a cobrança.

## Objetivos

- Reconhecer respostas de checkout que informem saldo insuficiente ou pagamento aguardando confirmação, mesmo quando vierem com HTTP 2xx.
- Persistir o identificador da tentativa como `pending_payment` ou `payment_unconfirmed`, sem URL de impressão nem rastreio, para evitar uma nova compra inadvertida.
- Mostrar claramente na interface que a etiqueta ainda não está liberada e orientar o pagamento no app/painel SuperFrete.

## Fora de escopo

- Sincronização automática de pagamento realizado depois no app da SuperFrete; o contrato público documentado da API não foi localizado para implementar consulta de status com segurança.
- Alterações na API Beta, Cloudflare Worker, autorização, produção ou credenciais.
- Checkout via cartão diretamente dentro do Luisices.

## Atores e permissões

| Ator | Ações permitidas | Restrições/negações |
|---|---|---|
| Usuário já autorizado no fluxo SuperFrete | Criar tentativa e visualizar estado pendente | Estado pendente bloqueia nova emissão; pagamento é concluído na SuperFrete |

## Requisitos funcionais

- **RF-1:** Tratar frases e status explícitos de saldo insuficiente/pagamento pendente como `pending_payment`, independentemente do status HTTP; não aceitar 2xx isolado como confirmação de pagamento.
- **RF-2:** Persistir `shippingTagId`, serviço, custo e estado pendente/não confirmado no pedido, liberando a reserva de processamento mas bloqueando a criação de nova etiqueta.
- **RF-3:** A interface não pode apresentar `pending_payment` ou `payment_unconfirmed` como etiqueta emitida/liberada, nem exibir ações de impressão ou envio de rastreio nesses estados.
- **RF-4:** Informar que o pagamento deve ser concluído na SuperFrete e que a confirmação externa ainda não sincroniza automaticamente com Luisices.
- **RF-5:** Preservar todos os campos de etiqueta ao reconstruir pedidos lidos do Firestore, inclusive após atualizar ou reabrir a tela.
- **RF-6:** Manter bloqueada a reemissão após qualquer resposta de checkout sem confirmação conclusiva, preservando o ID remoto quando disponível.

## Critérios de aceitação

- **CA-1 (RF-1, RF-2):** Resposta contendo “Sem saldo na carteira” persiste `pending_payment` e guarda o ID do carrinho; resposta 2xx só resulta em liberação se trouxer status reconhecido como pago/processando/completo ou link de impressão. Sem evidência positiva, persiste `payment_unconfirmed`.
- **CA-2 (RF-2):** Repetir a chamada para o mesmo pedido pendente retorna a tentativa existente, sem fazer novo POST ao carrinho/checkout.
- **CA-3 (RF-3, RF-4):** Resumo do pedido e diálogo mostram pagamento pendente/não confirmado, sem status verde de etiqueta liberada, rastreio, PDF ou botão para reemitir.
- **CA-4:** Falhas antes da criação do carrinho mantêm o tratamento atual; depois que há ID remoto, autorização/ownership continuam iguais e checkout inconclusivo não libera reemissão.
- **CA-5 (RF-2, RF-5):** Tanto o listener de `OrdersContext` quanto a leitura de `FirebaseOrderService` retornam `shippingTagId` e `shippingStatus` persistidos; pedido reaberto continua mostrando a pendência e não oferece nova emissão.
- **CA-6 (RF-6):** Resposta HTTP não-2xx sem classificação conhecida é registrada como `payment_unconfirmed` com ID da etiqueta e não libera nova tentativa automática.

## Requisitos não funcionais e integridade

- Segurança/privacidade: preservar RBAC e ownership; não registrar token ou corpo bruto potencialmente sensível do provedor em logs.
- Integridade/idempotência: conservar o ID remoto antes de apresentar pendência para impedir cobrança duplicada.
- Acessibilidade/desempenho/observabilidade: estado pendente comunicado por texto e cor semântica de atenção.
- Compatibilidade de API/dados: adiciona os estados persistidos `pending_payment` e `payment_unconfirmed`; resposta callable continua com os campos existentes e inclui `message` opcional.

## Erros e casos-limite

- Resposta de erro de checkout com mensagem de saldo: guardar como pendente, pois o pedido remoto pode ter sido criado no carrinho.
- Resposta indicando estado pendente sem mensagem: reconhecer nomes comuns de status.
- Resposta 2xx sem status final reconhecido nem link de impressão: marcar `payment_unconfirmed`, pois não comprova que a etiqueta esteja liberada.
- Falha posterior de pagamento na SuperFrete: o pedido não é reemitido automaticamente; requer reconciliação manual.
- A resposta da API não contém indicador conhecido: não afirmar pagamento; nomes/status adicionais devem ser confirmados com documentação ou payload sanitizado real antes de ampliar a lista.

## Dados e contratos afetados

Pedidos passam a usar `shippingStatus: 'pending_payment'` ou `payment_unconfirmed` e podem persistir `shippingTagId` sem URL/rastreio. A callable retorna status e mensagem opcional; não há mudança de argumentos.

## Impacto na documentação

- Guias/specs existentes revisados: `docs/FUNCIONALIDADES.md`, `specs/features/orders-beta-gateway/spec.md`, `specs/features/shipping-label-quote-gate/spec.md` e código atual.
- Documentação que precisará ser atualizada: guia de funcionalidades e esta spec.
- Índices, exemplos, comandos ou links afetados: catálogo `specs/features/README.md`; link oficial de status conferido.
- Impacto no Copiloto (Gemini): não impactado; emissão SuperFrete ocorre pela interface de pedidos e callable existente.
- Impacto no MCP/ChatGPT: não impactado; nenhuma ferramenta MCP ou schema foi alterado.
- Vercel: o código frontend é entregue pelo workflow Vercel Dev/Beta acionado em `develop`; validar o workflow e os domínios de destino após o push. Não há alteração de `api/`, projeto ou roteamento Vercel.
- Cloudflare e `api.dev`: fora do escopo; nenhuma alteração de Worker ou rota de API.
- Diferenças de comportamento Copiloto/MCP a preservar ou alterar: sem impacto; ambos permanecem inalterados.

## Decisões e dúvidas

- **Confirmado:** SuperFrete documenta “Aguardando pagamento” separadamente de “Processando”, que representa pagamento confirmado; o código exige status positivo reconhecido ou link de impressão para marcar a etiqueta liberada.
- **Proposto:** pagamentos realizados depois no app da SuperFrete exigem reconciliação manual até haver contrato oficial para consultar status.
- **Em aberto:** confirmar payloads adicionais de checkout/status com suporte ou documentação oficial antes de ampliar a detecção.

## Validação

- `npm run typecheck`, `npm --prefix functions run lint` e `git diff --check`.
- Após integrar em `develop`, conferir o resultado dos workflows Firebase Dev e Vercel Dev/Beta, confirmando que não houve deploy do Worker Cloudflare nem alteração de `api.dev`.
- Revisar que estado pendente não aciona uma nova compra e que UI não afirma liberação.
- Não executar teste de compra/checkout real; a operação cobra saldo.

## Evidências de conclusão

- A validação desta correção e os workflows de deploy estão pendentes.
- Não executar compra/checkout real; a reconciliação de pagamentos externos continua manual.
