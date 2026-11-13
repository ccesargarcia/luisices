# Ciclo interno do pedido

- **ID:** `order-lifecycle`
- **Status:** Pronta (baseline do comportamento atual)
- **Responsável:** Luisices
- **Atualizado em:** 2026-11-12
- **Referências:** `docs/FUNCIONALIDADES.md`; `docs/SEGURANCA_LIMITE_CEL_PEDIDOS.md`; `docs/IDEMPOTENCIA_PEDIDOS.md`; `functions/README.md`; `src/services/firebaseOrderService.ts`; `functions/orders/index.js`; `firestore.rules`; `src/app/types.ts`.

## Problema e contexto

Pedidos são o eixo da operação: reúnem cliente, itens e preço, pagamentos, entrega, situação de produção, atribuição e acompanhamento. O fluxo persiste dados operacionais em `orders` e uma projeção financeira em `salesLedger`. Esta spec registra o contrato atual como baseline para que mudanças futuras tenham critérios explícitos e preservem segurança e integridade.

Esta spec não propõe uma mudança de produto. As afirmações abaixo descrevem o código/documentação encontrados no checkout e não comprovam configuração ou publicação remota.

## Objetivos

- Registrar comportamento observável do ciclo interno de criação, edição, produção, pagamento e arquivamento.
- Definir critérios de regressão para autorização, concorrência, integridade financeira e recuperação de tentativas.
- Dar um ponto de partida para futuras specs de pedidos sem copiar os guias existentes.

## Fora de escopo

- Checkout público da loja e conversão de `catalogOrders`.
- Conversão de orçamento em pedido, pedidos via Alexa/MCP e regras específicas dessas integrações.
- Links públicos de acompanhamento, etiqueta de frete e baixa de estoque.
- Redesenho do modelo de pedidos, migração de dados históricos ou alteração de comportamento.

Esses fluxos podem criar ou complementar pedidos, mas têm contratos próprios e devem ser cobertos por specs separadas se forem alterados.

## Atores e permissões

| Ator | Ações no ciclo interno | Restrições observadas |
|---|---|---|
| Proprietário do pedido | Criar e operar pedidos da própria conta conforme permissões atuais. | A criação exige `orders.create`; leituras e gravações estão sujeitas a perfil ativo e permissões nas Rules/backend. |
| Administrador | Acesso administrativo às operações de pedido. | As Functions ainda validam a sessão/conta conforme o handler; administrador não torna o payload financeiro confiável. |
| Funcionário atribuído | Consultar e editar pedidos atribuídos quando tem permissão de pedidos correspondente. | A edição complexa exige atribuição ao funcionário e `orders.edit`; atribuição não substitui verificação de perfil ativo. |

## Requisitos funcionais observados

- **RF-1 — Criação:** criação do painel passa pela callable `createOrder`; a criação direta de `orders` pelo cliente é negada nas Rules. O backend valida dados, permissões, valores e vínculos antes de persistir.
- **RF-2 — Estrutura e preço:** pedido pode ser simples/legado ou estruturado. Pedidos com itens estruturados aceitam de 1 a 10 itens, com quantidade, preço unitário e total coerentes em centavos. O número de unidades pode ser maior que 10; o limite 1–10 refere-se aos produtos/linhas estruturadas.
- **RF-3 — Consistência transacional:** criação grava pedido, contador, `salesLedger`, estatísticas do cliente associado e evento de pagamento inicial, quando aplicável, na mesma transação. Conversões de orçamento/loja têm efeitos adicionais fora do escopo desta spec.
- **RF-4 — Edição complexa:** alterações financeiras, itens, cliente vinculado ou classificação de permuta passam por `updateComplexOrder`, com autorização repetida no servidor, campos permitidos, versão esperada e atualizações atômicas de pedido/ledger/estatísticas aplicáveis.
- **RF-5 — Edição operacional:** status, etapas de produção, atribuição, observações e arquivamento seguem os caminhos existentes no serviço e nas Rules; pedido e ledger são sincronizados quando o campo correspondente existe no ledger. A criação de pedido não equivale a avançar uma etapa de produção.
- **RF-6 — Pagamentos:** status permitido é `pending`, `partial` ou `paid`; métodos persistidos são `pix`, `cash`, `credit`, `debit` ou `transfer`. O total pago não supera o total cobrável. Permutas têm total financeiro zero e não aumentam estatísticas de vendas do cliente.
- **RF-7 — Espelho financeiro:** `salesLedger/{orderId}` acompanha o pedido; as Rules impedem criação/alteração isolada de seus campos financeiros pelo cliente. Exclusão ou alteração cadastral de cliente não representa exclusão automática de seu histórico financeiro.
- **RF-8 — Histórico de pagamento:** eventos em `orders/{orderId}/paymentEvents` são gravados pelo backend e append-only para o cliente. `payment.history` permanece como espelho compatível com relatórios legados; os dados históricos não foram migrados retroativamente para a subcoleção.
- **RF-9 — Repetição segura:** criação reutilizada com mesmo usuário, chave e hash do comando retorna o pedido existente sem duplicar efeitos; comando diferente ou chave de outro usuário não é sucesso. Edição com `operationId` usa recibo durável vinculado ao usuário, pedido e hash.
- **RF-10 — Resultado incerto:** timeout ou falha de transporte pode deixar a operação em estado desconhecido. A interface preserva payload e identificador na sessão do mesmo navegador/aba e oferece confirmação/retry pela Function. Não há garantia de retomada após limpar a sessão ou em outro dispositivo.

## Critérios de aceitação do baseline

- **CA-1 (RF-1):** tentativa de criação direta pelo SDK do cliente é negada; chamada autenticada ao caminho oficial só cria após as validações e permissões do servidor.
- **CA-2 (RF-2, RF-6):** preço/subtotal em desacordo, valor que não representa centavos inteiros, itens estruturados fora do limite ou pagamento inválido são recusados antes de persistir.
- **CA-3 (RF-3, RF-7):** uma criação aceita não deixa pedido, ledger, contador, estatística do cliente ou evento inicial parcialmente gravados por falha transacional.
- **CA-4 (RF-4):** edição baseada em versão desatualizada é recusada; replay autorizado com recibo correspondente é reconhecido sem reaplicar valores antigos.
- **CA-5 (RF-4, RF-7):** alteração de total/cliente/permuta sincroniza pedido, ledger e contribuições de cliente na mesma operação, sem contabilizar permuta como venda.
- **CA-6 (RF-5):** tentativa de alterar diretamente campos financeiros protegidos ou forjar recibos/eventos pelo cliente é negada; operações permitidas continuam sujeitas a ownership/atribuição e permissão de módulo.
- **CA-7 (RF-8):** evento de pagamento não pode ser criado/editado/excluído pelo cliente; leitura segue o mesmo escopo de acesso ao pedido.
- **CA-8 (RF-9, RF-10):** retry de comando idêntico usa a mesma chave/operação e não duplica os efeitos; payload diferente com a mesma chave/operação produz conflito, e o cliente não inicia silenciosamente uma nova criação enquanto a tentativa anterior está incerta.
- **CA-9 (RF-5):** pedido concluído só é arquivado conforme a ação e preferências de interface; a documentação não deve afirmar que o autoarquivamento roda como tarefa autônoma no servidor.

## Requisitos não funcionais e integridade

- **Segurança/privacidade:** isolamento por proprietário, perfil ativo, papel, permissão de módulo e atribuição devem ser verificados nas camadas correspondentes. O frontend não substitui Rules ou autorização das Functions.
- **Integridade financeira:** valores monetários são validados em centavos; ledger e pedido são atualizados pelo fluxo suportado; não se deve inferir preço unitário para reparar histórico sem auditoria.
- **Concorrência:** edição complexa usa `version`/`expectedVersion`; conflitos devem preservar a versão mais recente e não sobrescrevê-la com dados antigos.
- **Resiliência:** idempotência identifica uma intenção, não duas compras iguais. Operações auxiliares fora da transação (uploads, vínculo de galeria e baixa de estoque) exigem conferência própria.
- **Rules:** preservar a negação de criação direta e considerar o custo CEL da operação completa; não ampliar validações sem teste no emulador.

## Erros e casos-limite

- Perfil inexistente/inativo, sessão revogada, permissão ausente ou funcionário não atribuído.
- Pedido/cliente inexistente ou pertencente a outro tenant.
- Versão concorrente, chave de idempotência reaproveitada com comando distinto, recibo de outro usuário ou schema legado.
- Valor negativo, fora do limite, sem centavos inteiros, soma de itens divergente, pagamento acima do saldo ou método não canônico.
- Falha/timeout depois do envio da operação, resposta perdida e falha em tarefa auxiliar fora da transação.
- Ledger inexistente ou inconsistente; impedir associação com outro proprietário e seguir comportamento documentado de reconstrução apenas nos caminhos autorizados.

## Dados e contratos afetados

- Firestore: `orders/{orderId}`, `salesLedger/{orderId}`, `orders/{orderId}/paymentEvents/{eventId}`, `orders/{orderId}/operationReceipts/{operationId}`, `users/{uid}/metadata/counters`, `customers/{customerId}`.
- Callables: `createOrder` e `updateComplexOrder`; os contratos públicos de argumentos, respostas, autenticação e gateway devem ser preservados.
- Campos relevantes: itens/pricing, `payment`, `isExchange`, `status`, `productionWorkflow`, `version`, `idempotencyKey`, `operationId`, `customerId`, `assignedTo`, `isArchived` e timestamps.
- Estados TypeScript observados: pedido `pending | in-progress | completed | cancelled`; pagamento `pending | partial | paid`; etapas `design`, `approval`, `printing`, `cutting`, `assembly`, `quality-check`, `packaging`.

## Decisões e dúvidas

- **Confirmado:** criação financeira autoritativa usa Cloud Function e Admin SDK; Rules negam criação direta.
- **Confirmado:** operações transacionais não cobrem uploads, baixa de estoque ou vínculo de galeria.
- **Confirmado:** status do pedido e etapas de produção são representações distintas.
- **Em aberto:** esta baseline não consolida todos os nomes e exceções de permissões para exclusão/soft-delete, importação em lote e fluxos de integrações; consulte os arquivos de domínio antes de alterar esses comportamentos.
- **Em aberto:** a publicação remota das Functions, Rules e gateway deve ser verificada no ambiente antes de qualquer release; código local não comprova deployment.

## Validação

- Revisão documental e de fontes de código linkadas nesta spec.
- `npm run typecheck` para a validação estática obrigatória do repositório.
- Para futuras mudanças: use os testes indicados em `docs/SEGURANCA_LIMITE_CEL_PEDIDOS.md` e `docs/IDEMPOTENCIA_PEDIDOS.md`, incluindo Emulator Suite ao alterar Rules, transações ou contratos financeiros.

## Evidências de conclusão

- `<preencher após a validação desta baseline documental>`
