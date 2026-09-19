# 🧪 Testes E2E — Playwright (Luisices)

Esta pasta contém a suíte completa de testes automatizados end-to-end (E2E) usando Playwright para validação de fluxos críticos, regras de negócio, permissões RBAC, segurança e catálogo público.

---

## 📁 Estrutura de Testes

```
tests/e2e/
├── auth.spec.ts                      # Autenticação (login, logout, erros)
├── critical-flows.spec.ts            # Fluxos críticos da aplicação
├── customer-order-lifecycle.spec.ts  # Ciclo completo cliente -> pedido
├── customers.spec.ts                 # CRUD e regras de clientes
├── exchanges.spec.ts                 # Permutas e parcerias
├── gallery.spec.ts                   # Galeria de artes e uploads
├── help.spec.ts                      # Central de ajuda e atalhos
├── navigation.spec.ts                # Navegação entre páginas e rotas
├── order-details.spec.ts             # Detalhes e workflow de pedidos
├── orders.spec.ts                    # Gestão e listagem de pedidos
├── permissions.spec.ts               # Validação de permissões e papéis (RBAC)
├── products.spec.ts                  # CRUD de produtos e catálogo interno
├── quotes.spec.ts                    # CRUD e conversão de orçamentos
├── reports.spec.ts                   # Relatórios e exportações
├── security.spec.ts                  # Segurança, isolamento e Firestore rules
├── settings.spec.ts                  # Configurações do usuário e sistema
├── store.spec.ts                     # Loja pública, sacola, anti-XSS e backoffice
├── users.spec.ts                     # Gestão de usuários e convites
└── weekly-calendar.spec.ts           # Agenda semanal de entregas
```

---

## 🚀 Como Executar

### ⚡ Testes Rápidos (CI / Smoke)
```bash
npm run test:ci
```

### 📦 Todos os Testes
```bash
npm run test:e2e
```

### 🛍️ Testes Específicos por Módulo
```bash
npm run test:store        # Lojinha pública, sacola, segurança e backoffice
npm run test:customers    # Clientes
npm run test:products     # Produtos do ateliê
npm run test:quotes       # Orçamentos
npm run test:orders       # Pedidos
npm run test:navigation   # Navegação entre telas
npm run test:security     # Segurança, RBAC e regras de Firestore
npm run test:critical     # Fluxos críticos consolidados
```

### 🖥️ Modo Visual / Debug Interativo
```bash
# Interface gráfica interativa
npm run test:e2e:ui

# Modo Debug com pausas e inspecionador de DOM
npm run test:debug
```

### 📊 Relatório HTML
```bash
npm run test:report
```

---

## ⚙️ Configuração Inicial

1. Instale as dependências e os navegadores do Playwright:
   ```bash
   npm install
   npx playwright install
   ```

2. Configure as credenciais de teste:
   ```bash
   cp .env.test.example .env.test
   ```

3. Preencha `.env.test` com as credenciais do usuário de teste configurado no Firebase de desenvolvimento (`luisices-dev`).
