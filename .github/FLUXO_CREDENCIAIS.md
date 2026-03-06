# 🔐 Como as Credenciais Chegam nos Testes

## 📊 Diagrama do Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│  1. GITHUB SECRETS (Você configura manualmente)            │
│                                                             │
│  Settings > Secrets and variables > Actions                │
│  https://github.com/ccesargarcia/luisices/settings/secrets │
│                                                             │
│  ✓ TEST_USER_EMAIL = "caio.garcia@gmail.com"              │
│  ✓ TEST_USER_PASSWORD = "Hexa1020**"                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. GITHUB ACTIONS WORKFLOW                                 │
│                                                             │
│  .github/workflows/deploy-dev.yml (linha 58-61)            │
│                                                             │
│  - name: Run E2E Tests (Smoke)                             │
│    env:                                                     │
│      TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}       │
│      TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }} │
│    run: npm run test:smoke                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. VARIÁVEIS DE AMBIENTE (process.env)                     │
│                                                             │
│  process.env.TEST_USER_EMAIL = "caio.garcia@gmail.com"    │
│  process.env.TEST_USER_PASSWORD = "Hexa1020**"            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. CÓDIGO DO TESTE                                         │
│                                                             │
│  tests/e2e/smoke.spec.ts (linha 10-13)                     │
│                                                             │
│  const TEST_USER = {                                        │
│    email: process.env.TEST_USER_EMAIL,                     │
│    password: process.env.TEST_USER_PASSWORD                │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. PLAYWRIGHT PREENCHE O FORMULÁRIO                        │
│                                                             │
│  await page.fill('input[type="email"]', TEST_USER.email)   │
│  await page.fill('input[type="password"]', TEST_USER.password) │
│  await page.click('button[type="submit"]')                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  6. FIREBASE AUTHENTICATION (Firebase DEV)                  │
│                                                             │
│  Tenta autenticar: caio.garcia@gmail.com / Hexa1020**     │
│                                                             │
│  ❌ ERRO: auth/user-not-found                              │
│     (Usuário não existe no Firebase DEV)                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  7. APLICAÇÃO NÃO REDIRECIONA                               │
│                                                             │
│  src/app/pages/Login.tsx (linha 26-28)                     │
│                                                             │
│  try {                                                      │
│    await login(email, password);                           │
│    navigate('/');  ← NUNCA EXECUTA (erro no login)        │
│  } catch (err) {                                           │
│    setError(err.message);  ← EXECUTA ISSO                 │
│  }                                                          │
│                                                             │
│  Usuário permanece em /login                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  8. PLAYWRIGHT AGUARDA REDIRECIONAMENTO                     │
│                                                             │
│  await page.waitForURL('**/dashboard', { timeout: 10000 }) │
│                                                             │
│  Aguarda... aguarda... aguarda...                          │
│  10 segundos depois...                                      │
│                                                             │
│  ⏱️ TimeoutError: page.waitForURL: Timeout 10000ms exceeded │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Resumo

**As credenciais ESTÃO sendo passadas corretamente!**

O problema NÃO é a configuração das secrets.

**O problema é:**
- ✅ Secrets configuradas no GitHub (provavelmente)
- ✅ Workflow passa as secrets para os testes
- ✅ Testes recebem as credenciais corretamente
- ✅ Testes preenchem o formulário
- ❌ **Firebase DEV retorna erro: usuário não existe**
- ❌ Login falha e não redireciona
- ❌ Teste espera 10 segundos por `/dashboard` que nunca vem
- ❌ **Timeout**

---

## ✅ Como Resolver

**Você PRECISA criar o usuário no Firebase DEV:**

### Opção 1: Console Firebase (Rápido)

```
1. Authentication:
   https://console.firebase.google.com/project/luisices-dev/authentication/users
   → Add user
   → Email: caio.garcia@gmail.com
   → Password: Hexa1020**
   → Copie o UID gerado

2. Firestore:
   https://console.firebase.google.com/project/luisices-dev/firestore
   → Collection: users
   → Add document
   → Document ID: {UID copiado}
   → Campos:
      active: true (boolean)
      email: "caio.garcia@gmail.com" (string)
      role: "admin" (string)
      permissions: (map)
        dashboard: true (boolean)
```

### Opção 2: Script Automatizado

```bash
# Se você tiver service account do Firebase DEV
node scripts/create-test-user.mjs caio.garcia@gmail.com Hexa1020**
```

### Opção 3: Mudar para Usuário Existente

```
1. Acesse: https://github.com/ccesargarcia/luisices/settings/secrets/actions

2. Edite:
   TEST_USER_EMAIL → email de um usuário que JÁ EXISTE no Firebase DEV
   TEST_USER_PASSWORD → senha desse usuário
```

---

## 🔍 Como Verificar se as Secrets Estão Configuradas

```
1. Acesse: https://github.com/ccesargarcia/luisices/settings/secrets/actions

2. Deve aparecer na lista:
   ✓ TEST_USER_EMAIL (Updated X days ago)
   ✓ TEST_USER_PASSWORD (Updated X days ago)

3. Se NÃO aparecerem, clique em "New repository secret"
```

**Nota:** GitHub não mostra o VALOR das secrets por segurança, apenas que elas existem.

---

## 📞 Perguntas Frequentes

### P: As secrets estão configuradas mas os testes falham?
**R:** O problema não é a configuração. O usuário não existe no Firebase DEV.

### P: Posso ver o valor das secrets no GitHub?
**R:** Não, por segurança o GitHub nunca mostra os valores. Você só pode criar/editar.

### P: Como saber se as credenciais estão chegando nos testes?
**R:** Adicione um `console.log` temporário no teste:
```typescript
console.log('Email:', process.env.TEST_USER_EMAIL);
console.log('Password:', process.env.TEST_USER_PASSWORD ? '***' : 'não configurado');
```

### P: O .env.test local é usado no CI?
**R:** NÃO! No CI/CD (GitHub Actions) as credenciais vêm das GitHub Secrets, não do .env.test.

---

**Ver também:**
- [TESTE_FIX_URGENTE.md](../TESTE_FIX_URGENTE.md) - Solução rápida
- [TROUBLESHOOT_TESTS.md](./TROUBLESHOOT_TESTS.md) - Troubleshooting completo
