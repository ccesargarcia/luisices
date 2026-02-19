# Papelaria Personalizada — Dashboard de Gestão

Sistema completo de gerenciamento de pedidos para papelaria personalizada.

---

## Funcionalidades

- **Pedidos** — cadastro, edição, acompanhamento de status e exclusão
- **Clientes** — CRUD completo com telefone, endereço e histórico de pedidos
- **Financeiro** — controle de pagamentos (pix, dinheiro, crédito, débito, transferência), valor pago e saldo em aberto
- **Dashboard** — métricas em tempo real: receita, pedidos em atraso, próximas entregas, produtos mais vendidos
- **Calendário semanal** — visualização das entregas da semana
- **Relatórios** — análises de faturamento e desempenho
- **Tags** — categorização de pedidos com cores personalizadas
- **Autenticação** — login, registro e recuperação de senha via Firebase Auth
- **Tema claro/escuro**

---

## Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + Radix UI + Lucide React
- **Backend:** Firebase (Firestore + Auth + Storage)
- **Roteamento:** React Router v6

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

## Deploy (GitHub Pages)

1. Adicione os secrets do Firebase em **Settings → Secrets and variables → Actions** do repositório (mesmas variáveis do `.env.local`)
2. Vá em **Settings → Pages** e selecione **Source: GitHub Actions**
3. Faça push para `main` — o deploy é automático via GitHub Actions

URL: `https://<seu-usuario>.github.io/<nome-do-repo>/`

---

## Segurança

As credenciais do Firebase **nunca** são commitadas — ficam apenas no `.env.local` (ignorado pelo git) e nos Secrets do GitHub Actions.

As regras de segurança do Firestore/Storage garantem que cada usuário acessa apenas seus próprios dados.
