# 🚀 Deploy Rápido - GitHub Pages

**Tempo estimado: 10 minutos**

---

## ✅ Pré-requisitos

- ✅ Projeto commitado no GitHub
- ✅ Firebase configurado localmente (.env.local)
- ✅ Conta GitHub

---

## 📋 Passos

### 1. Configure o Nome do Repositório (1 min)

Edite `vite.config.ts`, linha 21:

```typescript
base: '/SEU-REPOSITORIO-AQUI/',  // ← Substitua!
```

**Exemplo:** Se seu repo é `https://github.com/usuario/papelaria-app`:
```typescript
base: '/papelaria-app/',
```

### 2. Adicione os Secrets do Firebase no GitHub (4 min)

1. Vá em: **https://github.com/seu-usuario/seu-repo/settings/secrets/actions**

2. Clique "**New repository secret**" para cada variável:

```
Nome: VITE_FIREBASE_API_KEY
Valor: [Cole o valor do seu .env.local]

Nome: VITE_FIREBASE_AUTH_DOMAIN
Valor: [Cole o valor do seu .env.local]

Nome: VITE_FIREBASE_PROJECT_ID
Valor: [Cole o valor do seu .env.local]

Nome: VITE_FIREBASE_STORAGE_BUCKET
Valor: [Cole o valor do seu .env.local]

Nome: VITE_FIREBASE_MESSAGING_SENDER_ID
Valor: [Cole o valor do seu .env.local]

Nome: VITE_FIREBASE_APP_ID
Valor: [Cole o valor do seu .env.local]
```

**💡 Dica:** Abra seu `.env.local` e copie cada valor (sem as aspas).

### 3. Ative GitHub Pages (2 min)

1. Vá em: **Settings** → **Pages**
2. Em "**Source**", selecione: **GitHub Actions**
3. Clique "**Save**"

### 4. Commit e Push (2 min)

```bash
# Adicionar arquivos de deploy
git add .github/workflows/deploy.yml vite.config.ts

# Commit
git commit -m "Configure GitHub Pages deploy"

# Push (irá triggar o deploy automático)
git push origin main
```

### 5. Aguarde o Deploy (2-3 min)

1. Vá em: **Actions** → Ver último workflow
2. Aguarde o ✅ verde (build + deploy)

### 6. Acesse seu App! 🎉

```
https://seu-usuario.github.io/seu-repositorio/
```

---

## 🐛 Problemas Comuns

### ❌ Página em branco

**Solução:** Verifique se `base` no `vite.config.ts` está correto:
```typescript
base: '/nome-exato-do-repo/',  // ⚠️ Precisa ter / no início e fim!
```

### ❌ "Failed to build: VITE_FIREBASE_API_KEY not found"

**Solução:** Configure os Secrets no passo 2.

### ❌ Deploy falha

**Solução:**
1. Vá em Settings → Actions → General
2. Ative "**Read and write permissions**"
3. Push novamente

---

## 🔄 Deploy Futuro

Depois da configuração inicial, **deploy automático**:

```bash
# Qualquer push na branch main faz deploy automaticamente!
git add .
git commit -m "Sua alteração"
git push
```

Aguarde 2-3 minutos e as mudanças estarão no ar! ✨

---

## 📊 Monitorar Deploy

- **Status:** https://github.com/seu-usuario/seu-repo/actions
- **Site:** https://seu-usuario.github.io/seu-repo/

---

## 💰 Custo

**100% GRATUITO!** 🎉

- ✅ Hospedagem ilimitada
- ✅ HTTPS automático
- ✅ 100GB bandwidth/mês
- ✅ Deploy ilimitado

---

## 📚 Documentação Completa

Para mais detalhes: [GITHUB_PAGES_DEPLOY.md](./GITHUB_PAGES_DEPLOY.md)

---

**🎉 Pronto! Seu app está no ar!**
