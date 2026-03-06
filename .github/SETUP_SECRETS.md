# Configuração de Secrets no GitHub Actions

Este documento lista todas as secrets necessárias para os workflows de CI/CD funcionarem corretamente.

## 🔐 Como Configurar

1. Acesse: `https://github.com/SEU_USERNAME/luisices/settings/secrets/actions`
2. Clique em **"New repository secret"**
3. Adicione cada secret listada abaixo

---

## 📋 Secrets Necessárias

### **Firebase - Desenvolvimento (Dev)**

Credenciais do projeto Firebase de desenvolvimento:

| Nome da Secret | Descrição | Onde encontrar |
|----------------|-----------|----------------|
| `VITE_FIREBASE_API_KEY_DEV` | API Key do Firebase (dev) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_AUTH_DOMAIN_DEV` | Auth Domain (dev) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_PROJECT_ID_DEV` | Project ID (dev) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_STORAGE_BUCKET_DEV` | Storage Bucket (dev) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_MESSAGING_SENDER_ID_DEV` | Messaging Sender ID (dev) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_APP_ID_DEV` | App ID (dev) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_MEASUREMENT_ID_DEV` | Measurement ID (dev) | Firebase Console > Project Settings > General |
| `FIREBASE_SERVICE_ACCOUNT_DEV` | Service Account JSON (dev) | Firebase Console > Project Settings > Service Accounts |

### **Firebase - Produção (Main)**

Credenciais do projeto Firebase de produção:

| Nome da Secret | Descrição | Onde encontrar |
|----------------|-----------|----------------|
| `VITE_FIREBASE_API_KEY` | API Key do Firebase (prod) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain (prod) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_PROJECT_ID` | Project ID (prod) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket (prod) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID (prod) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_APP_ID` | App ID (prod) | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_MEASUREMENT_ID` | Measurement ID (prod) | Firebase Console > Project Settings > General |

### **Testes E2E (Playwright)**

Credenciais para executar os testes automatizados:

| Nome da Secret | Descrição | Exemplo |
|----------------|-----------|---------|
| `TEST_USER_EMAIL` | Email do usuário de teste | `teste@exemplo.com` |
| `TEST_USER_PASSWORD` | Senha do usuário de teste | `SenhaSegura123!` |
| `PLAYWRIGHT_BASE_URL_DEV` | URL do ambiente de dev | `https://luisices-dev.web.app` |

---

## 🚀 Como Obter o Service Account JSON

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Project Settings** (ícone de engrenagem)
4. Aba **Service Accounts**
5. Clique em **"Generate new private key"**
6. Copie **TODO O CONTEÚDO** do arquivo JSON baixado
7. Cole como valor da secret `FIREBASE_SERVICE_ACCOUNT_DEV`

**⚠️ IMPORTANTE:** O Service Account JSON deve ser colado **completo**, incluindo as chaves `{}`.

---

## 🧪 Criar Usuário de Teste

Para os testes E2E funcionarem, você precisa:

1. Criar um usuário específico para testes no Firebase Authentication
2. **Não usar um usuário real de produção**
3. Dar permissões adequadas no Firestore (role: `admin` ou `user`)

```bash
# Exemplo de criação via Firebase CLI
firebase auth:create teste@exemplo.com --password "SenhaSegura123!"
```

Depois, adicione o usuário nas collections do Firestore se necessário.

---

## ✅ Verificar Configuração

Após adicionar todas as secrets:

1. Faça um push no branch `develop`
2. Acompanhe o workflow em: `Actions` tab
3. Verifique se o build e os testes passam
4. Se falhar, revise as secrets nos logs (Firebase Config será mascarado)

---

## 📞 Troubleshooting

### ❌ Erro: "Firebase config is missing"
- Verifique se todas as secrets `VITE_FIREBASE_*` foram adicionadas
- Confirme que não há espaços no início/fim dos valores

### ❌ Erro: "Authentication failed" nos testes
- Verifique `TEST_USER_EMAIL` e `TEST_USER_PASSWORD`
- Confirme que o usuário existe no Firebase Auth do ambiente de dev

### ❌ Erro: "Deploy failed"
- Verifique se `FIREBASE_SERVICE_ACCOUNT_DEV` está correto
- Confirme que o JSON está completo (começa com `{` e termina com `}`)

---

## 🔗 Links Úteis

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Firebase Service Accounts](https://firebase.google.com/docs/admin/setup)
- [Playwright CI/CD](https://playwright.dev/docs/ci)
