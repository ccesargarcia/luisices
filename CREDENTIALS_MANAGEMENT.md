# 🔐 Gestão de Credenciais - Desenvolvimento vs CI/CD

## ⚠️ IMPORTANTE: Credenciais NUNCA devem ser commitadas!

Este projeto usa **diferentes abordagens** para credenciais em desenvolvimento local vs CI/CD:

---

## 📋 Visão Geral

| Ambiente | Arquivo | Fonte das Credenciais | Commitado? |
|----------|---------|----------------------|------------|
| **Local** | `.env.test` | Criado manualmente pelo dev | ❌ NÃO |
| **CI/CD** | `.env.test` | Gerado automaticamente com **GitHub Secrets** | N/A |
| **Template** | `.env.test.example` | Arquivo de exemplo | ✅ SIM |

---

## 🏠 Desenvolvimento Local

### Primeira vez - Configuração:

```bash
# 1. Copiar o template
cp .env.test.example .env.test

# 2. Abrir e preencher com suas credenciais
nano .env.test
```

**Exemplo de `.env.test` preenchido:**
```dotenv
TEST_USER_EMAIL=caio.garcia@gmail.com
TEST_USER_PASSWORD=Hexa1020**
PLAYWRIGHT_BASE_URL=https://dev.luisices.com.br
```

### ⚠️ Verificar que está ignorado:

```bash
# Deve retornar vazio (arquivo não está sendo rastreado)
git ls-files | grep .env.test

# Deve aparecer como "ignored"
git status --ignored | grep .env.test
```

### ✅ Executar testes localmente:

```bash
npm run test:smoke        # Testes básicos
npm run test:e2e          # Todos os testes
npm run test:e2e:ui       # Interface visual
```

---

## 🤖 CI/CD (GitHub Actions)

No GitHub Actions, o arquivo `.env.test` é **gerado dinamicamente** usando secrets.

### Como funciona:

1. **Você configura secrets no GitHub** (uma vez):
   - `TEST_USER_EMAIL`
   - `TEST_USER_PASSWORD`
   - `PLAYWRIGHT_BASE_URL_DEV`

2. **O workflow cria `.env.test` automaticamente**:

```yaml
- name: Create .env.test for E2E tests
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
    PLAYWRIGHT_BASE_URL: ${{ secrets.PLAYWRIGHT_BASE_URL_DEV }}
  run: |
    printf 'TEST_USER_EMAIL=%s\n' "$TEST_USER_EMAIL" >> .env.test
    printf 'TEST_USER_PASSWORD=%s\n' "$TEST_USER_PASSWORD" >> .env.test
    printf 'PLAYWRIGHT_BASE_URL=%s\n' "$PLAYWRIGHT_BASE_URL" >> .env.test
```

3. **Testes rodam com essas credenciais**
4. **Arquivo é descartado** após o workflow terminar

---

## 🔑 Configurar Secrets no GitHub

**URL:** https://github.com/ccesargarcia/luisices/settings/secrets/actions

### Secrets necessárias para testes:

| Nome da Secret | Valor | Descrição |
|----------------|-------|-----------|
| `TEST_USER_EMAIL` | `caio.garcia@gmail.com` | Email do usuário de teste |
| `TEST_USER_PASSWORD` | `Hexa1020**` | Senha do usuário de teste |
| `PLAYWRIGHT_BASE_URL_DEV` | `https://dev.luisices.com.br` | URL do ambiente de dev |

**Passo a passo:**
1. Acesse o link acima
2. Clique em **"New repository secret"**
3. Adicione cada secret
4. Faça push no `develop` → Testes rodam automaticamente!

---

## 🛡️ Segurança

### ✅ O que está seguro:

- `.env.test` está no `.gitignore` → **nunca será commitado**
- `.env.test.example` não contém credenciais reais
- GitHub Secrets são **criptografadas** e **mascaradas** nos logs
- Credenciais do ambiente DEV não são as mesmas de PRODUÇÃO

### ❌ NUNCA faça isso:

```bash
# ❌ NÃO fazer
git add .env.test
git add .env.local
git add .env.production
```

### ✅ Se cometer um erro:

Se você acidentalmente commitou credenciais:

```bash
# 1. Remover do staging
git reset HEAD .env.test

# 2. Se já foi commitado mas não pushed
git reset --soft HEAD~1

# 3. Se já foi pushed - TROCAR AS CREDENCIAIS IMEDIATAMENTE
# - Mudar senha do usuário no Firebase
# - Atualizar secrets no GitHub
# - Usar git filter-branch ou BFG para limpar histórico
```

---

## 📝 Checklist de Segurança

### Para desenvolvedores:

- [ ] Copiei `.env.test.example` para `.env.test`
- [ ] Preenchi com minhas credenciais locais
- [ ] Verifiquei que `.env.test` NÃO aparece em `git status`
- [ ] Nunca compartilhei o arquivo `.env.test` com ninguém

### Para CI/CD:

- [ ] Configurei as 3 secrets de teste no GitHub
- [ ] Testei um push no `develop` → Workflow passou
- [ ] Verifiquei que credenciais estão **mascaradas** nos logs do GitHub Actions

---

## 🔍 Verificar se há vazamento de credenciais

```bash
# Buscar por possíveis credenciais no histórico do git
git log --all --full-history --source -- .env.test

# Deve retornar vazio!

# Buscar por credenciais hardcoded no código
grep -r "TEST_USER_PASSWORD" --include="*.ts" --include="*.tsx" src/

# Não deve encontrar nada
```

---

## 📚 Referências

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Playwright Environment Variables](https://playwright.dev/docs/test-configuration#environment-variables)
- [Git Ignore Documentation](https://git-scm.com/docs/gitignore)

---

## 💡 Dicas

### Usar credenciais diferentes por ambiente:

```dotenv
# .env.test (local - dev Firebase)
TEST_USER_EMAIL=dev-user@exemplo.com
TEST_USER_PASSWORD=DevPassword123

# GitHub Secrets (CI/CD - dev Firebase)
TEST_USER_EMAIL=ci-user@exemplo.com  
TEST_USER_PASSWORD=CIPassword456
```

### Criar usuário de teste dedicado:

```bash
# Firebase CLI
firebase auth:create teste-e2e@exemplo.com --password "SenhaSegura123!"

# Ou pelo Firebase Console:
# Authentication > Add user
```

---

**Última atualização:** 6 de março de 2026  
**Status:** ✅ Credenciais seguras, nenhum vazamento detectado
