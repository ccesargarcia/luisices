# 🧪 Guia de Testes CRUD

Este documento detalha como funcionam os testes de CRUD criados para a aplicação.

---

## 📦 Testes Criados

### ✅ 4 Suites de Teste CRUD

1. **Clientes** (`customers.spec.ts`) - 6 testes
2. **Produtos** (`products.spec.ts`) - 5 testes  
3. **Orçamentos** (`quotes.spec.ts`) - 6 testes
4. **Pedidos** (`orders.spec.ts`) - 8 testes

**Total: 25 testes de CRUD**

---

## 🚀 Como Executar

### Todos os testes CRUD
```bash
npm run test:e2e tests/e2e/customers.spec.ts tests/e2e/products.spec.ts tests/e2e/quotes.spec.ts tests/e2e/orders.spec.ts
```

### Testes individuais
```bash
# Apenas clientes
npm run test:customers

# Apenas produtos
npm run test:products

# Apenas orçamentos
npm run test:quotes

# Apenas pedidos
npm run test:orders
```

### Debug de teste específico
```bash
# Modo debug visual
npx playwright test customers.spec.ts --debug

# Com browser visível
npx playwright test customers.spec.ts --headed

# Apenas um teste específico
npx playwright test customers.spec.ts -g "deve criar um novo cliente"
```

---

## 🔧 Pré-requisitos

### 1. Usuário de Teste

Os testes precisam de um usuário com permissões adequadas:

```bash
# Instalar firebase-admin (já feito)
npm install --save-dev firebase-admin

# Obter service account do Firebase Console
# Firebase Console > Project Settings > Service Accounts > Generate New Private Key
# Salvar como: luisices-dev-firebase-adminsdk.json

# Criar/atualizar usuário de teste
node scripts/create-test-user.mjs
```

O script cria um usuário com permissões para:
- ✅ Dashboard
- ✅ Clientes (view, create, edit)
- ✅ Produtos (view, create, edit)
- ✅ Orçamentos (view, create, edit)
- ✅ Pedidos/Agenda (view, create, edit)
- ✅ Galeria (view, create, edit)
- ✅ Relatórios
- ✅ Configurações

### 2. Variáveis de Ambiente

Criar `.env.test` com:

```env
TEST_USER_EMAIL=seu-email@exemplo.com
TEST_USER_PASSWORD=sua-senha-segura
PLAYWRIGHT_BASE_URL=http://localhost:5173
```

---

## 📝 Estrutura dos Testes

Cada teste segue o padrão:

```typescript
test('deve criar um novo [recurso]', async ({ page }) => {
  // 1. Abrir dialog de criação
  await page.getByRole('button', { name: /Novo/i }).click();
  
  // 2. Preencher formulário
  await page.getByLabel(/Nome/i).fill('Teste');
  
  // 3. Salvar
  await page.getByRole('button', { name: /Salvar/i }).click();
  
  // 4. Verificar que foi criado
  await expect(page.getByText('Teste')).toBeVisible();
});
```

---

## 🎯 O Que Cada Teste Verifica

### **Clientes** (`customers.spec.ts`)

| Teste | Descrição |
|-------|-----------|
| ✅ Criar | Abre dialog, preenche formulário, salva e verifica na lista |
| ✅ Editar | Busca cliente, abre edição, modifica nome, salva e verifica |
| ✅ Excluir | Busca cliente, confirma exclusão, verifica que sumiu |
| ✅ Buscar | Usa campo de busca e verifica filtro funciona |
| ✅ Exportar | Verifica que botão de export existe |
| ✅ Validação | Tenta salvar sem preencher e verifica que bloqueia |

### **Produtos** (`products.spec.ts`)

| Teste | Descrição |
|-------|-----------|
| ✅ Criar | Cria produto com nome, categoria, preço e descrição |
| ✅ Editar | Modifica nome do produto e verifica atualização |
| ✅ Excluir | Remove produto e confirma remoção |
| ✅ Validação | Verifica campos obrigatórios |
| ✅ Filtrar | Testa filtro por categoria (se disponível) |

### **Orçamentos** (`quotes.spec.ts`)

| Teste | Descrição |
|-------|-----------|
| ✅ Criar | Cria orçamento com cliente e detalhes |
| ✅ Editar | Modifica descrição do orçamento |
| ✅ Excluir | Remove orçamento |
| ✅ Converter | Converte orçamento em pedido (se disponível) |
| ✅ Filtrar | Testa filtro por status |
| ✅ Validação | Verifica campos obrigatórios |

### **Pedidos** (`orders.spec.ts`)

| Teste | Descrição |
|-------|-----------|
| ✅ Criar via Dashboard | Cria pedido a partir do dashboard |
| ✅ Criar via Agenda | Cria pedido pela agenda semanal |
| ✅ Editar | Modifica pedido existente |
| ✅ Alterar Status | Muda status (pendente/produção/concluído) |
| ✅ Excluir | Remove pedido |
| ✅ Filtrar | Testa busca/filtro de pedidos |
| ✅ Navegar Semanas | Testa navegação entre semanas na agenda |
| ✅ Validação | Verifica campos obrigatórios |

---

## ⚠️ Ajustes Necessários

Os testes usam seletores genéricos que podem precisar de ajustes:

### Se um teste falhar por não encontrar elemento:

1. **Rode em modo debug para ver a página:**
   ```bash
   npx playwright test customers.spec.ts --debug
   ```

2. **Ajuste os seletores no arquivo de teste:**
   ```typescript
   // Antes (genérico)
   page.getByRole('button', { name: /Novo Cliente/i })
   
   // Depois (específico com data-testid)
   page.locator('[data-testid="new-customer-button"]')
   ```

3. **Adicione data-testid nos componentes:**
   ```tsx
   <Button data-testid="new-customer-button">
     Novo Cliente
   </Button>
   ```

---

## 🐛 Problemas Comuns

### ❌ "Elemento não encontrado"
**Solução:** Aumentar timeout ou ajustar seletor
```typescript
await expect(element).toBeVisible({ timeout: 10000 });
```

### ❌ "Dialog não abre"
**Solução:** Verificar que botão existe e está clicável
```typescript
await expect(button).toBeVisible();
await expect(button).toBeEnabled();
await button.click();
```

### ❌ "Teste demora muito"
**Solução:** Firebase pode ser lento, use timeouts generosos
```typescript
await page.waitForURL('**/dashboard', { timeout: 15000 });
```

### ❌ "Campos não preenchem"
**Solução:** Garantir que input está visível e interagível
```typescript
const input = page.getByLabel(/Nome/i);
await input.waitFor({ state: 'visible' });
await input.fill('Valor');
```

---

## 📊 Relatórios

Após rodar os testes:

```bash
# Ver relatório HTML
npm run test:report

# Ver trace detalhado (quando teste falha)
npx playwright show-trace test-results/[pasta-do-teste]/trace.zip

# Screenshots ficam em:
test-results/[teste]/test-failed-1.png
```

---

## 🎨 Melhorias Futuras

### Adicionar data-testid nos componentes

Para testes mais confiáveis, adicione `data-testid`:

```tsx
// Customers.tsx
<Button data-testid="new-customer-button">Novo Cliente</Button>
<Dialog data-testid="customer-dialog">
  <Input data-testid="customer-name" />
  <Input data-testid="customer-phone" />
</Dialog>
```

Então nos testes:
```typescript
await page.locator('[data-testid="new-customer-button"]').click();
await page.locator('[data-testid="customer-name"]').fill('João');
```

### Criar helpers reutilizáveis

```typescript
// tests/helpers/auth.ts
export async function login(page, email, password) {
  await page.goto('/');
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-button"]');
}

// Usar nos testes
import { login } from '../helpers/auth';
await login(page, TEST_USER.email, TEST_USER.password);
```

---

## ✅ Checklist de Execução

Antes de rodar os testes pela primeira vez:

- [ ] Firebase Admin instalado (`npm install --save-dev firebase-admin`)
- [ ] Service account baixada e salva como `luisices-dev-firebase-adminsdk.json`
- [ ] Usuário de teste criado (`node scripts/create-test-user.mjs`)
- [ ] Arquivo `.env.test` configurado com credenciais
- [ ] Browsers do Playwright instalados (`npx playwright install`)
- [ ] App rodando (`npm run dev`) ou URL configurada

Então execute:

```bash
# Teste rápido
npm run test:smoke

# Todos os testes CRUD
npm run test:customers
npm run test:products
npm run test:quotes
npm run test:orders

# Ou todos de uma vez
npm run test:e2e
```

---

## 📚 Documentação

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
- [Locators](https://playwright.dev/docs/locators)
