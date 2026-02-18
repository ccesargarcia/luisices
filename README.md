
  # Personalized stationery dashboard

Sistema completo de gerenciamento de pedidos para papelaria personalizada, desenvolvido a partir do design Figma.

**Projeto original:** https://www.figma.com/design/Kah3BxYPwOpbgcb4eLZgJG/Personalized-stationery-dashboard

---

## 📋 Sobre o Projeto

Dashboard para controle de pedidos, clientes, finanças e planejamento semanal de uma empresa de papelaria personalizada.

### Features Principais
- ✅ Gerenciamento completo de pedidos
- ✅ Cadastro de clientes
- ✅ Controle financeiro (pagamentos, saldo)
- ✅ Planejamento semanal (segunda a sábado)
- ✅ Sistema de tags
- ✅ Dashboard com analytics
- ✅ Workflow de produção (7 etapas)

---

## � Backend - Firebase (IMPLEMENTADO!)

Backend completo usando Firebase (BaaS) - **ZERO DevOps necessário!**

### ✅ Já Implementado:
- 🔧 Configuração Firebase ([src/lib/firebase.ts](src/lib/firebase.ts))
- 📦 Service de Pedidos ([src/services/firebaseOrderService.ts](src/services/firebaseOrderService.ts))
- 📅 Service de Planejamento Semanal ([src/services/firebaseWeeklyService.ts](src/services/firebaseWeeklyService.ts))
- 🔐 Service de Autenticação ([src/services/firebaseAuthService.ts](src/services/firebaseAuthService.ts))
- ⚡ Hooks React ([src/hooks/useFirebaseOrders.ts](src/hooks/useFirebaseOrders.ts))
- 📝 Guia de Setup Completo ([FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md))

### 🚀 Próximos Passos (30 minutos):

**1. Configurar Firebase Console:**
```bash
# Leia o guia passo a passo
cat FIREBASE_SETUP_GUIDE.md
```
- Criar projeto em https://console.firebase.google.com
- Ativar Firestore, Authentication e Storage
- Copiar credenciais

**2. Configurar Variáveis de Ambiente:**
```bash
# Copiar template
cp .env.example .env.local

# Preencher com credenciais do Firebase Console
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_PROJECT_ID=...
```

**3. Testar Conexão:**
```bash
# Rodar o teste
npm run dev

# Acessar http://localhost:5173
# Verificar console para status da conexão
```

📚 **Documentação Completa:** [FIREBASE_BACKEND.md](FIREBASE_BACKEND.md)

---

## 🚀 Frontend - Running the code

```bash
# Instalar dependências (Firebase já incluído!)
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:5173

---

## 🔧 Backend - Duas Opções Disponíveis

### Opção 1: Firebase 🔥 (Recomendado para início rápido)

**Vantagens:**
- ⚡ Setup em minutos
- 🔄 Real-time updates automático
- 🔐 Autenticação pronta
- 📱 Mobile-ready
- 💰 Free tier generoso

**Documentação:** [FIREBASE_BACKEND.md](./FIREBASE_BACKEND.md)

```bash
# Instalar Firebase
npm install firebase

# Configurar conforme documentação
```

### Opção 2: PostgreSQL + NestJS (Recomendado para produção)

**Vantagens:**
- 🏢 Mais controle e flexibilidade
- 🔍 Queries SQL complexas
- 💪 Escalabilidade customizada
- 🔒 Sem vendor lock-in

**Documentação:** [BACKEND_INSIGHTS.md](./BACKEND_INSIGHTS.md)

---

## 📚 Documentação Completa

📖 **Comece aqui:** [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)

### Documentos Disponíveis:

1. **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Índice completo
2. **[BACKEND_INSIGHTS.md](./BACKEND_INSIGHTS.md)** - Backend PostgreSQL/NestJS
3. **[FIREBASE_BACKEND.md](./FIREBASE_BACKEND.md)** - Backend Firebase
4. **[ARCHITECTURE_FLOWS.md](./ARCHITECTURE_FLOWS.md)** - Diagramas e fluxos
5. **[FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)** - Integração Frontend-Backend
6. **[backend-example/](./backend-example/)** - Código de exemplo NestJS

---

## 🎯 Quick Start

### 1. Escolha sua stack

**Firebase (mais rápido):**
- Leia: [FIREBASE_BACKEND.md](./FIREBASE_BACKEND.md)
- Configure Firebase Console
- Use exemplos de código fornecidos

**PostgreSQL (mais controle):**
- Leia: [BACKEND_INSIGHTS.md](./BACKEND_INSIGHTS.md)
- Configure PostgreSQL
- Use `backend-example/` como base

### 2. Instale dependências do frontend

```bash
npm install
```

### 3. Configure variáveis de ambiente

```bash
# Para Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...

# Para backend tradicional
VITE_API_URL=http://localhost:3001/api
```

### 4. Inicie o desenvolvimento

```bash
npm run dev
```

---

## 🛠️ Tecnologias

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- React Router

### Backend (escolha uma)
- **Opção 1:** Firebase (Auth + Firestore + Functions)
- **Opção 2:** NestJS + Prisma + PostgreSQL

---

## 📊 Estrutura do Projeto

```
Personalized stationery dashboard/
├── src/                        # Frontend React
│   ├── app/
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas
│   │   ├── data/              # Mock data
│   │   └── types.ts           # TypeScript types
│   ├── styles/
│   └── main.tsx
├── backend-example/            # Exemplo NestJS (opcional)
├── FIREBASE_BACKEND.md        # Guia Firebase
├── BACKEND_INSIGHTS.md        # Guia PostgreSQL
└── DOCUMENTATION_INDEX.md     # Índice da documentação
```

---

## 💡 Comparação das Opções

| Feature | Firebase | PostgreSQL + NestJS |
|---------|----------|---------------------|
| Setup | ⚡ Minutos | ⏱️ Horas/Dias |
| Curva de aprendizado | 🟢 Fácil | 🟡 Média |
| Real-time | ✅ Nativo | ❌ Precisa implementar |
| Custos iniciais | 💚 Grátis | 💛 Servidor necessário |
| Escalabilidade | 🚀 Automática | 🔧 Manual |
| Controle | 🟡 Limitado | 🟢 Total |
| Mobile | ✅ SDK nativo | ⚠️ Precisa API |

**Recomendação para MVP:** Firebase
**Recomendação para produção:** PostgreSQL + NestJS

---

## � Deploy em Produção

### GitHub Pages (GRÁTIS!) - Recomendado

Hospede seu frontend no GitHub Pages **sem custos**!

**✅ Configurado e pronto para deploy:**
- GitHub Actions workflow (`.github/workflows/deploy.yml`)
- Vite configurado para GitHub Pages
- SPA routing otimizado

**📘 Guia completo:** [GITHUB_PAGES_DEPLOY.md](./GITHUB_PAGES_DEPLOY.md)

**Deploy em 3 passos:**

1. **Configure secrets do Firebase no GitHub:**
   - Vá em: Settings → Secrets → Actions
   - Adicione: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.

2. **Ative GitHub Pages:**
   - Settings → Pages
   - Source: **GitHub Actions**

3. **Push para deploy:**
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

**Pronto!** App estará em: `https://seu-usuario.github.io/luisices/`

**Custo:** 🟢 **$0/mês** (100% gratuito!)

### Alternativas de Deploy

- **Firebase Hosting:** $0/mês (10GB grátis) - [Ver guia](./FIREBASE_BACKEND.md)
- **Vercel:** $0/mês - Deploy automático do GitHub
- **Netlify:** $0/mês - CI/CD integrado
- **Railway:** $5/mês - Backend + Frontend juntos

---

## �📖 Próximos Passos

1. ✅ Leia [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
2. ✅ Escolha sua stack (Firebase ou PostgreSQL)
3. ✅ Configure o backend seguindo a documentação
4. ✅ Integre com o frontend
5. ✅ Customize conforme suas necessidades

---

## 🤝 Suporte

Toda documentação completa está disponível nos arquivos `.md` do projeto.

**Dúvidas?** Consulte:
- [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md) - Índice geral
- [FIREBASE_BACKEND.md](./FIREBASE_BACKEND.md) - Se usar Firebase
- [BACKEND_INSIGHTS.md](./BACKEND_INSIGHTS.md) - Se usar PostgreSQL

---

**Desenvolvido por:** Amanda Ramona (Design) + GitHub Copilot (Implementação)
**Data:** Fevereiro 2026
