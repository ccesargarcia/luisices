**Revisão técnica da branch develop — 30/09/2026**

Base: commit `001047e`, sincronizado com `origin/develop` por `git fetch`. A árvore estava limpa no início. Esta revisão não modifica a implementação, não publica serviços e não acessa dados de clientes.

**Conclusão**

O projeto tem uma base funcional e evoluiu desde a revisão anterior: TypeScript integra o build; criação de pedidos, conversão da lojinha e reatribuição financeira possuem transações; há regras mais restritivas para perfis e galeria; IA e Alexa estão separadas em módulos e têm cobertura de testes relevante. Os riscos restantes concentram-se na diferença entre autorização na interface e no servidor, em alterações não atômicas de dados financeiros/estoque e na publicação incompleta dos componentes de segurança.

Não há evidência suficiente para afirmar comprometimento em produção. Os achados abaixo descrevem comportamento do código versionado. Configurações remotas, IAM, regras efetivamente publicadas, caches da CDN e políticas de cadastro do Firebase Auth não foram inspecionados.

**Verificações executadas**

| Verificação | Resultado |
| --- | --- |
| `npm run build`, incluindo TypeScript | Passou |
| `npm test` | 340 testes passaram, em 31 arquivos |
| `node --check` nos fontes próprios de Functions | 24 arquivos passaram |
| Reproduções isoladas com serviços reais e Firestore simulado | 3 testes confirmaram perda de estoque, perda de histórico e sucesso apesar de falha no ledger |
| Simulação de data com `TZ=America/Sao_Paulo` | Selecionar 30/09 produziu início em 29/09 |
| Auditoria npm, lockfile raiz, sem dependências de desenvolvimento | 8 entradas: 1 crítica, 5 altas, 2 moderadas |
| Auditoria npm, lockfile de Functions, sem dependências de desenvolvimento | 22 entradas: 2 críticas, 6 altas, 12 moderadas, 2 baixas |
| Integração com emuladores / E2E de navegador nesta revisão | Não executados |

As entradas de `npm audit` incluem propagação na cadeia de dependências e não equivalem a vulnerabilidades independentes exploráveis na aplicação. As reproduções usam mocks e não substituem os emuladores. O build emitiu avisos sobre seis referências de assets e chunks grandes; isso, isoladamente, não prova falha visual. Os assets devem ser verificados em um smoke test visual.

**Achados e critérios de correção**

**1. P1 — O convite não é uma condição para criar um perfil autorizado.**

Evidência: [Register.tsx](/home/caiogarcia/luisices/src/app/pages/Register.tsx:42), [firebaseUserService.ts](/home/caiogarcia/luisices/src/services/firebaseUserService.ts:64), [firestore.rules](/home/caiogarcia/luisices/firestore.rules:225).

A tela exige um token, mas `getUserProfile` inicializa qualquer conta autenticada sem perfil como `user`, ativa e com permissões padrão. As regras aceitam essa criação sem consultar convite ou verificação de e-mail. A tela também não exige que a validação do convite tenha terminado com sucesso: após uma falha, `inviteEmail` pode continuar vazio e um token não vazio passa pelas condições de submissão.

Se o cadastro email/senha estiver habilitado como utilizado pelo cliente, uma conta criada diretamente pelo SDK pode obter esse perfil. O efeito ultrapassa dados próprios: regras de loja concedem operações globais ao papel `user`. Isso não é a antiga autopromoção para `admin`, já corrigida; é entrada no sistema sem autorização administrativa.

Melhoria: criar o perfil autorizado exclusivamente após consumo transacional de convite válido no servidor. Contas pendentes precisam de um estado sem acesso operacional. Testar token ausente, inválido, expirado, reutilizado e usuário autenticado ainda sem perfil. Confirmar a política efetiva de cadastro no Firebase Auth.

**2. P1 — Exclusão de usuário pode deixar a autenticação ativa e permitir recriação do perfil.**

Evidência: [functions/index.js](/home/caiogarcia/luisices/functions/index.js:440), [firebaseUserService.ts](/home/caiogarcia/luisices/src/services/firebaseUserService.ts:114).

A Function captura qualquer falha de `admin.auth().deleteUser()` e continua apagando o perfil. No cliente, qualquer erro da callable dispara exclusão direta do perfil. Se a conta Auth continuar existindo, o fluxo de primeiro acesso pode criar novamente um perfil ativo. O frontend pode ainda contornar a rejeição da callable à exclusão do próprio administrador, pois captura essa rejeição como qualquer outro erro.

Melhoria: remover o fallback destrutivo; tratar apenas `auth/user-not-found` como sucesso idempotente; bloquear/revogar a conta antes de concluir a operação; impedir reativação automática enquanto a exclusão estiver pendente. Testar falhas de rede, IAM e exclusão do próprio admin.

**3. P1 — Permissão de edição permite contornar a permissão de exclusão lógica.**

Evidência: [firestore.rules](/home/caiogarcia/luisices/firestore.rules:97), [firebaseOrderService.ts](/home/caiogarcia/luisices/src/services/firebaseOrderService.ts:587).

A exclusão de pedido é um `update` de `deletedAt`. Nas regras, um funcionário atribuído com `orders.edit=true` pode atualizar qualquer campo, exceto proprietário e responsável. Logo, pode definir `deletedAt` mesmo com `orders.delete=false`. Proteger apenas `allow delete` não protege essa operação.

Melhoria: separar alterações de `deletedAt` das edições normais usando a diferença de campos; aplicar a permissão de exclusão também ao soft delete e definir uma regra explícita de restauração. Cobrir isso em testes de regras, usando o SDK diretamente.

**4. P1 — Acompanhamento de produção não tem regra correspondente.**

Evidência: [firebasePricingService.ts](/home/caiogarcia/luisices/src/services/firebasePricingService.ts:714), [PricingCalculatorTab.tsx](/home/caiogarcia/luisices/src/app/components/pricing/PricingCalculatorTab.tsx:179), [firestore.rules](/home/caiogarcia/luisices/firestore.rules).

A tela lê, cria e exclui documentos em `productionTracking`. Não existe `match` para essa coleção nem uma autorização genérica aplicável nas regras atuais. Assim, com essas regras publicadas, as operações pelo SDK web são negadas inclusive ao admin. O fallback de leitura repete a consulta e também falha.

Melhoria: adicionar regras de leitura/criação/edição/exclusão alinhadas à precificação, preservando propriedade e validando campos. Testar permissões por perfil e o fluxo completo de salvar e recarregar o acompanhamento.

**5. P1 — Alterações de pedidos e financeiro ainda podem divergir.**

Evidência: [firebaseOrderService.ts](/home/caiogarcia/luisices/src/services/firebaseOrderService.ts:420), [firebaseLedgerService.ts](/home/caiogarcia/luisices/src/services/firebaseLedgerService.ts:97).

A criação está transacional, mas `updateOrderStatus` e `updateOrder` gravam primeiro `orders` e disparam a sincronização de `salesLedger` sem aguardá-la, apenas registrando falhas no console. Uma alteração de preço ou cancelamento pode aparecer no operacional e não no faturamento. A sincronização também retorna silenciosamente se a venda não existe.

Reprodução isolada: forçando erro no ledger, a atualização do status resolveu com sucesso. Além disso, o campo `version` é lido e incrementado fora de transação e não recebe a versão esperada pela tela; portanto, não impede que duas edições sobrescrevam valores.

Melhoria: transação/batch para alterações relacionadas ou sincronização server-side idempotente com monitoramento e reconciliação. Adotar controle de concorrência com versão esperada nos formulários que substituem conjuntos de campos. Testar falha parcial, venda ausente e edição simultânea.

**6. P1 — Uma edição comum pode apagar histórico e metadados de pagamento.**

Evidência: [OrderDetailsDialog.tsx](/home/caiogarcia/luisices/src/app/components/OrderDetailsDialog.tsx:279), [firebaseOrderService.ts](/home/caiogarcia/luisices/src/services/firebaseOrderService.ts:461).

O formulário sempre recria `payment`, omite `history`, define `notes=null` e redefine `paymentDate` para agora quando há valor pago. O serviço substitui todo o objeto e converte a ausência de histórico em `null`. Alterar apenas o nome do cliente pode, portanto, apagar registros anteriores e mudar a data do pagamento.

Reprodução isolada confirmou que histórico existente vira `null`. Melhoria: usar alterações parciais, preservar campos não editados e representar pagamentos como eventos explícitos. Testar edição de campos não financeiros em pedido com pagamentos anteriores.

**7. P2 — Limpar campos e desmarcar permuta não persiste.**

Evidência: [OrderDetailsDialog.tsx](/home/caiogarcia/luisices/src/app/components/OrderDetailsDialog.tsx:296), [firebaseOrderService.ts](/home/caiogarcia/luisices/src/services/firebaseOrderService.ts:457).

Notas vazias, tags vazias, cor removida e `isExchange=false` são enviados como `undefined`. O serviço ignora `undefined`, mantendo os valores anteriores. Ao recarregar, dados que o usuário removeu voltam; uma permuta pode continuar marcada e afetar filtros e relatórios.

Melhoria: distinguir “não alterar” de “limpar”: usar `null`, `[]`, `false` ou `deleteField()` conforme o contrato. Testar limpeza e recarga para cada campo.

**8. P1 — Aprovação de orçamento não é idempotente.**

Evidência: [QuoteDetailsDialog.tsx](/home/caiogarcia/luisices/src/app/components/quotes/QuoteDetailsDialog.tsx:101).

A tela cria o pedido e só depois marca o orçamento como aprovado. Duas abas podem aprovar o mesmo orçamento, ou uma falha no segundo passo pode levar o usuário a tentar novamente. O bloqueio do botão só atua naquela instância da interface. A conversão da lojinha já tem proteção melhor, mas ela não é usada neste fluxo.

Melhoria: consumir o orçamento, gerar pedido/venda e registrar o vínculo na mesma operação transacional, retornando o resultado existente nas repetições. Testar concorrência entre sessões e falha após a criação.

**9. P1 — Compras e estoque não têm consistência transacional.**

Evidência: [firebasePricingService.ts](/home/caiogarcia/luisices/src/services/firebasePricingService.ts:455).

O histórico é criado antes da atualização do insumo. O estoque é calculado por leitura seguida de `oldStock + quantity`, e erros da atualização são engolidos. Duas compras simultâneas podem perder um incremento.

Reprodução: estoque inicial 10, duas compras de 5; foram criados dois históricos, mas o estoque final foi 15, quando deveria ser 20. Excluir uma compra também apenas remove o histórico; não existe estorno explícito da movimentação. Se a exclusão serve para corrigir uma entrada errada, o saldo fica incorreto.

Melhoria: registrar compra e movimentação com chave idempotente e transação; usar incremento atômico quando adequado. Definir cancelamento/estorno em vez de apagar movimentações relevantes ao saldo. Testar concorrência, falha parcial, repetição e cancelamento.

**10. P1 — Pedidos antigos podem desaparecer da visão operacional.**

Evidência: [OrdersContext.tsx](/home/caiogarcia/luisices/src/contexts/OrdersContext.tsx:144), [useFirebaseQuotes.ts](/home/caiogarcia/luisices/src/hooks/useFirebaseQuotes.ts:35).

As consultas retornam os 200 documentos mais recentes por criação, sem paginação para recuperar os demais. Um pedido antigo ainda pendente pode deixar de aparecer depois de 200 registros mais novos. Agenda, alertas, busca e filtros trabalham sobre esse subconjunto. Nos orçamentos, o limite também afeta indicadores e a expiração feita pelo cliente.

Melhoria: consultar os pedidos operacionais por status/prazo e paginar o histórico. Executar busca e agregações no escopo completo. Testar mais de 200 documentos com pedido antigo pendente e entrega futura.

**11. P2 — Filtro personalizado desloca datas em fusos brasileiros.**

Evidência: [useSalesLedger.ts](/home/caiogarcia/luisices/src/hooks/useSalesLedger.ts:59).

`new Date('YYYY-MM-DD')` é interpretado em UTC; em seguida, `setHours()` aplica o horário local. Em `America/Sao_Paulo`, o início selecionado como 30/09/2026 virou 29/09/2026 às 00h. Isso inclui/exclui vendas do dia errado.

Melhoria: interpretar componentes de calendário no fuso definido para o negócio e padronizar esse contrato entre relatórios, pedidos e IA. Testar início/fim de mês em UTC e São Paulo.

**12. P2 — A recuperação do Firestore termina a instância sem restaurá-la.**

Evidência: [firebase.ts](/home/caiogarcia/luisices/src/lib/firebase.ts:53), [main.tsx](/home/caiogarcia/luisices/src/main.tsx:58).

O handler de erro chama `terminate(db)` e limpa a persistência. A constante `db` continua sendo usada pelos serviços; não há recriação da instância nem recarga controlada. Após o mecanismo de recuperação, a aplicação pode continuar aberta com uma instância encerrada. Limpeza de persistência também exige considerar gravações locais ainda não sincronizadas.

Melhoria: implementar um ciclo explícito de recuperação, com estado visível, proteção de dados pendentes e reinicialização/recarga limitada. Testar falha de SDK, modo offline e múltiplas abas. Não suprimir a telemetria do incidente sem registrar resultado da recuperação.

**13. P1 — Preço e disponibilidade da lojinha não são impostos pelo servidor.**

Evidência: [firebaseCatalogOrderService.ts](/home/caiogarcia/luisices/src/services/firebaseCatalogOrderService.ts:51), [firestore.rules](/home/caiogarcia/luisices/firestore.rules:354).

A auditoria de preço roda no navegador. A criação pública de `catalogOrders` valida apenas parte da estrutura, aceita subtotal não negativo sem conferi-lo com o catálogo e não valida individualmente os itens. Também não exige que a loja esteja publicada e recebendo pedidos. Um cliente pode enviar diretamente preço reduzido e `isPriceTampered=false`; a conversão usa o subtotal recebido para criar o pedido de produção.

Melhoria: endpoint público com validação estrutural, cálculo de preços confiáveis, limites de quantidade, verificação de disponibilidade, idempotência e controle de abuso. Reservar campos de auditoria/conversão para gravação confiável. Testar subtotal adulterado, produto pausado/oculto e loja fechada.

**14. P2 — Session Replay permite captura de informações exibidas nas telas.**

Evidência: [sentry.ts](/home/caiogarcia/luisices/src/lib/sentry.ts:28).

O Replay está com `maskAllText=false`, `blockAllMedia=false` e coleta em 100% das sessões com erro. Como o aplicativo exibe nomes, telefones, pedidos, e-mails e mensagens, esses conteúdos podem integrar o replay. Não localizei marcações de mascaramento específicas nas telas. Não foi consultado o conteúdo efetivamente enviado ao Sentry.

Melhoria: mascaramento por padrão e bloqueio de áreas sensíveis, liberando apenas componentes necessários ao diagnóstico. Validar o replay de um fluxo com dados sintéticos e verificar políticas de retenção/acesso do serviço.

**15. P1 — Dependências de produção precisam de triagem e atualização controlada.**

Evidência: auditorias npm consultadas em 30/09/2026 para os dois lockfiles.

Raiz: 8 entradas, incluindo `websocket-driver`, `@grpc/grpc-js`, `dompurify`, `fflate` e `xlsx`. Functions: 22 entradas, incluindo `protobufjs`, `websocket-driver`, `node-forge`, `path-to-regexp`, `form-data` e dependências de Firebase Admin/Resend.

A aplicabilidade deve considerar execução browser versus Node, recursos utilizados e exposição. Por exemplo, há uso de `xlsx` para exportação; não identifiquei importação de planilhas nesse fluxo, o que importa para avaliar os avisos. O npm propôs downgrade de Firebase em parte da cadeia: não aplicar `audit fix --force` indiscriminadamente.

Melhoria: atualizar transitivas compatíveis primeiro, avaliar migrações separadamente, repetir testes e construir uma matriz pacote/versão/caminho de execução. Auditar os dois projetos em CI e distinguir avisos aceitos dos bloqueantes.

**16. P2 — Publicação não garante alinhamento entre frontend, Functions e regras.**

Evidência: [deploy-dev.yml](/home/caiogarcia/luisices/.github/workflows/deploy-dev.yml:85), [deploy-functions-manual.yml](/home/caiogarcia/luisices/.github/workflows/deploy-functions-manual.yml:138), [deploy.yml](/home/caiogarcia/luisices/.github/workflows/deploy.yml).

O deploy de develop publica Hosting e Firestore, mas não Storage. O caminho manual de dev também omite Storage; o de produção o inclui quando solicitado. Frontend de produção e Functions/regras seguem caminhos separados. Uma correção versionada em `storage.rules` pode não estar ativa no ambiente em que o frontend é testado.

Melhoria: resolver o bloqueio de publicação de Storage com a permissão/IAM apropriada e criar um fluxo coordenado, com seleção explícita de projeto e verificação das versões implantadas. O código local não permite afirmar quais regras estão atualmente publicadas.

**17. P2 — A suíte de regras não é um gate de CI e o lint de Functions é fictício.**

Evidência: [package.json](/home/caiogarcia/luisices/package.json:47), [test-actions.yml](/home/caiogarcia/luisices/.github/workflows/test-actions.yml:67), [functions/package.json](/home/caiogarcia/luisices/functions/package.json:5).

Existe `test:integration`, mas nenhum workflow examinado o executa. O CI executa unitários e E2E; isso é positivo, mas não substitui os testes diretos de regras. O script `lint` de Functions apenas imprime `Linting skipped`. Instalações com `npm install` e CLI global também reduzem a reprodutibilidade em relação ao lockfile.

Melhoria: adicionar o gate de integração com projeto `demo-*`, lint/sintaxe real, `npm ci` e versão de CLI controlada. Manter casos negativos de autorização e falhas parciais; uma grande quantidade de testes com mocks não detecta uma coleção ausente nas regras.

**18. P2 — Consultas precisam conciliar completude e custo.**

Evidência: [firebaseLedgerService.ts](/home/caiogarcia/luisices/src/services/firebaseLedgerService.ts:21), [OrdersContext.tsx](/home/caiogarcia/luisices/src/contexts/OrdersContext.tsx:88).

O ledger agora carrega todo o histórico e filtra por período no cliente. Isso corrige os totais truncados, mas cresce em leituras, memória e trabalho de renderização. Pedidos e perfis têm listeners recriados na retomada de foco/conexão. Não medi cobrança real nem latência em dispositivos.

Melhoria: intervalos no servidor, paginação para linhas e agregações completas para totais, com índices correspondentes. Preservar o listener enquanto estiver saudável e medir leituras por sessão. Não reintroduzir um limite arbitrário de 200 para melhorar desempenho.

O build gerou aproximadamente 915 kB de Firebase (222 kB gzip), 625 kB de PDF (185 kB gzip), 421 kB de gráficos (113 kB gzip) e 388 kB do chunk principal (100 kB gzip). Esses números são tamanhos de artefatos, não medição do carregamento inicial; PDF e outras funções já usam imports dinâmicos. Medir a rota pública e o painel separadamente antes de otimizar os chunks.

**19. P3 — Componentes extensos elevam o custo e o risco de manutenção.**

Evidência: `StoreCustomization.tsx` tem 5.298 linhas; `PublicCatalog.tsx`, 2.956; `functions/alexa/dialog.js`, 2.711.

Persistência, validação, estado e apresentação aparecem concentrados nesses módulos. Contratos de permissões e normalização também existem em múltiplas camadas, facilitando divergências. O problema não é apenas o número de linhas: alterações pontuais exigem entender muitos efeitos e fluxos relacionados.

Melhoria: extrair gradualmente seções de UI, hooks de formulário e serviços de domínio; adotar DTOs/validação na entrada e testes de contrato entre web, IA e Alexa. Usar a modularização já iniciada em IA como referência. Evitar uma reescrita geral antes de estabilizar os fluxos de dados.

**Sequência de trabalho sugerida**

1. Fechar autorização: convite/perfil, exclusão de usuário, soft delete e regras de acompanhamento. Incluir casos negativos no CI e confirmar publicação das regras.
2. Proteger dados: transações de atualização financeira, orçamento e estoque; preservação de pagamentos; limpeza explícita de campos; testes de concorrência e falha parcial.
3. Corrigir completude e confiabilidade: pedidos acima de 200, fuso dos filtros, recuperação do Firestore e validação server-side do checkout.
4. Tratar exposição e operação: mascaramento de replay, triagem de dependências, publicação coordenada e testes de integração obrigatórios.
5. Medir desempenho e refatorar por domínio, preservando o comportamento já coberto.

Antes de considerar uma rodada encerrada, exigir: build e TypeScript verdes; unitários e regras em emulador verdes; smoke E2E de pedido, orçamento, estoque, loja e perfis; teste de recuperação após falha; conferência do ambiente publicado. Não é possível prometer ausência de regressões apenas com compilação ou mocks.
