# Operação e recuperação

Este documento registra o procedimento de validação, auditoria e recuperação para pedidos. As correções de dados exigem leitura e revisão do relatório antes de qualquer gravação.

## Validar o fluxo financeiro

O E2E de pedidos cobre preço em reais, pagamento parcial, vários produtos e conclusão do pedido. Para rodar somente os cenários de integridade no GitHub Actions, inicie o workflow **Playwright Tests** ou **E2E Tests** com o alvo `order-integrity`. O teste usa emuladores e não grava dados no projeto de produção.

O workflow completo também roda em pull requests para `develop` e `main`. Alterações de frontend e regras passam pelo workflow de desenvolvimento antes do deploy em `develop`.

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

## Recuperar uma publicação

- **Frontend em desenvolvimento:** reverta o commit em `develop`; o workflow publica o Hosting quando detecta alterações de frontend.
- **Frontend em produção:** reverta o commit em `main` e acompanhe o workflow de publicação do site.
- **Rules ou Functions:** reverta o código para a última versão conhecida como boa e publique somente o alvo afetado. Para Functions, use o deploy seletivo; publique todas apenas quando a alteração exigir.
- **Dados:** interrompa a rotina que causou a alteração e preserve o relatório. A recuperação depende de exportação, backup ou Point-in-Time Recovery previamente habilitado e testado; deploy de código não desfaz gravações do Firestore.

Após a recuperação, rode o alvo `order-integrity` no CI e confirme um pedido controlado no ambiente de desenvolvimento antes de promover a correção.
