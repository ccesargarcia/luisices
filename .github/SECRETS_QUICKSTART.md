# 🚀 Guia Rápido: Configurar Secrets no GitHub

## Passo a Passo

### 1. Acessar Configurações de Secrets

Acesse: `https://github.com/ccesargarcia/luisices/settings/secrets/actions`

Ou navegue manualmente:
1. Vá no repositório GitHub
2. **Settings** (aba superior)
3. **Secrets and variables** > **Actions** (menu lateral esquerdo)
4. Clique em **"New repository secret"**

---

## 2. Adicionar Secrets Necessárias

### 🔥 Firebase DEV (ambiente de desenvolvimento)

Copie os valores do seu projeto Firebase de **DEV**:

```
DEV_VITE_FIREBASE_API_KEY
DEV_VITE_FIREBASE_AUTH_DOMAIN
DEV_VITE_FIREBASE_PROJECT_ID
DEV_VITE_FIREBASE_STORAGE_BUCKET
DEV_VITE_FIREBASE_MESSAGING_SENDER_ID
DEV_VITE_FIREBASE_APP_ID
DEV_VITE_FIREBASE_MEASUREMENT_ID
FIREBASE_SERVICE_ACCOUNT_DEV
```

**Onde encontrar:** Firebase Console > Configurações do Projeto > Geral > "Seus apps"

### 🧪 Testes E2E (Playwright)

```
TEST_USER_EMAIL=caio.garcia@gmail.com
TEST_USER_PASSWORD=Hexa1020**
```

**Importante:** Use um usuário de teste específico, NÃO use usuários reais de produção!

**Nota:** No CI/CD, os testes rodam contra o **build local** (não precisa de `PLAYWRIGHT_BASE_URL_DEV`).

---

## 3. Service Account JSON

Para `FIREBASE_SERVICE_ACCOUNT_DEV`:

1. Firebase Console > Configurações do Projeto
2. Aba **"Contas de serviço"**
3. Clique em **"Gerar nova chave privada"**
4. Baixe o arquivo JSON
5. Copie **TODO O CONTEÚDO** do arquivo (incluindo `{` e `}`)
6. Cole como valor da secret

---

## 4. Verificar se Funcionou

Após adicionar as secrets:

```bash
git add .
git commit -m "ci: adicionar testes E2E no workflow de dev"
git push origin develop
```

Depois:
1. Vá na aba **Actions** do GitHub
2. Veja o workflow "Deploy to Firebase Hosting (Dev)" rodando
3. Aguarde os testes E2E executarem
4. ✅ Deploy só acontece se os testes passarem!

---

## 📊 O que os Testes Fazem

Os testes E2E (smoke tests) verificam:

- ✅ Login com usuário de teste
- ✅ Navegação para o Dashboard
- ✅ Criação de novo pedido
- ✅ Visualização de lista de pedidos
- ✅ Logout

**Tempo estimado:** ~30-60 segundos

---

## 🐛 Troubleshooting

### ❌ Erro: "Firebase config is missing"
→ Verifique se adicionou TODAS as secrets `DEV_VITE_FIREBASE_*`

### ❌ Erro: "Login failed" nos testes  
→ Confirme que `TEST_USER_EMAIL` e `TEST_USER_PASSWORD` estão corretos
→ Verifique se o usuário existe no Firebase Authentication (ambiente DEV)

### ❌ Erro: "Deploy failed"
→ Verifique se `FIREBASE_SERVICE_ACCOUNT_DEV` é um JSON válido completo

---

## 📋 Checklist Completo

- [ ] Adicionei `DEV_VITE_FIREBASE_API_KEY`
- [ ] Adicionei `DEV_VITE_FIREBASE_AUTH_DOMAIN`
- [ ] Adicionei `DEV_VITE_FIREBASE_PROJECT_ID`
- [ ] Adicionei `DEV_VITE_FIREBASE_STORAGE_BUCKET`
- [ ] Adicionei `DEV_VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] Adicionei `DEV_VITE_FIREBASE_APP_ID`
- [ ] Adicionei `DEV_VITE_FIREBASE_MEASUREMENT_ID`
- [ ] Adicionei `FIREBASE_SERVICE_ACCOUNT_DEV` (JSON completo)
- [ ] Adicionei `TEST_USER_EMAIL`
- [ ] Adicionei `TEST_USER_PASSWORD`
- [ ] Fiz push no branch `develop`
- [ ] Verifiquei que o workflow executou com sucesso

---

**Pronto! 🎉** Agora todo push no `develop` vai:
1. ✅ Rodar build
2. ✅ Rodar testes E2E
3. ✅ Fazer deploy (só se tudo passar)
