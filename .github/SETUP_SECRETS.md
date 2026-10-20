# Secrets do GitHub Actions

Este guia descreve os grupos de configuração. Os workflows são a fonte de verdade para os nomes exatos e para os fallbacks aceitos. Nunca registre os valores das secrets no repositório, em capturas de tela ou em logs.

## Firebase Web

Para o build de desenvolvimento, os workflows usam preferencialmente secrets com prefixo `DEV_VITE_FIREBASE_`, além de algumas configurações opcionais como CDN, domínio de Functions e Sentry.

Para produção, os nomes preferenciais usam `PROD_VITE_FIREBASE_`. Alguns workflows ainda aceitam nomes antigos com prefixo `VITE_FIREBASE_` como alternativa. Confira [deploy-dev.yml](workflows/deploy-dev.yml) e [deploy.yml](workflows/deploy.yml) antes de criar ou renomear secrets.

## Autorização para deploy Firebase

O Hosting e os recursos Firebase precisam de contas de serviço separadas por ambiente. O nome principal para desenvolvimento é `FIREBASE_SERVICE_ACCOUNT_DEV`; os workflows de produção aceitam os nomes configurados em [deploy.yml](workflows/deploy.yml) e [deploy-functions-manual.yml](workflows/deploy-functions-manual.yml).

A conta de serviço contém credenciais privadas. Armazene o JSON completo somente nas GitHub Actions Secrets e limite as permissões da conta ao necessário para o deploy correspondente.

## Testes Playwright

Os testes E2E do CI rodam contra emuladores locais, não contra o banco real de produção. `TEST_USER_EMAIL` e `TEST_USER_PASSWORD` são configurações de teste usadas por alguns workflows; consulte [playwright.yml](workflows/playwright.yml), [screen-audit.yml](workflows/screen-audit.yml) e [test-actions.yml](workflows/test-actions.yml) para saber quando são necessárias.

Não use credenciais de clientes nem uma conta administrativa real como usuário de teste.

## Serviços externos

Cloudflare, Alexa, Sentry, Gemini, Resend, Evolution API e outros serviços têm secrets próprias e, em alguns casos, separadas para desenvolvimento e produção. Consulte o workflow do serviço antes de configurar ou rotacionar uma chave. Não apague uma secret até confirmar que nenhum workflow ou função ainda a utiliza.

## Como conferir uma configuração

1. Abra **Settings → Secrets and variables → Actions** no repositório.
2. Compare somente os nomes das secrets com o workflow que será executado; o GitHub não permite consultar valores já armazenados.
3. Execute o workflow no ambiente pretendido e confira o resultado sem imprimir valores privados nos logs.

Os valores não são exibidos neste guia. Para links de referência, consulte a [documentação do GitHub Actions](https://docs.github.com/en/actions/security-guides/encrypted-secrets) e a [documentação de contas de serviço Firebase](https://firebase.google.com/docs/admin/setup).
