# Operação e recuperação

Este documento registra o procedimento de validação, auditoria e recuperação para pedidos. As correções de dados exigem leitura e revisão do relatório antes de qualquer gravação.

## Validar o fluxo financeiro

O E2E de pedidos cobre preço em reais, pagamento parcial, vários produtos e conclusão do pedido. Para rodar somente os cenários de integridade no GitHub Actions, inicie o workflow **Playwright Tests** ou **E2E Tests** com o alvo `order-integrity`. O teste usa emuladores e não grava dados no projeto de produção.

O workflow completo também roda em pull requests para `develop` e `main`. Alterações de frontend e regras passam pelo workflow de desenvolvimento antes do deploy em `develop`.

## Tentativa de pedido sem confirmação

Ao receber timeout, utilize a ação de confirmar a tentativa pendente no modal/calculadora. Ela preserva a chave e o payload e consulta o resultado pela Function; não é uma nova compra. Na edição, a confirmação reconhece o recibo original e depois carrega o pedido atual do servidor. Não limpe a sessão do navegador nem recrie o pedido enquanto o resultado for desconhecido.

A retomada automática limita-se aos fluxos descritos em [Idempotência de pedidos](IDEMPOTENCIA_PEDIDOS.md), na mesma sessão. Em importação, novo dispositivo ou sessão apagada, confira a lista/resultado das linhas e os registros existentes antes de repetir. Anexos e estoque têm operações próprias e precisam de conferência em uma interrupção nesses passos.

## Auditar pedidos existentes

Configure `.env.local` com a configuração Firebase e as variáveis `FIREBASE_ADMIN_EMAIL` e `FIREBASE_ADMIN_PASSWORD`. A conta precisa ter perfil de administrador ativo.

```sh
# Amostra somente leitura para validar a configuração
npm run audit:orders -- --limit=100

# Varredura somente leitura da coleção, com relatório JSON
node scripts/audit-order-integrity.mjs --json
```

A varredura completa lê todos os pedidos e o custo cresce com o tamanho da coleção. O relatório não inclui nome, telefone ou outros dados pessoais; inclui ID, número do pedido e os códigos dos achados. Use `--fail-on-findings` quando precisar que a execução retorne falha se encontrar inconsistências.

Os achados são triagem, não correções automáticas. Em particular, um valor unitário com frações de centavo pode ter sido inferido a partir do total e da quantidade. O relatório sinaliza essa possibilidade, mas não tenta adivinhar o preço original do produto.

## Corrigir valores negativos

`scripts/fix-negative-values.mjs` exige autenticação de administrador e agora simula por padrão. Revise a saída antes de autorizar gravações:

```sh
npm run fix-negative-values
npm run fix-negative-values -- --apply
```

`--apply` grava correções em clientes, pedidos, orçamentos e produtos. Nos pedidos, a atualização usa transação e incrementa a versão. Pedidos em que o valor recebido supera o novo total ou têm dados inválidos são encaminhados para conciliação manual. Antes de executar `--apply` em produção, faça uma exportação ou confirme que existe um backup recuperável e guarde o relatório da auditoria.

## Investigar falhas

1. Consulte o resumo e os artefatos do workflow no GitHub Actions. Separe falha de build, teste, regras e deploy.
2. Para erros de interface, consulte o Sentry do ambiente correspondente. Para Functions, consulte erros e latência no Sentry e nos logs do Cloud Functions.
3. Para `permission-denied`, confirme identidade, perfil ativo e permissões antes de alterar regras. Para conflitos de versão, recarregue o pedido e repita a ação sobre a versão atual.
4. Se houver divergência entre pedido e ledger, preserve os IDs e horários dos registros e use a rotina de auditoria. Não tente reparar ledger e pedido com gravações independentes.

O código já inicializa Sentry no frontend e nas Functions e aplica sanitização de dados. Os DSNs precisam estar configurados nos secrets do ambiente. A configuração de alertas do Sentry/Cloud Monitoring é feita nos respectivos painéis; este repositório não confirma que essas políticas estejam ativas.

## Publicar em produção após validação

O workflow de E2E continua configurado para pull requests em `develop` e `main`. O deploy de produção não repete a suíte: ao receber o merge em `main`, executa o build do frontend e publica o GitHub Pages. Mudanças em `firebase.json` ou nos arquivos de regras também publicam Firestore Rules, índices, regras do Realtime Database e Storage.

Mudanças em `functions/**` ou `firebase.json` acionam o deploy automático das Firebase Functions em produção. O deploy roda o lint de predeploy, mas não os testes E2E/unitários. Ele preserva os valores e versões existentes no Secret Manager; inclusão ou rotação de secrets continua sendo uma operação manual. Deploys de Cloudflare e Alexa continuam acionados pelas mudanças em seus próprios diretórios.

Migrações e correções de dados de produção não são executadas pelo merge. Use os workflows operacionais específicos e revise o modo dry-run antes de gravar.

## Recuperar uma publicação

- **Frontend em desenvolvimento:** reverta o commit em `develop`; o workflow publica o Hosting quando detecta alterações de frontend.
- **Frontend em produção:** reverta o commit em `main` e acompanhe o workflow de publicação do site.
- **Rules ou Functions:** reverta o código para a última versão conhecida como boa e acompanhe o deploy automático acionado pelo merge em `main`. O workflow manual continua disponível para publicação seletiva.
- **Dados:** interrompa a rotina que causou a alteração e preserve o relatório. A recuperação depende de exportação, backup ou Point-in-Time Recovery previamente habilitado e testado; deploy de código não desfaz gravações do Firestore.

Na entrega que migra criação para Function, um rollback precisa considerar frontend, regras, exports e backend juntos: o cliente antigo pode tentar escrita direta que a regra nova bloqueia. Preserve recibos, chaves e pedidos existentes, pause mutações durante a troca e reconcilie tentativas pendentes antes de retomar. Não apague recibos nem use `reset --hard`/force push para recuperar o ambiente. O plano específico de execução desta entrega é mantido localmente, fora do versionamento.

Após a recuperação, rode o alvo `order-integrity` no CI e confirme um pedido controlado no ambiente de desenvolvimento antes de promover a correção.

Se um deploy foi bloqueado pelos testes e o próximo commit altera apenas testes/documentação, o filtro do último push pode não selecionar o código que ficou sem publicar. Para entregar o conjunto já corrigido em DEV, use o marcador `[deploy all]` no commit ou execute `Deploy to Firebase (Dev)` na `develop` com `deploy_target=all`, testes habilitados e `run_e2e=true`. Confirme os três jobs de publicação; um novo run verde de testes sem esses jobs não comprova entrega.
