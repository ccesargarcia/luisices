# 🔐 URGENTE: Configurar Secrets no GitHub (2 minutos)

## ❌ Problema Atual

**Secrets NÃO configuradas** → Testes usam credenciais de fallback que não existem:
- Email: `teste@exemplo.com` 
- Senha: `senha123`

## ✅ Solução: Adicionar as Secrets

### Passo 1: Acessar Página de Secrets

**Link direto:**
```
https://github.com/ccesargarcia/luisices/settings/secrets/actions
```

**Ou navegue manualmente:**
1. Vá no seu repositório GitHub
2. Aba **"Settings"** (canto superior direito)
3. Menu lateral esquerdo → **"Secrets and variables"** → **"Actions"**

---

### Passo 2: Adicionar TEST_USER_EMAIL

1. Clique no botão verde **"New repository secret"**

2. Preencha:
   ```
   Name: TEST_USER_EMAIL
   Secret: caio.garcia@gmail.com
   ```

3. Clique em **"Add secret"**

---

### Passo 3: Adicionar TEST_USER_PASSWORD

1. Clique novamente em **"New repository secret"**

2. Preencha:
   ```
   Name: TEST_USER_PASSWORD
   Secret: Hexa1020**
   ```

3. Clique em **"Add secret"**

---

### Passo 4: Verificar

Na página de secrets deve aparecer:

```
Repository secrets (2)

✓ TEST_USER_EMAIL          Updated now
✓ TEST_USER_PASSWORD       Updated now
```

---

## ⚠️ AINDA NÃO ACABOU!

Depois de configurar as secrets, você **AINDA PRECISA** criar o usuário no Firebase DEV:

### Opção A: Console Firebase (Manual)

1. **Authentication:**
   - https://console.firebase.google.com/project/luisices-dev/authentication/users
   - Clique em **"Add user"**
   - Email: `caio.garcia@gmail.com`
   - Password: `Hexa1020**`
   - **COPIE O UID** que foi gerado

2. **Firestore:**
   - https://console.firebase.google.com/project/luisices-dev/firestore
   - Collection: `users`
   - Clique em **"Add document"**
   - Document ID: **{Cole o UID aqui}**
   - Adicione os campos:

   | Campo | Tipo | Valor |
   |-------|------|-------|
   | active | boolean | true |
   | email | string | caio.garcia@gmail.com |
   | name | string | Teste E2E |
   | role | string | admin |
   | permissions | map | (próximo passo) |

3. **Adicionar permissions (subcampo):**
   - Clique em "Add field" dentro de `permissions`
   - `dashboard`: true (boolean)
   - `orders` (map):
     - `view`: true
     - `create`: true
     - `edit`: true

---

### Opção B: Script Automatizado

```bash
# 1. Baixar service account do Firebase DEV
# (Project Settings > Service Accounts > Generate New Private Key)
# Salvar como: luisices-dev-firebase-adminsdk.json

# 2. Rodar script
firebase use dev
node scripts/create-test-user.mjs
```

---

## 🧪 Testar se Funcionou

Depois de configurar as secrets E criar o usuário:

```bash
# Fazer push vazio para triggerar workflow
git commit --allow-empty -m "test: verificar secrets e usuário configurados"
git push origin develop
```

Acompanhe em:
```
https://github.com/ccesargarcia/luisices/actions
```

---

## 📊 Checklist Completo

- [ ] Adicionei `TEST_USER_EMAIL` nas secrets do GitHub
- [ ] Adicionei `TEST_USER_PASSWORD` nas secrets do GitHub
- [ ] Criei usuário no Firebase Authentication (DEV)
- [ ] Criei perfil no Firestore com `active: true`
- [ ] Fiz push no `develop` para testar
- [ ] Verifiquei que os testes passaram no GitHub Actions

---

## 🆘 Precisa de Ajuda?

- **[TESTE_FIX_URGENTE.md](./TESTE_FIX_URGENTE.md)** - Guia completo de solução
- **[.github/FLUXO_CREDENCIAIS.md](./.github/FLUXO_CREDENCIAIS.md)** - Como as credenciais funcionam
- **[.github/TROUBLESHOOT_TESTS.md](./.github/TROUBLESHOOT_TESTS.md)** - Troubleshooting

---

**Última atualização:** 6 de março de 2026
