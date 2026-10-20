# 🔧 CI/CD - GitHub Actions Workflows

Este diretório contém os workflows de CI/CD para deploy automático do projeto.

## 📁 Estrutura

```
.github/
├── workflows/
│   ├── deploy.yml                    # Site e regras/índices de produção
│   ├── deploy-dev.yml                # Validação e deploy seletivo em DEV
│   ├── deploy-functions-manual.yml   # Functions: produção automática, DEV manual
│   ├── deploy-cloudflare.yml         # Workers da Cloudflare
│   ├── playwright.yml                # Testes Playwright manuais
│   └── test-actions.yml              # Testes reutilizáveis no CI
└── SETUP_SECRETS.md                  # Guia de configuração de secrets
```

---

## 🚀 Workflows

### 1. **Deploy DEV** (`deploy-dev.yml`)

**Branch:** `develop`
**URL:** https://dev.luisices.com.br

O workflow roda em pushes elegíveis para `develop` ou manualmente. Ele identifica se as alterações afetam o frontend, Functions ou regras e escolhe os alvos de validação e deploy. As validações incluem build, testes unitários, lint e, quando indicado pelas alterações ou selecionado manualmente, E2E com Playwright e Firebase Emulator Suite.

No acionamento manual, é possível escolher `auto`, `all`, `functions-only`, `hosting-only` ou `rules-only`, além de definir se os testes E2E devem rodar. O deploy só publica os recursos selecionados depois que as validações exigidas para aquela execução passam.

---

### 2. **Deploy PRODUÇÃO** (`deploy.yml`)

**Branch:** `main`
**URL:** https://luisices.com.br

No push para `main` ou acionamento manual, o workflow instala as dependências, valida as configurações de produção, executa o build e publica o site no GitHub Pages. Quando `firebase.json`, regras ou índices mudam, também publica as configurações Firebase correspondentes. Este workflow não repete a suíte de testes; os checks do pull request e a validação em DEV são a barreira antes do merge.

Alterações somente em documentação, testes, Functions ou workflows são filtradas do deploy do site. O deploy de Functions em produção é tratado por [deploy-functions-manual.yml](workflows/deploy-functions-manual.yml), que roda automaticamente quando `functions/**` ou `firebase.json` mudam em `main`.

### 3. **Testes E2E** (`test-actions.yml` e `playwright.yml`)

O workflow reutilizável é chamado pelo deploy de DEV quando a estratégia detecta que E2E é necessário. Também roda em pull requests para `develop` e `main`, e pode ser iniciado manualmente com um alvo específico. Os testes usam a Firebase Emulator Suite; não gravam no banco de produção.

`playwright.yml` permite executar manualmente grupos como `security`, `critical`, `orders`, `order-integrity`, `store` e `screen-audit`. O workflow `test-actions.yml` divide a suíte completa em dois shards e publica relatórios, vídeos e traces como artefatos.

### 4. **Deploy Cloudflare** (`deploy-cloudflare.yml`)

Mudanças em `cloudflare/**` e scripts relacionados publicam os Workers no ambiente da branch (`develop` ou `main`). O workflow também permite selecionar ambiente e Worker em uma execução manual.

---

## 🔐 Configuração de Secrets

Os workflows usam secrets de Firebase, contas de serviço e integrações externas. Os nomes exatos, fallbacks e usos variam por workflow e estão documentados no [guia de secrets](./SETUP_SECRETS.md). Esse guia e os próprios YAMLs são a fonte de verdade; não copie valores de secrets para arquivos versionados ou logs.

---

## 🧪 Testes E2E

Os testes E2E podem rodar em pull requests, no deploy de DEV quando as alterações exigem essa validação, ou manualmente. A execução usa os emuladores Firebase.

### Como funciona?

1. Instala as dependências, Playwright e Java necessários para os emuladores.
2. Cria configuração local de teste e dados de seed.
3. Executa o alvo selecionado, incluindo testes unitários e de integração no fluxo de CI.
4. No deploy de DEV, as etapas de deploy aguardam as validações que foram selecionadas para aquela mudança.

### Ver resultados dos testes

**GitHub Actions:**
1. Vá na aba **Actions**
2. Clique no workflow executado
3. Clique em "Artifacts" no final da página
4. Baixe `playwright-report-XXX.zip`
5. Abra `index.html` no navegador

**Localmente:**
```bash
npm run test:ci            # Executa Playwright no Chromium
npm run test:report        # Abre o relatório Playwright
```

Para configurar os emuladores, credenciais de teste e seed local, siga o [guia dos testes E2E](../tests/e2e/README.md). A lista dos demais comandos está em `package.json`.

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

# 4. GitHub Actions identifica os arquivos alterados e escolhe
#    as validações e os recursos de DEV aplicáveis.
#    E2E roda quando necessário ou quando selecionado manualmente.

# 5. Testar em https://dev.luisices.com.br

# 6. Se estiver OK, mergear para main
git checkout main
git merge develop
git push origin main

# 7. O merge em main aciona o deploy de produção aplicável.
#    O site é publicado em https://luisices.com.br; Functions
#    têm workflow próprio quando functions/** ou firebase.json mudam.
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
# Para configurar uma execução local com emuladores, siga o guia E2E.
# Consulte os comandos disponíveis no package.json.
npm run test:critical
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

- [Configurar Secrets (Documentação Completa)](./SETUP_SECRETS.md)
- [Playwright CI/CD](https://playwright.dev/docs/ci)
- [Firebase Hosting + GitHub Actions](https://firebase.google.com/docs/hosting/github-integration)

---

**Última atualização:** 20 de outubro de 2026
