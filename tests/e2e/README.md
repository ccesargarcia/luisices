# 🧪 Testes E2E - Playwright

Este diretório contém os testes end-to-end (E2E) automatizados usando Playwright.

---

## 📁 Estrutura

```
tests/e2e/
├── smoke.spec.ts          # 🔥 Smoke tests - testes críticos básicos
├── auth.spec.ts           # 🔐 Autenticação (login, logout, reset)
├── orders.spec.ts         # 📦 CRUD de pedidos
├── customers.spec.ts      # 👥 CRUD de clientes
└── products.spec.ts       # 🎨 CRUD de produtos
```

---

## 🚀 Como Rodar os Testes

### ⚙️ Primeira vez - Configuração:

```bash
# 1. Copiar template de credenciais
cp .env.test.example .env.test

# 2. Editar .env.test com suas credenciais
# TEST_USER_EMAIL=seu-email@exemplo.com
# TEST_USER_PASSWORD=sua-senha
# PLAYWRIGHT_BASE_URL=https://dev.luisices.com.br

# 3. Instalar browsers do Playwright
npx playwright install
```

### ▶️ Executar testes:

```bash
# Smoke tests (mais rápido - ~30s)
npm run test:smoke

# Todos os testes E2E
npm run test:e2e

# Interface visual (modo debug)
npm run test:e2e:ui

# Mode debug com breakpoints
npm run test:debug

# Ver relatório do última execução
npm run test:report
```

---

## 🧩 Tipos de Testes

### 1. **Smoke Tests** (`smoke.spec.ts`)

Testes **mínimos e rápidos** que verificam se a aplicação está funcional:

- ✅ Login
- ✅ Dashboard carrega
- ✅ Criar pedido básico
- ✅ Logout

**Quando rodar:** Antes de cada deploy, em CI/CD

**Tempo:** ~30-60 segundos

---

### 2. **Testes de Autenticação** (`auth.spec.ts`)

- Login com credenciais válidas
- Login com credenciais inválidas
- Logout
- Reset de senha (quando implementado)
- Proteção de rotas

**Tempo:** ~2 minutos

---

### 3. **Testes de Pedidos** (`orders.spec.ts`)

- Criar novo pedido
- Listar pedidos
- Filtrar pedidos
- Atualizar status
- Deletar pedido
- Validações de campos

**Tempo:** ~3-4 minutos

---

### 4. **Testes de Clientes** (`customers.spec.ts`)

- Adicionar cliente
- Listar clientes
- Buscar cliente
- Editar cliente
- Deletar cliente

**Tempo:** ~2-3 minutos

---

### 5. **Testes de Produtos** (`products.spec.ts`)

- Criar produto
- Listar produtos
- Editar produto
- Deletar produto

**Tempo:** ~2 minutos

---

## 🔐 Credenciais de Teste

### 🏠 Localmente:

Arquivo: `.env.test` (não commitado, criado manualmente)

```dotenv
TEST_USER_EMAIL=seu-email@exemplo.com
TEST_USER_PASSWORD=sua-senha
PLAYWRIGHT_BASE_URL=https://dev.luisices.com.br
```

### 🤖 CI/CD (GitHub Actions):

Credenciais vêm de **GitHub Secrets**:
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

**Veja:** [`.github/SECRETS_QUICKSTART.md`](../../.github/SECRETS_QUICKSTART.md)

---

### ⚠️ IMPORTANTE: Criar Usuário de Teste no Firebase

**As credenciais de teste devem existir no Firebase do ambiente que você está testando!**

#### Opção 1: Via Console Firebase (mais rápido)

1. **Authentication:**
   - Acesse: https://console.firebase.google.com/
   - Selecione projeto `luisices-dev`
   - Authentication > Users > Add user
   - Email: `caio.garcia@gmail.com` (ou o que estiver no .env.test)
   - Password: `Hexa1020**`

2. **Firestore:**
   - Firestore Database > `users` collection > Add document
   - Document ID: `{UID do usuário criado acima}`
   - Campos:
     ```json
     {
       "email": "caio.garcia@gmail.com",
       "name": "Teste E2E",
       "active": true,
       "role": "admin",
       "permissions": {
         "dashboard": true,
         "orders": { "view": true, "create": true, "edit": true },
         "customers": { "view": true, "create": true }
       }
     }
     ```

#### Opção 2: Via Script Automatizado

```bash
# 1. Baixar service account do Firebase
# (Project Settings > Service Accounts > Generate New Private Key)
# Salvar como: luisices-dev-firebase-adminsdk.json

# 2. Selecionar projeto DEV
firebase use dev

# 3. Rodar script
node scripts/create-test-user.mjs

# Ou especificar credenciais:
node scripts/create-test-user.mjs email@exemplo.com senha123
```

**⚠️ NÃO COMMITE** o arquivo de service account! (já está no .gitignore)

---

### ❌ Testes falhando com `TimeoutError`?

**Sintoma:** `page.waitForURL: Timeout 10000ms exceeded`

**Causa:** Usuário de teste não existe ou está inativo no Firebase

**Solução:**
1. Criar usuário conforme instruções acima
2. Verificar se `active: true` no Firestore
3. Confirmar que `permissions.dashboard: true`

**Guia completo:** [`.github/TROUBLESHOOT_TESTS.md`](../../.github/TROUBLESHOOT_TESTS.md)

---

## 📊 Relatórios

Após rodar os testes, um relatório HTML é gerado em:

```
playwright-report/index.html
```

**Abrir relatório:**
```bash
npm run test:report
```

**O relatório mostra:**
- ✅ Testes que passaram
- ❌ Testes que falharam
- 📸 Screenshots de falhas
- 🎬 Vídeos das execuções
- 📝 Traces para debug

---

## 🐛 Debug de Testes Falhando

### 1. **Ver último relatório:**
```bash
npm run test:report
```

### 2. **Rodar em modo debug:**
```bash
npm run test:debug
```

Pausa em cada ação e permite:
- Ver DOM em tempo real
- Inspecionar elementos
- Console do browser

### 3. **Rodar teste específico:**
```bash
npx playwright test auth.spec.ts
npx playwright test -g "deve fazer login"
```

### 4. **Aumentar timeout:**

```typescript
// No teste específico
test('meu teste lento', async ({ page }) => {
  test.setTimeout(60000); // 60 segundos
  // ...
});
```

---

## 🏗️ Escrever Novos Testes

### Template básico:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Minha Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup - executado antes de cada teste
    await page.goto('/');
  });

  test('deve fazer algo', async ({ page }) => {
    // Arrange
    await page.fill('#input', 'valor');

    // Act
    await page.click('#submit');

    // Assert
    await expect(page.locator('#result')).toHaveText('Sucesso!');
  });
});
```

### Boas práticas:

- ✅ Use `data-testid` nos componentes ao invés de classes CSS
- ✅ Espere elementos estarem visíveis antes de interagir
- ✅ Use `expect` do Playwright (auto-retry)
- ✅ Limpe dados criados após o teste
- ✅ Não dependa de ordem de execução dos testes

---

## 🤖 Integração com CI/CD

Os smoke tests rodam **automaticamente** no GitHub Actions quando você faz push no `develop`:

```yaml
- name: Run E2E Tests (Smoke)
  run: npm run test:smoke
```

**Fluxo:**
1. Push no `develop`
2. Build da aplicação
3. ✅ **Testes rodam**
4. Se passarem → Deploy
5. Se falharem → Deploy bloqueado

**Ver resultados:**
- GitHub Actions > Aba "Actions"
- Download do artifact `playwright-report-XXX`

---

## 📈 Cobertura de Testes

| Funcionalidade | Cobertura | Arquivos |
|----------------|-----------|----------|
| Autenticação | ✅ 100% | `auth.spec.ts`, `smoke.spec.ts` |
| Pedidos | ✅ 80% | `orders.spec.ts`, `smoke.spec.ts` |
| Clientes | ⏳ 50% | `customers.spec.ts` |
| Produtos | ⏳ 50% | `products.spec.ts` |

**Meta:** 80% de cobertura nas funcionalidades críticas

---

## 🔗 Referências

- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
- [CI/CD](https://playwright.dev/docs/ci)

---

**Última atualização:** 6 de março de 2026
