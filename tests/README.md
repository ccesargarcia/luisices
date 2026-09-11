# 🧪 Testes E2E

Esta pasta contém testes automatizados end-to-end (E2E) usando Playwright.

## 📁 Estrutura

```
tests/e2e/
├── auth.spec.ts                      # Autenticação (login, logout, erros)
├── critical-flows.spec.ts            # Fluxos críticos da aplicação
├── customer-order-lifecycle.spec.ts  # Ciclo completo cliente -> pedido
├── customers.spec.ts                 # CRUD e regras de clientes
├── gallery.spec.ts                   # Galeria de artes e uploads
├── navigation.spec.ts                # Navegação entre páginas e rotas
├── order-details.spec.ts             # Detalhes e workflow de produção do pedido
├── orders.spec.ts                    # Gestão e listagem de pedidos
├── permissions.spec.ts               # Validação de permissões e papéis (RBAC)
├── products.spec.ts                  # CRUD de produtos e catálogo
├── quotes.spec.ts                    # CRUD e conversão de orçamentos
├── reports.spec.ts                   # Relatórios e exportações
└── settings.spec.ts                  # Configurações do usuário e sistema
```

## 🚀 Como Rodar

### Testes Rápidos (Smoke Tests)

```bash
npm run test:ci
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

Consulte os arquivos `.spec.ts` desta pasta e o workflow `.github/workflows/test-actions.yml`.
