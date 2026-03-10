# 🧪 Testes E2E

Esta pasta contém testes automatizados end-to-end (E2E) usando Playwright.

## 📁 Estrutura

```
tests/e2e/
├── smoke.spec.ts           # Testes rápidos e críticos (rodar antes de deploy)
├── auth.spec.ts            # Autenticação (login, logout, erros)
├── dashboard.spec.ts       # Dashboard (cards, filtros, busca, compartilhados)
├── shared-access.spec.ts   # Compartilhamento de acesso
└── navigation.spec.ts      # Navegação entre páginas
```

## 🚀 Como Rodar

### Testes Rápidos (Smoke Tests)

```bash
npm run test:smoke
```

### Todos os Testes

```bash
npm run test:e2e
```

### Modo Interativo

```bash
npm run test:e2e:ui
```

### Modo Debug

```bash
npm run test:debug
```

## 📊 Ver Relatórios

```bash
npm run test:report
```

## ⚙️ Configuração

1. Instale o Playwright:
   ```bash
   npm install
   npx playwright install
   ```

2. Configure variáveis de ambiente:
   ```bash
   cp .env.test.example .env.test
   ```

3. Edite `.env.test` com suas credenciais de teste

## ✍️ Escrevendo Testes

Veja exemplos nos arquivos existentes. Estrutura básica:

```typescript
import { test, expect } from '@playwright/test';

test('descrição do teste', async ({ page }) => {
  await page.goto('/pagina');
  await page.click('button');
  await expect(page.locator('h1')).toContainText('Sucesso');
});
```

## 📚 Mais Informações

Consulte [TESTING_GUIDE.md](../../TESTING_GUIDE.md) na raiz do projeto.
