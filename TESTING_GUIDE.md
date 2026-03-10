# 🧪 Guia de Testes

Este guia explica como executar testes automatizados e manuais para garantir que a aplicação está funcionando corretamente.

## 📦 Instalação

### 1. Instalar Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas credenciais de teste:

```bash
cp .env.test.example .env.test
```

Edite `.env.test` e preencha:
- `TEST_USER_EMAIL`: Email de um usuário de teste
- `TEST_USER_PASSWORD`: Senha do usuário de teste
- `PLAYWRIGHT_BASE_URL`: URL onde a aplicação está rodando

**⚠️ IMPORTANTE**:
- Use um usuário específico para testes, não sua conta real
- NUNCA commite o arquivo `.env.test`
- Adicione `.env.test` ao `.gitignore`

## 🚀 Executando Testes

### Testes Smoke (Rápidos)

Execute apenas os testes críticos antes de cada deploy:

```bash
npm run test:smoke
```

Estes testes verificam:
- ✅ Login funciona
- ✅ Dashboard carrega
- ✅ Navegação básica funciona
- ✅ Filtros respondem
- ✅ Compartilhamento existe

**Tempo estimado**: ~2 minutos

### Todos os Testes E2E

Execute a suíte completa de testes:

```bash
npm run test:e2e
```

Testa:
- Autenticação (login, logout, erros)
- Dashboard completo (cards, filtros, busca)
- Compartilhamento de acesso
- Navegação entre páginas

**Tempo estimado**: ~5-10 minutos

### Testes em Modo Interativo

Para ver os testes rodando no navegador:

```bash
npm run test:ui
```

Útil para:
- Debugar testes que falharam
- Desenvolver novos testes
- Ver exatamente o que está acontecendo

### Testes em Modo Debug

Para debugar um teste específico:

```bash
npx playwright test tests/e2e/auth.spec.ts --debug
```

## 📊 Relatórios

Após rodar os testes, veja o relatório HTML:

```bash
npx playwright show-report
```

O relatório mostra:
- ✅ Testes que passaram
- ❌ Testes que falharam
- 📸 Screenshots de falhas
- 🎥 Videos de testes que falharam
- 📝 Trace detalhado

## 🎯 Estrutura dos Testes

```
tests/
└── e2e/
    ├── smoke.spec.ts           # Testes rápidos e críticos
    ├── auth.spec.ts            # Login, logout, erros
    ├── dashboard.spec.ts       # Dashboard e filtros
    ├── shared-access.spec.ts   # Compartilhamento
    └── navigation.spec.ts      # Navegação entre páginas
```

## ✍️ Criando Novos Testes

### Estrutura Básica

```typescript
import { test, expect } from '@playwright/test';

test.describe('Minha Funcionalidade', () => {
  test('deve fazer algo específico', async ({ page }) => {
    // 1. Navegar
    await page.goto('/pagina');

    // 2. Interagir
    await page.click('button');

    // 3. Verificar
    await expect(page.locator('h1')).toContainText('Sucesso');
  });
});
```

### Dicas

1. **Use seletores estáveis**:
   ```typescript
   // ✅ BOM: Usa data attributes ou texto
   page.locator('[data-testid="submit-button"]')
   page.locator('button:has-text("Salvar")')

   // ❌ RUIM: Classes CSS podem mudar
   page.locator('.btn-primary')
   ```

2. **Aguarde carregamentos**:
   ```typescript
   await page.waitForSelector('[data-testid="order-list"]');
   await page.waitForLoadState('networkidle');
   ```

3. **Use beforeEach para login**:
   ```typescript
   test.beforeEach(async ({ page }) => {
     // Login comum a todos os testes
     await page.goto('/login');
     await page.fill('input[type="email"]', 'teste@exemplo.com');
     await page.fill('input[type="password"]', 'senha123');
     await page.click('button[type="submit"]');
   });
   ```

## 📋 Checklist Manual

Para testes que não podem ser automatizados ou verificação visual, use:

```bash
cat TESTING_CHECKLIST.md
```

Este checklist cobre:
- Todas as funcionalidades principais
- Casos de erro
- Responsividade
- Performance

## 🔄 Workflow Recomendado

### Antes de Cada Commit

```bash
# Testes rápidos
npm run test:smoke
```

### Antes de Push para Develop

```bash
# Testes completos
npm run test:e2e
```

### Antes de Deploy para Produção

1. ✅ Rodar todos os testes automatizados
2. ✅ Preencher checklist manual
3. ✅ Testar em DEV primeiro
4. ✅ Validar com stakeholders

## 🐛 Debugando Testes que Falharam

### 1. Ver o Relatório

```bash
npx playwright show-report
```

### 2. Ver Screenshots e Videos

Os arquivos ficam em:
- `test-results/` (screenshots)
- `playwright-report/` (relatório HTML)

### 3. Rodar em Modo Debug

```bash
npx playwright test nome-do-teste.spec.ts --debug
```

### 4. Ver Trace

O trace mostra cada ação, network, console, etc:

```bash
npx playwright show-trace test-results/.../trace.zip
```

## 🌐 Testando em Diferentes Ambientes

### Local (Dev Server)

```bash
# Terminal 1: Rodar app
npm run dev

# Terminal 2: Rodar testes
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:e2e
```

### DEV (Firebase)

```bash
PLAYWRIGHT_BASE_URL=https://luisices-dev.web.app npm run test:e2e
```

### Produção

```bash
PLAYWRIGHT_BASE_URL=https://seu-site.com npm run test:smoke
```

## 📱 Testando Mobile

```typescript
// Edite playwright.config.ts e descomente:
{
  name: 'Mobile Chrome',
  use: { ...devices['Pixel 5'] },
}
```

Depois rode os testes normalmente.

## 🎓 Recursos

- [Documentação Playwright](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/test-assertions)

## ❓ FAQ

### Os testes estão falhando localmente mas passam em CI

- Verifique timeouts
- Verifique que o dev server está rodando
- Verifique variáveis de ambiente

### Como adicionar esperas?

```typescript
// Esperar elemento aparecer
await page.waitForSelector('[data-testid="item"]');

// Esperar URL mudar
await page.waitForURL('**/dashboard');

// Esperar tempo fixo (evite se possível)
await page.waitForTimeout(1000);
```

### Como testar uploads de arquivo?

```typescript
await page.setInputFiles('input[type="file"]', 'path/to/file.png');
```

### Como testar downloads?

```typescript
const download = await page.waitForEvent('download');
const path = await download.path();
```

---

**Dúvidas?** Consulte a [documentação do Playwright](https://playwright.dev/docs/intro) ou abra uma issue.
