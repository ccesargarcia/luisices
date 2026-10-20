# Testes E2E com Playwright

Os E2E validam jornadas visíveis da aplicação. No CI, o Firebase Auth, Firestore, Storage e Functions são executados localmente pela Firebase Emulator Suite.

## Preparação local

Use Node.js 22, Java 21 ou superior e os navegadores do Playwright:

```bash
npm ci --legacy-peer-deps
npm --prefix functions ci
npx playwright install chromium
```

Antes de criar a build, configure `.env.local` para usar o emulador. O valor é incorporado durante o build:

```dotenv
VITE_FIREBASE_API_KEY=local-emulator-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=luisices-dev
VITE_FIREBASE_STORAGE_BUCKET=luisices-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_USE_FIREBASE_EMULATOR=true
```

Configure também `.env.test` com credenciais locais para o usuário que será criado no Auth Emulator:

```dotenv
TEST_USER_EMAIL=test-user@example.invalid
TEST_USER_PASSWORD=uma-senha-local
PLAYWRIGHT_BASE_URL=http://localhost:4173
```

Copie `functions/.secret.local.example` para `functions/.secret.local` para que as Functions no emulador usem valores fictícios. Esses arquivos locais não devem ser versionados. Não use credenciais nem o projeto Firebase de produção.

## Executar

Depois de configurar os arquivos locais, gere a build com o emulador ativado:

```bash
npm run build
```

Então rode toda a suíte com os emuladores e os dados de teste:

```bash
npx firebase emulators:exec --project luisices-dev --only auth,firestore,storage,functions "node scripts/seed-emulator.mjs && npx playwright test --project=chromium"
```

Para rodar apenas os testes de pedidos:

```bash
npx firebase emulators:exec --project luisices-dev --only auth,firestore,storage,functions "node scripts/seed-emulator.mjs && npx playwright test tests/e2e/orders.spec.ts --project=chromium"
```

Para fluxos de pedidos relacionados a valores, etiquetas e conclusão, o workflow oferece o alvo `order-integrity`. Os nomes dos alvos e as condições atuais ficam em [playwright.yml](../../.github/workflows/playwright.yml) e [test-actions.yml](../../.github/workflows/test-actions.yml).

## Diagnosticar uma falha

O Playwright pode anexar relatório HTML, screenshot, vídeo e trace. Use o primeiro erro do teste para localizar a falha; o relatório pode ser aberto com:

```bash
npx playwright show-report
```

Consulte também [o guia de diagnóstico do CI](../../.github/TROUBLESHOOT_TESTS.md). Não rode testes que gravam dados contra clientes reais ou contra o projeto Firebase de produção.
