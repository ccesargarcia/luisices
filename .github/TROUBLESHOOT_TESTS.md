# Troubleshooting - Testes E2E Falhando

## ❌ Problema: `TimeoutError: page.waitForURL: Timeout 10000ms exceeded`

### Sintoma
Todos os testes falham ao tentar redirecionar para `/dashboard` após o login.

### Causa Raiz
As credenciais de teste **não existem ou não estão ativas** no Firebase DEV.

---

## ✅ Checklist de Verificação

### 1. Verificar se o usuário existe no Firebase DEV

```bash
# Selecionar projeto DEV
firebase use dev

# Listar usuários (requer Firebase CLI)
firebase auth:export users.json --project luisices-dev
cat users.json | grep -i "caio.garcia@gmail.com"
```

**Ou via Console:**
1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto `luisices-dev`
3. Authentication > Users
4. Procure por: `caio.garcia@gmail.com`

---

### 2. Verificar se o usuário está ATIVO no Firestore

```bash
# Verificar documento do usuário no Firestore
firebase firestore:get users/{UID} --project luisices-dev
```

**Campos obrigatórios:**
```json
{
  "email": "caio.garcia@gmail.com",
  "active": true,  // ← DEVE SER TRUE
  "role": "admin" ou "user",
  "permissions": {
    "dashboard": true  // ← OBRIGATÓRIO para acessar /
  }
}
```

---

### 3. Criar usuário de teste (se não existir)

#### Opção A: Via Console Firebase
1. Authentication > Add user
   - Email: `caio.garcia@gmail.com`
   - Password: `Hexa1020**`

2. Firestore > users > Add document
   - Document ID: `{UID do usuário criado}`
   - Campos:
     ```json
     {
       "email": "caio.garcia@gmail.com",
       "name": "Teste E2E",
       "active": true,
       "role": "admin",
       "permissions": {
         "dashboard": true,
         "orders": { "view": true, "create": true },
         "customers": { "view": true }
       },
       "createdAt": "2026-03-06T00:00:00.000Z",
       "updatedAt": "2026-03-06T00:00:00.000Z"
     }
     ```

#### Opção B: Via script (se `make-admin.mjs` suportar)
```bash
# Adaptar script existente
node scripts/make-admin.mjs caio.garcia@gmail.com
```

---

### 4. Verificar secrets no GitHub Actions

As credenciais devem estar configuradas em:
https://github.com/ccesargarcia/luisices/settings/secrets/actions

**Secrets necessárias:**
- ✅ `TEST_USER_EMAIL` = caio.garcia@gmail.com
- ✅ `TEST_USER_PASSWORD` = Hexa1020**

**Firebase DEV (7 secrets):**
- ✅ `DEV_VITE_FIREBASE_API_KEY`
- ✅ `DEV_VITE_FIREBASE_AUTH_DOMAIN`
- ✅ `DEV_VITE_FIREBASE_PROJECT_ID`
- ✅ `DEV_VITE_FIREBASE_STORAGE_BUCKET`
- ✅ `DEV_VITE_FIREBASE_MESSAGING_SENDER_ID`
- ✅ `DEV_VITE_FIREBASE_APP_ID`
- ✅ `DEV_VITE_FIREBASE_MEASUREMENT_ID`

---

## 🔍 Debug: Capturar erro real do login

Adicione logs temporários no teste para ver o erro real:

```typescript
// tests/e2e/smoke.spec.ts
test('✅ Login funciona', async ({ page }) => {
  // Capturar erros do console
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
      errors.push(msg.text());
    }
  });

  await page.goto('/');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Aguardar um pouco para ver erros
  await page.waitForTimeout(3000);

  // Capturar screenshot da página atual
  await page.screenshot({ path: 'debug-login-state.png', fullPage: true });

  // Ver qual é a URL atual (pode estar em /login com erro)
  console.log('📍 URL atual:', page.url());

  // Ver se há mensagem de erro visível
  const errorAlert = await page.locator('[role="alert"]').textContent().catch(() => null);
  if (errorAlert) {
    console.log('⚠️ Erro na tela:', errorAlert);
  }

  await page.waitForURL('**/dashboard', { timeout: 10000 });
});
```

---

## 🎯 Solução Rápida

**Se você quer apenas fazer os testes passarem:**

1. **Criar usuário no Firebase DEV manualmente** (via console)
2. **Ou alterar as credenciais** para usar um usuário que já existe:

```bash
# No GitHub Secrets, altere TEST_USER_EMAIL para um usuário válido do DEV
# Exemplo: se você já tem admin@luisices.com.br no DEV
TEST_USER_EMAIL=admin@luisices.com.br
TEST_USER_PASSWORD=<senha_desse_usuario>
```

---

## 📊 Como verificar se funcionou

Após criar o usuário ou ajustar credenciais, rode localmente:

```bash
# 1. Configurar .env.test com credenciais do DEV
cat > .env.test << 'EOF'
TEST_USER_EMAIL=caio.garcia@gmail.com
TEST_USER_PASSWORD=Hexa1020**
PLAYWRIGHT_BASE_URL=https://dev.luisices.com.br
EOF

# 2. Rodar testes contra DEV
npm run test:smoke

# 3. Se passar local, fazer push para testar no CI
git add .
git commit -m "test: verificar credenciais DEV"
git push origin develop
```

---

## 🐛 Ainda não funciona?

Baixe os artifacts do GitHub Actions e veja os screenshots:

1. Acesse: https://github.com/ccesargarcia/luisices/actions
2. Clique no workflow que falhou
3. Download `playwright-report-XX.zip`
4. Abra `test-results/.../test-failed-1.png`
5. Veja o que está na tela (pode ter mensagem de erro)

Ou abra o trace interativo:
```bash
# Extrair o zip
unzip playwright-report-57.zip

# Abrir trace (mostra cada step do teste)
npx playwright show-trace test-results/.../trace.zip
```
