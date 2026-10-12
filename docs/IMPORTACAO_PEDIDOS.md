# Importação de pedidos: revisão e validação de segurança

Revisão de 11/10/2026. Escopo: leitura de `.xlsx`, `.xls` e `.csv`, edição e seleção na prévia, cadastro automático de clientes e criação de pedidos e registros no ledger. Esta revisão não constitui auditoria completa de todos os módulos do sistema nem garantia de ausência de vulnerabilidades futuras.

## Fluxo e fronteira de confiança

O arquivo é lido no navegador; não é enviado ao backend. O usuário revisa os dados normalizados, edita linhas e decide quais importar. Os dados selecionados passam por nova validação em `executeOrdersImport`, que usa os serviços de clientes e pedidos. Cada pedido, contador e registro no ledger são criados na mesma transação do Firestore; o cadastro do cliente ocorre antes, em uma operação separada.

`firebaseOrderService` é código frontend, apesar do nome: sua validação não substitui o servidor. A barreira independente é `firestore.rules`, avaliada pelo Firestore em cada gravação autenticada, inclusive quando alguém ignora a interface e usa diretamente o SDK. O Admin SDK utilizado por Cloud Functions não é submetido a essas regras; os outros fluxos que o utilizam exigem validação própria e não fazem parte deste importador.

## Achados e correções

| Prioridade | Achado verificado | Correção aplicada | Evidência |
| --- | --- | --- | --- |
| Alta | Leitura de arquivos arbitrários com SheetJS 0.18.5, afetado por CVE-2023-30533 e CVE-2024-22363 | Atualização para 0.20.3 pela distribuição oficial, fixada no manifest e lockfile | Avisos do fornecedor; testes de leitura, geração de modelo e build |
| Alta | Regras anteriores aceitavam pedidos sem campos essenciais e sem limites completos | Campos obrigatórios, tipos, limites, nomes não vazios, datas reais, contatos, notas e etiquetas verificados no servidor | Testes de gravação direta sem passar pela UI |
| Alta | Permissão de criação negada na tela não impedia o proprietário de criar diretamente | Permissão de criação de pedidos e clientes respeitada no Firestore; permissões administrativas e defaults legados preservados | Contas restritas, funcionários e contas desativadas negadas no emulador |
| Alta | `customerId` podia apontar para cliente de outra conta | Existência do cliente e igualdade entre proprietário do cliente e do pedido exigidas | Referências inexistentes e de outra conta negadas |
| Alta | Valores de pagamento não eram obrigados a corresponder ao total e ao saldo | Total igual ao preço; valor pago entre zero e o total; saldo coerente; estados e método validados | Pagamentos adulterados negados e pagamentos legítimos aceitos |
| Alta | Uma gravação inicial válida poderia ser seguida de alteração inválida | Mesmos limites de campos na atualização; data, vínculo e pagamento revalidados quando alterados | Tentativas via `updateDoc` negadas |
| Média | Resultado de leitura atrasado podia reaparecer após fechar o modal | Leituras canceladas ou substituídas são ignoradas por versão de processamento | Teste de fechar durante leitura e reabrir sem prévia antiga |
| Média | Sem limites de arquivo, linhas e extensão real da planilha | 10 MB, 1.000 pedidos, 64 colunas, leitura limitada e verificação de assinatura/conteúdo | Arquivos grandes, excesso de linhas e conteúdo incompatível rejeitados; CSV Unicode preservado |
| Média | Valores negativos, textos não numéricos e quantidades fracionárias podiam ser normalizados silenciosamente | Dados financeiros lidos pelo valor bruto da célula; entradas inválidas marcadas para correção; formatação monetária não muda o valor numérico | Casos unitários para dados malformados e moeda formatada |
| Média | Método ausente podia gerar histórico artificial como Pix | O valor pago é preservado sem inventar método; histórico individual é criado somente quando há método informado | Caso unitário de pagamento quitado sem método |
| Média | Correspondência por nome podia prevalecer mesmo com telefone informado diferente | Nome só é usado como fallback quando o telefone está ausente | Caso unitário de clientes homônimos com telefones distintos |
| Média | Falha no cadastro automático podia ser ignorada, importando sem o cliente solicitado | Falha registrada na linha e pedido não criado nesse caso | Tratamento explícito no executor |

O parser não executa fórmulas ou macros como código. A leitura desabilita a extração de fórmulas e HTML das células; os valores são tratados como dados. A interface apresenta textos como conteúdo React, sem usar `dangerouslySetInnerHTML` neste fluxo. Isso não dispensa acompanhar novos avisos da biblioteca ou revisar consumidores futuros dos dados.

## Contrato dos dados

- Cliente: nome obrigatório até 200 caracteres; telefone até 50 caracteres; e-mail opcional válido até 254 caracteres para cadastro.
- Produto: nome obrigatório até 300 caracteres.
- Quantidade: inteiro de 1 a 10.000.
- Valor total: finito, não negativo, até R$ 1.000.000. Valor pago entre zero e o total; saldo recalculado. Os estados pendente, parcial e pago devem corresponder aos valores.
- Entrega: data ISO `YYYY-MM-DD` de calendário válida. Datas históricas continuam permitidas, pois a importação pode cadastrar pedidos antigos. Datas inferidas pelo parser precisam ser revistas pelo usuário.
- Observações: até 1.000 caracteres.
- Etiquetas: até 20, com nomes de até 80 caracteres e cores hexadecimais. Elementos malformados também são negados pelo servidor.
- Seleção: filtros não alteram os pedidos escolhidos. A UI bloqueia confirmação com seleção vazia, erros selecionados ou edição aberta. O executor revalida o lote antes de iniciar operações.

A autenticação, atividade da conta e revogação de sessão continuam sendo verificadas pelas regras. Usuários comuns não podem criar pedidos de outra conta. Administradores mantêm os privilégios administrativos existentes; esse acesso não deve ser apresentado como isolamento absoluto entre administradores e parceiros.

## Validação executada

- Build com typecheck e build Vite aprovados.
- 896 testes unitários aprovados, incluindo limites, conteúdo incompatível, CSV Unicode, valores numéricos, revisão, seleção e gravação seletiva.
- 75 testes de integração aprovados no emulador: 48 de segurança/importação e 27 regressões de Firestore. Incluem o fluxo real de planilha → edição → seleção → serviços frontend → regras do servidor → cliente, pedido e ledger.
- Checagem de navegador com o modal real em cinco tamanhos e três temas, usando parsing/gravação simulados. Verifica filtros, edição, correção de erros, descarte, seleção independente dos filtros, conteúdo enviado e limites do modal. Testes de navegador não são evidência de gravação em produção.

A regressão de Storage `mantém galeria e rascunhos privados e imagens de apresentação públicas` falhou ao subir a imagem de galeria no emulador. A mesma falha foi reproduzida no commit anterior às correções desta revisão (`8ede1d0`), em checkout separado. Esse teste foi excluído da execução de regressão aprovada acima; as regras de Storage não foram modificadas. Não é correto declarar toda a suíte de integração aprovada.

## Deploy e limites restantes

As proteções de servidor só entram em vigor após deploy de `firestore.rules` no ambiente correspondente. O workflow `deploy-dev.yml` detecta alterações nas regras e possui etapa específica de deploy. O frontend e as regras precisam ser publicados juntos; um push ou build bem-sucedido, isoladamente, não comprova que as regras ativas foram atualizadas.

- O limite de arquivo e de pedidos por lote protege o fluxo do navegador; não é rate limit de gravações no servidor. Um usuário autorizado ainda pode enviar muitas gravações válidas. Para impor limite global por lote, quotas e controle de abuso, será necessário um endpoint backend específico de importação.
- Limites de tamanho, linhas e colunas reduzem exposição a consumo excessivo; não garantem imunidade a todos os arquivos comprimidos maliciosos nem isolamento de CPU/memória. Worker com timeout ou processamento isolado no servidor é evolução recomendada para disponibilidade.
- Não há idempotência do lote: importar novamente a mesma planilha pode criar novos pedidos. A seleção permite revisão, mas não substitui uma chave persistente de importação.
- Cliente e pedido não são gravados atomicamente juntos. Se o cliente for criado e a transação do pedido falhar depois, pode restar um cliente sem pedido. O resultado apresenta a falha; a transação de pedido/contador/ledger continua atômica.
- Um lote pode concluir parcialmente. Reimportar tudo sem conferir o resumo pode duplicar pedidos que já tiveram sucesso.
- As regras e testes desta revisão não substituem revisão das Cloud Functions, política geral de acesso de outros módulos ou auditoria contínua das demais dependências.

## Reprodução e fontes

Os testes usam apenas dados fictícios e projetos de emulador. Não executar as evidências contra produção.

```bash
npm test
npm run build
firebase emulators:exec --config firebase.test.json --project demo-luisices-review --only firestore,storage "npx vitest run --config vitest.integration.config.ts tests/integration/import-orders-security.test.ts tests/integration/firebase-regressions.test.ts --testNamePattern='^(?!.*Storage).*'"
node scripts/check-import-dialog-responsiveness.mjs
```

A versão atual do Firebase CLI requer Java 21 ou superior. A checagem de navegador requer Chromium do Playwright; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` permite indicar um executável alternativo.

Fontes de implementação: [importador](../src/app/utils/importOrdersExcel.ts), [revisão](../src/app/utils/importOrdersReview.ts), [modal](../src/app/components/orders/ImportOrdersDialog.tsx), [regras](../firestore.rules), [testes de segurança](../tests/integration/import-orders-security.test.ts).

Fontes externas: [CVE-2023-30533 — SheetJS](https://cdn.sheetjs.com/advisories/CVE-2023-30533), [CVE-2024-22363 — SheetJS](https://cdn.sheetjs.com/advisories/CVE-2024-22363), [distribuição oficial de SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).

## Diagnóstico de falhas no celular — 12/10/2026

O resumo permanece aberto até ser dispensado. O callback de atualização do dashboard só é executado ao fechar o resultado: o recarregamento de pedidos ativa o estado de carregamento e desmontava o modal imediatamente após uma importação parcialmente bem-sucedida, ocultando os motivos das falhas.

Cada falha informa a linha, a etapa (cadastro do cliente ou gravação do pedido), a mensagem e, quando disponível, o código retornado pelo SDK. Exceções anteriores à execução também permanecem no resumo. As mensagens de permissão e indisponibilidade têm texto em português, sem flexibilizar as regras do servidor. O resumo diferencia sucesso completo, parcial e falha total. Não há repetição automática; os pedidos já salvos não devem ser reimportados.

A imagem com o aviso genérico não permite determinar a causa histórica da recusa. É necessário consultar o diagnóstico por linha antes de decidir uma correção de dados ou permissões. A validação adicional cobre falhas de cliente/pedido e os resultados parcial e fatal no modal real em navegador, com atualização do dashboard simulando a desmontagem.

## Correção de `permission-denied` na gravação com etiquetas

A reprodução local revelou um defeito nas regras introduzidas na validação de importação: pedidos válidos com cinco ou mais etiquetas podiam exceder o limite de 1.000 expressões avaliadas pelo Firestore. A operação atômica de pedido, contador e ledger era recusada com `permission-denied`. A mensagem do cliente não distingue esse limite de uma recusa comum de autorização; a evidência veio do emulador, sem acesso aos dados reais da planilha enviada pelo usuário.

A validação de etiquetas foi compactada, com curto-circuito para posições inexistentes e uma expressão regular limitada para nome/cor. O separador NUL usado somente durante a avaliação é proibido nos campos, impedindo ambiguidades na concatenação. O mapa deve conter exatamente os dois campos obrigatórios. Nomes são normalizados na revisão removendo espaços nas extremidades; o backend exige nomes de 1 a 80 caracteres, sem espaços nas extremidades ou NUL, e cores hexadecimais de seis ou oito dígitos. O limite de 20 etiquetas foi mantido.

Os helpers de perfil/permissões e pagamento evitam avaliações repetidas. Perfil ausente, desativação e revogação temporal continuam negando operações; o vínculo de cliente continua exigindo proprietário correspondente. Campos obrigatórios ausentes ou com tipo incompatível falham na avaliação, sem abrir acesso.

A regressão executa lotes reais de 11 pedidos no emulador com 0, 1, 5 e 20 etiquetas, incluindo conta administrativa, centavos e pagamentos parcial/quitado. Verifica também alterações posteriores de preço/pagamento e adulterações na última etiqueta, campos ausentes, tipos incorretos, campos extras e tentativas de injetar o separador.

Na atualização, etiquetas são revalidadas quando esse campo muda; valores monetários alterados passam pela validação completa de consistência, evitando avaliar novamente a mesma condição na validação legada de pagamento. Evidência final desta correção: 91 testes de integração Firestore passaram (64 de segurança/importação e 27 de regressão), com o teste conhecido de Storage excluído; 35 testes unitários de importação/revisão passaram e o build com TypeScript concluiu com sucesso.
