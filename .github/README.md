# 🔧 CI/CD - GitHub Actions Workflows

Este diretório contém os workflows de CI/CD para deploy automático do projeto.

## 📁 Estrutura

```
.github/
├── workflows/
│   ├── deploy.yml        # Deploy para PRODUÇÃO (branch: main)
│   └── deploy-dev.yml    # Deploy para DEV + Testes E2E (branch: develop)
├── SECRETS_QUICKSTART.md # Guia rápido de configuração de secrets
└── SETUP_SECRETS.md      # Documentação completa das secrets
```

---

## 🚀 Workflows

### 1. **Deploy DEV** (`deploy-dev.yml`)

**Branch:** `develop`
**URL:** https://dev.luisices.com.br

**Fluxo:**
1. ✅ Build da aplicação
2. ✅ **Testes E2E (Smoke)** com Playwright
3. ✅ Deploy no Firebase Hosting (DEV)
4. ✅ Upload dos resultados dos testes

**Testes executados:**
- Login
- Dashboard
- Criação de pedido
- Navegação básica

**⏱️ Tempo médio:** 3-5 minutos

---

### 2. **Deploy PRODUÇÃO** (`deploy.yml`)

**Branch:** `main`
**URL:** https://luisices.com.br

**Fluxo:**
1. ✅ Build da aplicação
2. ✅ Deploy no GitHub Pages

**⏱️ Tempo médio:** 2-3 minutos

**⚠️ IMPORTANTE:** Produção NÃO roda testes automaticamente. Sempre teste no DEV antes de mergear para main!

---

## 🔐 Configuração de Secrets

### Secrets Necessárias

| Secret | Usado em | Descrição |
|--------|----------|-----------|
| `DEV_VITE_FIREBASE_*` | DEV | Credenciais Firebase (dev) |
| `VITE_FIREBASE_*` | PROD | Credenciais Firebase (prod) |
| `TEST_USER_EMAIL` | DEV | Email do usuário de teste |
| `TEST_USER_PASSWORD` | DEV | Senha do usuário de teste |
| `PLAYWRIGHT_BASE_URL_DEV` | DEV | URL do ambiente de testes |
| `FIREBASE_SERVICE_ACCOUNT_DEV` | DEV | Service Account JSON (dev) |

**👉 Veja o guia completo:** [SECRETS_QUICKSTART.md](./SECRETS_QUICKSTART.md)

---

## 🧪 Testes E2E

Os testes E2E rodam **apenas no workflow de DEV** antes do deploy.

### Como funciona?

1. Workflow cria arquivo `.env.test` com secrets
2. Instala Playwright e browsers
3. Executa testes smoke (`npm run test:smoke`)
4. Se os testes **passarem** → Deploy acontece
5. Se os testes **falharem** → Deploy é **bloqueado**

### Ver resultados dos testes

**GitHub Actions:**
1. Vá na aba **Actions**
2. Clique no workflow executado
3. Clique em "Artifacts" no final da página
4. Baixe `playwright-report-XXX.zip`
5. Abra `index.html` no navegador

**Localmente:**
```bash
npm run test:smoke        # Roda testes
npm run test:report       # Abre relatório
```

---

## 🔄 Workflow de Desenvolvimento

### Fluxo recomendado:

```bash
# 1. Desenvolver no branch develop
git checkout develop
git pull origin develop

# 2. Fazer mudanças
# ... código ...

# 3. Commit e push
git add .
git commit -m "feat: nova funcionalidade"
git push origin develop

# 4. GitHub Actions roda:
#    ✅ Build
#    ✅ Testes E2E
#    ✅ Deploy em DEV (se testes passarem)

# 5. Testar em https://dev.luisices.com.br

# 6. Se estiver OK, mergear para main
git checkout main
git merge develop
git push origin main

# 7. GitHub Actions deploya em PRODUÇÃO
#    https://luisices.com.br
```

---

## 📊 Status dos Workflows

**Ver últimas execuções:**
https://github.com/ccesargarcia/luisices/actions

**Badges:**

[![Deploy DEV](https://github.com/ccesargarcia/luisices/actions/workflows/deploy-dev.yml/badge.svg)](https://github.com/ccesargarcia/luisices/actions/workflows/deploy-dev.yml)

[![Deploy PROD](https://github.com/ccesargarcia/luisices/actions/workflows/deploy.yml/badge.svg)](https://github.com/ccesargarcia/luisices/actions/workflows/deploy.yml)

---

## 🐛 Troubleshooting

### ❌ Testes falhando no CI mas passando localmente

**Possíveis causas:**
- Credenciais de teste diferentes entre local e CI
- URL base diferente (verifique `PLAYWRIGHT_BASE_URL_DEV`)
- Timeouts muito curtos para ambiente CI

**Solução:**
```bash
# Testar com as mesmas configs do CI
PLAYWRIGHT_BASE_URL=https://dev.luisices.com.br npm run test:smoke
```

### ❌ Deploy falhou mas testes passaram

**Possíveis causas:**
- `FIREBASE_SERVICE_ACCOUNT_DEV` incorreto ou expirado
- Permissões insuficientes no Firebase
- Projeto Firebase não existe

**Solução:**
1. Regenerar Service Account no Firebase Console
2. Atualizar a secret `FIREBASE_SERVICE_ACCOUNT_DEV`

### ❌ Build falhou

**Possíveis causas:**
- Secrets Firebase faltando ou incorretas
- Erro de compilação TypeScript
- Dependência faltando

**Solução:**
1. Verificar logs do workflow no GitHub Actions
2. Rodar `npm run build` localmente
3. Corrigir erros e fazer novo push

---

## 📚 Documentação Adicional

- [Configurar Secrets (Guia Rápido)](./SECRETS_QUICKSTART.md)
- [Configurar Secrets (Documentação Completa)](./SETUP_SECRETS.md)
- [Playwright CI/CD](https://playwright.dev/docs/ci)
- [Firebase Hosting + GitHub Actions](https://firebase.google.com/docs/hosting/github-integration)

---

**Última atualização:** 6 de março de 2026
