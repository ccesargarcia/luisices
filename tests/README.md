# Testes do projeto

O projeto mantém quatro grupos de validação:

- **Unitários:** lógica isolada, usando Vitest.
- **Integração:** regras e contratos Firebase exercitados com emuladores.
- **Presença:** regras do Realtime Database, em emulador próprio.
- **E2E:** jornadas da aplicação executadas no Chromium com Playwright e Firebase Emulator Suite.

## Comandos principais

```bash
npm run test:unit
npm run lint:functions
npm run build
npm run test:integration
npm run test:presence
```

A execução local dos E2E, incluindo a inicialização segura dos emuladores e dados de teste, está em [e2e/README.md](e2e/README.md). Para cenários de regras e pedidos, consulte [integration/README.md](integration/README.md).

No CI, o workflow reutilizável executa testes com emuladores. O conjunto exato depende do evento e do alvo: consulte [test-actions.yml](../.github/workflows/test-actions.yml) e abra a execução no GitHub Actions para ver quais etapas rodaram. Não use o Firebase de produção para rodar testes que gravam dados.
