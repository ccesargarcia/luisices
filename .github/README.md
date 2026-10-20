# GitHub Actions — CI/CD

Este guia resume os fluxos atuais. As condições completas e os nomes de secrets ficam nos próprios arquivos de workflow.

## Workflows principais

| Fluxo | Quando roda | O que publica ou valida |
|---|---|---|
| [E2E Tests](workflows/test-actions.yml) | Pull requests para `develop` e `main`; também pode ser iniciado manualmente ou chamado por outro workflow | Testes unitários, lint de Functions, integrações com emuladores, build e E2E com Playwright, conforme o alvo selecionado |
| [Playwright Tests](workflows/playwright.yml) | Execução manual | Testes E2E selecionados ou contratos do backend com emuladores |
| [Deploy DEV](workflows/deploy-dev.yml) | Push em `develop` ou execução manual | Analisa os arquivos alterados, executa as validações aplicáveis e publica Hosting, regras ou Functions em desenvolvimento |
| [Deploy de produção](workflows/deploy.yml) | Push em `main` ou execução manual | Faz build e publica o site no GitHub Pages; publica regras e índices Firebase quando há mudanças de configuração |
| [Deploy de Functions](workflows/deploy-functions-manual.yml) | Push em `main` que altera `functions/**` ou `firebase.json`; também aceita execução manual | Publica Functions em produção no push da `main`; manualmente permite escolher ambiente e alvo |
| [Deploy Cloudflare](workflows/deploy-cloudflare.yml) | Mudanças em `cloudflare/**` e arquivos relacionados | Publica Workers no ambiente correspondente à branch |

## Testes

Os testes E2E usam a Firebase Emulator Suite no CI. A estratégia pode variar conforme o alvo, os arquivos alterados e os parâmetros do workflow; um push não significa necessariamente que toda a suíte rodou.

Para conferir o que foi executado, abra a execução em **Actions** e consulte os jobs, etapas e artefatos daquele commit. Consulte também [o guia de testes](../tests/README.md).

O workflow de produção não repete a suíte de testes depois do merge. As verificações de pull request são a barreira anterior à publicação; a proteção da branch deve exigir os checks necessários.

## Secrets

Não coloque valores de secrets em arquivos versionados ou em logs. Consulte [SETUP_SECRETS.md](SETUP_SECRETS.md) e confira o workflow que usa cada secret antes de criá-la ou alterá-la.
