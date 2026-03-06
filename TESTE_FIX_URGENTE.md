# 🔥 AÇÃO IMEDIATA: Testes Falhando

## ❌ Problema
Todos os 6 testes E2E falharam com:
```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
waiting for navigation to "**/dashboard" until "load"
```

## 🎯 Causa Raiz
**O usuário `caio.garcia@gmail.com` não existe ou está inativo no Firebase DEV.**

Os testes conseguem fazer login, mas o redirecionamento para `/dashboard` não acontece porque:
1. Usuário não existe no Firebase Authentication DEV, OU
2. Usuário existe mas não tem perfil no Firestore (`users` collection), OU
3. Perfil existe mas `active: false`, OU
4. Perfil existe mas não tem `permissions.dashboard: true`

## ✅ Solução Rápida (5 minutos)

### Opção A: Criar usuário manualmente no Firebase Console

1. **Criar no Authentication:**
   - Acesse: https://console.firebase.google.com/project/luisices-dev/authentication/users
   - Clique em "Add user"
   - Email: `caio.garcia@gmail.com`
   - Password: `Hexa1020**`
   - Clique em "Add user"
   - **COPIE O UID** que foi gerado

2. **Criar perfil no Firestore:**
   - Acesse: https://console.firebase.google.com/project/luisices-dev/firestore/databases/-default-/data
   - Navegue para a collection `users`
   - Clique em "Add document"
   - Document ID: **COLE O UID** do passo anterior
   - Adicione os campos:

   | Campo | Tipo | Valor |
   |-------|------|-------|
   | `active` | boolean | `true` |
   | `email` | string | `caio.garcia@gmail.com` |
   | `name` | string | `Teste E2E` |
   | `role` | string | `admin` |
   | `createdAt` | timestamp | (data atual) |
   | `updatedAt` | timestamp | (data atual) |
   
   - Adicione subcampo `permissions` (tipo: map):
     - `dashboard`: true (boolean)
     - `orders`: (map)
       - `view`: true (boolean)
       - `create`: true (boolean)
       - `edit`: true (boolean)
     - `customers`: (map)
       - `view`: true (boolean)
       - `create`: true (boolean)

3. **Testar:**
   ```bash
   # Fazer novo push para triggerar workflow
   git commit --allow-empty -m "test: rerun CI após criar usuário"
   git push origin develop
   ```

---

### Opção B: Usar script automatizado

1. **Baixar Service Account Key:**
   - Acesse: https://console.firebase.google.com/project/luisices-dev/settings/serviceaccounts/adminsdk
   - Clique em "Generate new private key"
   - Salve como `luisices-dev-firebase-adminsdk.json` na raiz do projeto
   - ⚠️ **NÃO COMMITE** esse arquivo!

2. **Rodar script:**
   ```bash
   firebase use dev
   node scripts/create-test-user.mjs caio.garcia@gmail.com Hexa1020**
   ```

3. **Testar:**
   ```bash
   git commit --allow-empty -m "test: rerun CI após criar usuário"
   git push origin develop
   ```

---

### Opção C: Usar credenciais de usuário existente

Se você já tem um usuário admin no Firebase DEV:

1. **Atualizar secrets no GitHub:**
   - Acesse: https://github.com/ccesargarcia/luisices/settings/secrets/actions
   - Edite `TEST_USER_EMAIL` → coloque email do usuário existente
   - Edite `TEST_USER_PASSWORD` → coloque senha do usuário existente

2. **Testar:**
   ```bash
   git commit --allow-empty -m "test: rerun CI com novo usuário"
   git push origin develop
   ```

---

## 🔍 Como Verificar se Funcionou

1. Acesse: https://github.com/ccesargarcia/luisices/actions
2. Aguarde workflow "Deploy to Firebase Hosting (Dev)" executar
3. Verifique step "Run E2E Tests (Smoke)"
4. ✅ Deve mostrar: "7 passed (Xm Ys)"

---

## 📚 Documentação Completa

- [Troubleshooting Detalhado](.github/TROUBLESHOOT_TESTS.md)
- [Guia de Secrets](.github/SECRETS_QUICKSTART.md)
- [README Testes E2E](tests/e2e/README.md)

---

**Última atualização:** 6 de março de 2026
