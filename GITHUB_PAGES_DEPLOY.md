# 🚀 Deploy no GitHub Pages - Guia Completo

## ✅ Sim, é possível e GRÁTIS!

GitHub Pages é perfeito para este projeto porque:
- ✅ **100% Gratuito** - hospedagem ilimitada
- ✅ **HTTPS automático** - segurança nativa
- ✅ **Compatível com Firebase** - funciona perfeitamente
- ✅ **CI/CD integrado** - deploy automático via GitHub Actions
- ✅ **Custom domain** - pode usar seu próprio domínio

---

## 🆚 GitHub Pages vs Firebase Hosting

| Aspecto | GitHub Pages | Firebase Hosting |
|---------|--------------|------------------|
| **Custo** | 🟢 Grátis | 🟢 Grátis (10GB/mês) |
| **Setup** | 🟢 Simples | 🟢 Simples |
| **HTTPS** | 🟢 Automático | 🟢 Automático |
| **Custom Domain** | 🟢 Sim | 🟢 Sim |
| **CDN** | 🟢 Global | 🟢 Global |
| **Deploy** | GitHub Actions | Firebase CLI |
| **Limite Banda** | 🟡 100GB/mês | 🟢 10GB/mês (Spark) |
| **Limite Tamanho** | 🟡 1GB total | 🟢 2GB |

**Recomendação:** Use **GitHub Pages** (mais simples e integrado)!

---

## 📋 Pré-requisitos

- ✅ Projeto já no GitHub
- ✅ Firebase configurado (.env.local)
- ✅ Node.js instalado

---

## 🚀 Deploy em 10 Minutos

### Método 1: GitHub Actions (Recomendado - Deploy Automático)

#### Passo 1: Configurar Vite para GitHub Pages (2 min)

Edite `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Adicionar base URL do seu repositório
  base: '/luisices/', // ← SUBSTITUA pelo nome do seu repositório
})
```

**⚠️ IMPORTANTE:** Substitua `luisices` pelo nome do seu repositório GitHub!

#### Passo 2: Criar Workflow do GitHub Actions (3 min)

Crie o arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main  # ou master, dependendo da sua branch principal

# Define permissões necessárias
permissions:
  contents: read
  pages: write
  id-token: write

# Permite apenas um deploy por vez
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Create .env.local with secrets
        run: |
          echo "VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY }}" >> .env.local
          echo "VITE_FIREBASE_AUTH_DOMAIN=${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}" >> .env.local
          echo "VITE_FIREBASE_PROJECT_ID=${{ secrets.VITE_FIREBASE_PROJECT_ID }}" >> .env.local
          echo "VITE_FIREBASE_STORAGE_BUCKET=${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}" >> .env.local
          echo "VITE_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}" >> .env.local
          echo "VITE_FIREBASE_APP_ID=${{ secrets.VITE_FIREBASE_APP_ID }}" >> .env.local

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### Passo 3: Configurar Secrets do Firebase (3 min)

1. **Vá no seu repositório GitHub**
2. **Settings** → **Secrets and variables** → **Actions**
3. **Clique "New repository secret"**
4. Adicione cada variável do seu `.env.local`:

```
Nome: VITE_FIREBASE_API_KEY
Valor: AIzaSy... (seu valor)

Nome: VITE_FIREBASE_AUTH_DOMAIN
Valor: seu-projeto.firebaseapp.com

Nome: VITE_FIREBASE_PROJECT_ID
Valor: seu-projeto

Nome: VITE_FIREBASE_STORAGE_BUCKET
Valor: seu-projeto.appspot.com

Nome: VITE_FIREBASE_MESSAGING_SENDER_ID
Valor: 123456789

Nome: VITE_FIREBASE_APP_ID
Valor: 1:123456789:web:abc123
```

#### Passo 4: Ativar GitHub Pages (2 min)

1. **Repositório** → **Settings** → **Pages**
2. **Source:** GitHub Actions
3. **Save**

#### Passo 5: Deploy! (1 min)

```bash
# Commit e push
git add .
git commit -m "Configure GitHub Pages deploy"
git push origin main
```

**Pronto!** Aguarde 2-3 minutos e acesse:
```
https://seu-usuario.github.io/seu-repositorio/
```

---

### Método 2: Deploy Manual com gh-pages (Alternativo)

#### Passo 1: Instalar gh-pages

```bash
npm install --save-dev gh-pages
```

#### Passo 2: Adicionar scripts ao package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

#### Passo 3: Configurar Vite

Edite `vite.config.ts` (mesmo do Método 1).

#### Passo 4: Deploy

```bash
npm run deploy
```

**⚠️ Problema:** Este método NÃO envia as variáveis de ambiente automaticamente!

**Solução:** Use Método 1 (GitHub Actions) OU coloque as variáveis direto no código (não recomendado para API keys sensíveis).

---

## 🔧 Configurações Adicionais

### Adicionar 404.html para SPA

O GitHub Pages precisa de um tratamento especial para SPAs (Single Page Apps).

Crie `public/404.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Papelaria Dashboard</title>
    <script>
      // Redirecionar 404 para index.html com path preservado
      sessionStorage.redirect = location.href;
    </script>
    <meta http-equiv="refresh" content="0;URL='/'">
  </head>
  <body>
  </body>
</html>
```

Adicione ao `index.html` (antes do `</head>`):

```html
<script>
  (function(){
    var redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
    if (redirect && redirect != location.href) {
      history.replaceState(null, null, redirect);
    }
  })();
</script>
```

### Configurar Custom Domain (Opcional)

1. **Compre um domínio** (ex: papelaria.com.br)
2. **Configure DNS:**
   ```
   Tipo: CNAME
   Nome: www
   Valor: seu-usuario.github.io
   ```
3. **GitHub Pages Settings:**
   - Custom domain: `www.papelaria.com.br`
   - ✅ Enforce HTTPS

---

## 🔒 Segurança das Variáveis Firebase

### ⚠️ IMPORTANTE: Firebase API Keys são PÚBLICAS!

As variáveis do Firebase (`VITE_FIREBASE_API_KEY`, etc.) **NÃO são secretas**!

**Por quê?**
- Elas são enviadas para o navegador de qualquer forma
- Firebase usa **Regras de Segurança** para proteção
- A API Key apenas identifica seu projeto

**Proteção Real:**
1. ✅ **Firestore Security Rules** (já configuramos!)
2. ✅ **Firebase Authentication** (apenas usuários autenticados acessam)
3. ✅ **Domain Restrictions** (opcional)

### Configurar Domain Restrictions (Opcional)

1. **Firebase Console** → **Project Settings** → **General**
2. Role até "**API Restrictions**"
3. Adicione seus domínios:
   ```
   seu-usuario.github.io
   localhost
   ```

---

## 📊 Monitoramento e Analytics

### Ver Tráfego do GitHub Pages

**Repository** → **Insights** → **Traffic**

### Firebase Analytics (Grátis)

Adicione ao `src/lib/firebase.ts`:

```typescript
import { getAnalytics } from 'firebase/analytics';

// ... código existente ...

export const analytics = getAnalytics(app);
```

No Firebase Console:
1. **Analytics** → Ver relatórios em tempo real
2. Usuários ativos, eventos, conversões, etc.

---

## 🚀 CI/CD Avançado (Opcional)

### Deploy Automático em Preview

Crie `.github/workflows/preview.yml`:

```yaml
name: Deploy Preview

on:
  pull_request:
    branches:
      - main

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run build

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview será disponibilizado após merge!'
            })
```

---

## 🐛 Troubleshooting

### Erro: "Action failed with error: no_base"

**Solução:** Verifique se `.github/workflows/deploy.yml` está na branch correta.

### Erro: "Failed to build: VITE_FIREBASE_API_KEY not found"

**Solução:** Configure os Secrets no GitHub (Passo 3 do Método 1).

### Deploy aparece em branco

**Solução:** Verifique se `base` no `vite.config.ts` está correto:
```typescript
base: '/nome-do-repositorio/', // ← Deve ter / no início e fim!
```

### Rotas não funcionam (404)

**Solução:** Adicione `404.html` (veja seção "Configurações Adicionais").

---

## 💰 Custos

### GitHub Pages
- ✅ **100% Gratuito**
- Limite: 100GB bandwidth/mês
- Limite: 1GB tamanho total
- Sem limite de deploys

### Firebase (Backend)
- ✅ **Spark Plan Gratuito** suficiente
- Se ultrapassar: Blaze Plan ~$5-15/mês

**Total: $0/mês** para começar! 🎉

---

## 🎯 Checklist Final

Antes de fazer deploy, verifique:

- [ ] `vite.config.ts` tem `base` configurado
- [ ] Secrets configurados no GitHub
- [ ] GitHub Pages ativado (Source: GitHub Actions)
- [ ] Firebase Firestore ativado
- [ ] Firebase Authentication ativado
- [ ] Firestore Security Rules publicadas
- [ ] `.gitignore` contém `.env.local`
- [ ] Workflow `.github/workflows/deploy.yml` criado

---

## 🚀 Comandos Rápidos

```bash
# Build local para testar
npm run build
npm run preview  # Ver build em http://localhost:4173

# Deploy (se usar gh-pages)
npm run deploy

# Force push para trigger GitHub Actions
git commit --allow-empty -m "Trigger deploy"
git push

# Ver logs do deploy
# GitHub → Actions → Ver último workflow
```

---

## 🔗 URLs Finais

Após deploy, seu app estará em:

```
Produção: https://seu-usuario.github.io/seu-repositorio/
Firebase Console: https://console.firebase.google.com
GitHub Actions: https://github.com/seu-usuario/seu-repositorio/actions
```

---

## 📚 Documentação Oficial

- [GitHub Pages](https://pages.github.com/)
- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html#github-pages)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Firebase Hosting vs GitHub Pages](https://firebase.google.com/docs/hosting)

---

## 💡 Recomendação Final

**Para este projeto:**

1. **Use GitHub Pages** para hospedar o frontend (grátis)
2. **Use Firebase** para backend (grátis até ~1000 pedidos/mês)
3. **Total: $0/mês** por vários meses!

Quando crescer:
- Firebase pode custar $5-15/mês
- GitHub Pages continua grátis sempre!

---

**🎉 Pronto! Seu app estará no ar em minutos!**

Qualquer dúvida, consulte a [documentação oficial do Vite](https://vitejs.dev/guide/static-deploy.html).
