# 🎨 Papelaria Personalizada — Sistema de Gestão

Sistema completo de gerenciamento para papelaria personalizada com controle de pedidos, orçamentos, clientes, produtos, galeria de trabalhos, **permissões granulares** e relatórios — tudo em tempo real via Firebase.

---

## ✨ Funcionalidades

### 📦 Pedidos
- Cadastro completo com cliente, produto, valor, data de entrega e status
- **Workflow de produção** em 7 etapas (Design → Aprovação → Impressão → Corte → Montagem → Qualidade → Embalagem)
- Controle de pagamento com múltiplos métodos (PIX, dinheiro, cartão, transferência)
- **Trocas/Parcerias**: pedidos sem cobrança monetária com itens de permuta
- Anexos (fotos e PDFs) com thumbnails automáticos
- Vinculação com galeria de artes do cliente
- Tags coloridas e cor de destaque personalizável
- Atualização em tempo real

### 💰 Orçamentos
- Criação com itens do catálogo ou livres
- Desconto (porcentagem ou valor fixo)
- **Envio via WhatsApp** com mensagem personalizável
- Fluxo completo: Rascunho → Enviado → Aprovado/Rejeitado/Expirado
- **Conversão automática** em pedido ao aprovar
- Exportação para PDF e duplicação
- Taxa de conversão e filtros avançados

### 👥 Clientes
- CRUD completo com foto, contatos e endereço
- Status customizáveis: Ativo, VIP, Recorrente, Inadimplente, Parceiro
- **Galeria de artes** vinculada ao cliente
- Histórico de pedidos e total gasto
- Alertas de inadimplência

### 📊 Trocas/Parcerias
- Gestão de pedidos em permuta
- Controle de itens recebidos e valores estimados
- Relatórios específicos de trocas

### 🎨 Galeria de Artes
- Upload e organização de trabalhos realizados
- Vinculação com clientes e pedidos
- Tags e busca avançada
- Lightbox para visualização

### 📅 Agenda Semanal
- Visualização de entregas nos próximos 7 dias
- Filtros por status e resumo semanal
- Destaque do dia atual

### 📈 Dashboard & Relatórios
- **KPIs em tempo real**: receita, ticket médio, pedidos em aberto
- Alertas de entregas e pedidos em atraso
- Gráficos de faturamento e análises por período
- Top produtos e top clientes

### 👤 Sistema de Permissões
- **Roles**: Admin e User
- **Permissões granulares** por módulo (view, create, edit, delete)
- Gerenciamento de usuários (admin only)
- Controle de acesso em toda aplicação

### ⚙️ Configurações
- Personalização visual: logo, banner, avatar
- **12 temas de cores** + modo claro/escuro
- Templates de mensagem WhatsApp
- Configuração de cards do dashboard

### 🔐 Autenticação & Segurança
- Login, registro e recuperação de senha via Firebase Auth
- **Firestore Security Rules** com isolamento por usuário
- Proteção contra XSS com componentes sanitizados

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui (Radix UI) + Lucide React |
| Backend | Firebase (Firestore + Auth + Storage) |
| Roteamento | React Router v7 |
| PDF | jsPDF + jspdf-autotable |

---

## Como rodar

### 1. Pré-requisitos

- Node.js 18+
- Projeto criado no [Firebase Console](https://console.firebase.google.com) com Firestore, Authentication e Storage habilitados

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha o `.env.local` com as credenciais do seu projeto Firebase (disponíveis em Project Settings → General → Your apps):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:5173

---

## 🚀 Deploy (GitHub Pages)

O projeto está configurado para deploy automático via **GitHub Actions**.

### Configuração Inicial

**1. Configure os Secrets do Firebase**

Em **Settings → Secrets and variables → Actions**, adicione:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**2. Configure o GitHub Pages**

Em **Settings → Pages**:
- **Source**: Deploy from a branch
- **Branch**: `gh-pages` / `(root)`
- Clique em **Save**

**3. Deploy Automático**

Faça push na branch `main`:
```bash
git push origin main
```

O GitHub Actions irá:
1. Fazer build do projeto
2. Deploy automático para `gh-pages`
3. Site disponível em ~3-5 minutos

**URL de produção**: `https://<seu-usuario>.github.io/<repo>/` ou domínio customizado

### Firestore Rules (Importante!)

Antes do primeiro deploy, configure as regras do Firestore:

```bash
# Deploy apenas das regras
firebase deploy --only firestore:rules

# Ou deploy completo (rules + storage rules)
firebase deploy --only firestore:rules,storage
```

---

## 🔒 Segurança

### Firebase API Key Pública

A API key do Firebase **é pública por design** e pode aparecer no código compilado. A segurança vem de:

1. ✅ **Firestore Security Rules** — usuários só acessam seus próprios dados
2. ✅ **Firebase Authentication** — requer login
3. ⚠️ **Restrições de domínio na API Key** (configurar no Google Cloud Console)

### Configurar Restrições na API Key

Para evitar uso indevido da sua API key:

1. Acesse: [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Selecione sua API key
3. **Application restrictions**:
   - HTTP referrers (web sites)
   - Adicione:
     ```
     https://seu-dominio.com/*
     https://*.github.io/*
     http://localhost/*
     ```
4. **API restrictions**:
   - Restrict key
   - Selecione apenas:
     - Cloud Firestore API
     - Cloud Storage
     - Identity Toolkit API
     - Token Service API
5. Salve as alterações

### Firestore Security Rules

O projeto usa regras que garantem isolamento total de dados por usuário:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    match /orders/{orderId} {
      allow read, write: if isOwner(resource.data.userId);
    }
    // ... outras coleções seguem o mesmo padrão
  }
}
```

Veja o arquivo `firestore.rules` para detalhes completos.

---

## 🛠️ Desenvolvimento

### Scripts Disponíveis

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview

# Linting
npm run lint
```

### Estrutura do Projeto

```
src/
├── app/
│   ├── components/     # Componentes React
│   ├── pages/          # Páginas/rotas
│   ├── utils/          # Funções utilitárias
│   └── types.ts        # TypeScript types
├── contexts/           # Context API (Auth, Orders, Settings)
├── hooks/              # Custom hooks
├── services/           # Firebase services
├── lib/                # Config do Firebase
└── styles/             # CSS global
```

---

## 📄 Licença

Este projeto é privado e de uso exclusivo.

---

## 🙏 Créditos

Desenvolvido com React, TypeScript, Firebase e shadcn/ui.
