# Análise da branch `fix/melhorias-develop-2026-09-30`

Data: 01/10/2026. A branch aponta para o mesmo commit de `develop` (`001047e`); portanto, nesta cópia, não há commits novos na branch. As melhorias estão em 32 arquivos modificados e arquivos novos ainda não commitados. A comparação abaixo considera esse diff local. Foi uma revisão estática: não executei testes nesta rodada e as evidências de execução da reverificação anterior correspondem a uma versão anterior desses ajustes.

## O que melhorou

1. **Cadastro por convite:** perfil não é mais criado automaticamente no cliente; a criação passa por `completeUserInvitation`, valida o e-mail do convite e consome convite/perfil em transação. A regra Firestore agora impede usuário de criar o próprio perfil. O cadastro só termina após ação de verificação de e-mail na interface.
2. **Exclusão de conta:** o cliente não apaga o perfil diretamente quando a callable falha. A Function tenta desativar o perfil antes de excluir Auth e registra erro se a exclusão Auth falhar. A falha ao desativar agora interrompe o processo.
3. **Autorização de pedidos:** regra de edição separa alteração normal de `deletedAt` e protege `userId`/atribuição; exclusão lógica requer permissão própria. Foram incluídas regras para `productionTracking`.
4. **Pedidos e financeiro:** transações de edição, mudança de status e atualização de workflow agora leem pedido e ledger antes de escrever. Isso corrige a ordem inválida identificada na reverificação anterior. Ausência de ledger é reconstruída nos caminhos principais de atualização de pedido.
5. **Campos financeiros e editáveis:** o formulário preserva histórico e data de pagamento, transmite remoções explícitas (`null`, listas vazias e `false`) e envia a versão capturada na tela para conflito de edição. O cálculo do saldo restante foi ajustado para preservar ou recalcular o valor quando o patch é parcial.
6. **Orçamento:** conversão foi incorporada à transação que cria pedido e lançamento financeiro, vinculando estado aprovado e ID do pedido para reduzir duplicações em repetição.
7. **Compras:** histórico e atualização de estoque agora são escritos na mesma transação, com chave de idempotência. Cancelamento de compra tem estado auditável e separa exclusão do histórico de estorno.
8. **Checkout:** serviço cliente exige a callable e remove fallback Firestore. O servidor verifica configuração da loja, preços, produtos e quantidades; preserva itens com personalizações distintas; usa ID determinístico e transação para repetição idempotente. A tela usa o código oficial e interrompe a confirmação se houver erro.
9. **Consultas e datas:** o hook financeiro agora utiliza consulta por intervalo quando informado. Pedidos ativos e histórico foram separados; datas civis usam parser local.
10. **Qualidade e privacidade:** integração de regras e verificação de sintaxe de Functions entraram no CI; Replay mascara texto e bloqueia mídia por padrão. XLSX passou para carregamento sob demanda.

## O que ainda falta ou merece correção

### 1. Regras públicas continuam permitindo escrita direta em `catalogOrders`

Apesar do comentário em `firestore.rules:389` dizer que o público cria via Function, `allow create` em `:391` permite a qualquer perfil ativo com `role == 'user'` ou permissão de loja gravar diretamente. A Function valida o pedido; essa regra não valida preços, status do produto ou campos internos. O fallback foi removido, mas um cliente autenticado pode contornar a callable com o SDK.

Definir o modelo de acesso pretendido e restringir a regra para que pedidos públicos sejam criados somente pela Function/Admin SDK. Cobrir explicitamente a tentativa direta autenticada nos testes de regras.

### 2. Convites dão papel `user`, enquanto várias regras tratam esse papel como acesso amplo

`completeUserInvitation` define `role: 'user'` e permissões relativamente restritas (`functions/index.js:266-288`). Porém, em `firestore.rules`, diversas regras de loja permitem leitura/escrita diretamente quando `role == 'user'`, sem respeitar o mapa de permissões. Isso inclui configurações, produtos e pedidos da loja. A intenção do papel precisa ser definida: se convite representa funcionário, criar papel e escopo corretos; se representa proprietário, alinhar as permissões exibidas com o acesso real. O fluxo atual cria uma divergência entre autorização mostrada e autorização efetiva.

### 3. Idempotência pública não compara o conteúdo da operação repetida

A chave produz um ID determinístico e a gravação é transacional, o que elimina a corrida que existia quando duas chamadas faziam consulta seguida de `add`. Porém, se a mesma chave for usada com outro carrinho/total, a Function retorna o recibo existente sem comparar o payload (`functions/index.js:1980-1991`). A interface mantém a chave após erro; em uma resposta perdida, mudança do carrinho e retry, pode abrir WhatsApp com novos itens enquanto o pedido persistido é o anterior.

Guardar uma representação/hash dos campos relevantes e rejeitar reutilização da chave com conteúdo diferente. Manter a mesma chave apenas para retry da mesma operação.

### 4. Checkout abre WhatsApp depois de uma chamada assíncrona

`PublicCatalog.tsx:952-1002` só chama `window.open` após aguardar a Cloud Function. Navegadores podem bloquear a nova janela por não estar diretamente associada ao gesto de clique. A confirmação local aparece, mas a conversa pode não abrir. Validar em navegador real/E2E e usar um fluxo compatível com bloqueio de pop-up, por exemplo abrir uma janela autorizada no gesto e depois navegar ao URL calculado.

### 5. Consultas operacionais ainda têm tetos fixos e fallback truncado

`OrdersContext.tsx` limita pedidos operacionais a 1000, histórico a 200 e fallback a 200. `useFirebaseQuotes.ts` limita ativos a 500, histórico a 200 e fallback a 200. Separar estados melhora a consulta comum, mas não prova completude acima desses limites. A expiração dos orçamentos ainda é processada apenas nos documentos carregados. Falta paginação ou agregação completa, além de teste com volume acima dos limites.

### 6. Ledger ausente no workflow ainda não é recriado

`updateProductionWorkflow` atualiza `orders` em transação. Se o ledger não existe, não cria um; somente atualiza ledger quando `saleSnap.exists()`. Os caminhos `updateOrder` e `updateOrderStatus` fazem reconstrução, mas o caminho do workflow pode continuar deixando pedido e financeiro divergentes.

### 7. Leituras de documentos inexistentes foram liberadas sem escopo por usuário

Para viabilizar a checagem de idempotência de compra, `firestore.rules:235-240` e `:248-253` permitem `resource == null` para qualquer usuário autenticado em `supplies` e `purchaseHistory`. Isso não revela o conteúdo de documentos inexistentes, mas libera consultas diretas de IDs arbitrários e permite distinguir “não existe” de “existe sem permissão”. Restrinja a leitura do documento de idempotência a uma chave no escopo do proprietário ou use uma operação de servidor. Regras de `pricingRecipes` também receberam o mesmo padrão e devem ser justificadas pelo uso real.

### 8. Exclusão de usuários ainda ignora falha de revogação

Agora falha ao desativar perfil bloqueia a operação, o que é uma melhora importante. Ainda assim, erro de `revokeRefreshTokens` é apenas registrado (`functions/index.js:478-485`) e a exclusão Auth continua. Avaliar se a desativação Firestore basta para todos os serviços e regras; se revogação for parte do contrato, registrar estado pendente e permitir retomada, sem declarar concluída.

### 9. `expectedVersion` é opcional nos fluxos de alteração de status

O formulário de edição transmite a versão, mas chamadas em Dashboard, calendário, trocas e copiloto continuam invocando `updateOrderStatus` sem `expectedVersion`. A transação evita gravações parciais, mas esses fluxos ainda podem sobrescrever uma mudança de estado feita por outra tela. Decidir se status deve usar concorrência otimista e fornecer versão aos chamadores.

### 10. `npm audit` e distribuição continuam como itens separados

Atualizar dependências é positivo, porém precisa de auditoria atual e compatibilidade medida antes de declarar risco resolvido. O workflow ainda instala com `npm install` e instala Firebase CLI globalmente sem versão explícita; prefira lockfiles e ferramenta fixada. Os workflows de deploy não foram alterados neste diff para coordenar frontend, Functions, regras, índices, Storage e Alexa.

### 11. Recuperação Firestore ainda precisa comprovar preservação offline

A função agora tenta recarregar a página também quando limpar persistência falha, o que trata o estado `terminated` melhor. Porém, encerrar a instância e limpar IndexedDB pode descartar gravações offline pendentes; cooldown em `sessionStorage` não prova que os dados foram preservados. Faltam testes do ciclo real com múltiplas abas, falha e gravações pendentes.

### 12. Otimização visual não comprova desempenho nem modularização

Import dinâmico de XLSX e divisão de chunks são mudanças úteis. `chunkSizeWarningLimit: 1000` só reduz avisos, não o tamanho; o bundle Firebase continua sendo uma área para medir. A extração dos módulos grandes previstos no plano ainda não aparece no diff. Medir carregamento inicial, rota de relatórios e exportações antes de declarar ganho.

## Leitura da matriz de progresso

`docs/PROGRESSO_MELHORIAS_DEVELOP.md` marca os 19 achados como concluídos e registra 378 unitários, 21 integrações e build aprovados. Isso pode servir como histórico de execução da versão em que esses comandos foram rodados, mas não demonstra que o estado atual do diretório foi validado após os ajustes mais recentes. Recomendo atualizar estados para separar “implementado no diff”, “testado no snapshot atual” e “validado externamente”.

## Próximas prioridades

1. Restringir criação direta de `catalogOrders` e alinhar papel/permissões de usuários convidados.
2. Rejeitar replay idempotente cujo conteúdo difere e garantir que WhatsApp abra após checkout.
3. Completar os limites de consulta e reconstrução do ledger no workflow.
4. Escopar leituras de IDs inexistentes e definir o contrato de revogação de sessão.
5. Executar testes e build sobre o snapshot final da branch, incluindo regras de acesso direto, conversões concorrentes e E2E do fluxo completo de checkout.

Não foi feita validação nesta rodada; os itens acima descrevem leitura estática do diff atual. A branch ainda não tem commits além da base `develop`, e as alterações seguem no working tree.
