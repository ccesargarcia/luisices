# Papelaria Personalizada — Sistema de Gestão

Sistema completo de gerenciamento para papelaria personalizada, com pedidos, orçamentos, clientes, catálogo de produtos, galeria de trabalhos e relatórios — tudo em tempo real via Firebase.

---

## Funcionalidades

### Pedidos
- Cadastro com cliente, produto, valor, data de entrega e status
- Workflow de produção em 7 etapas (Design → Aprovação → Impressão → Corte → Montagem → Qualidade → Embalagem)
- Controle de pagamento (pix, dinheiro, crédito, débito, transferência) com saldo em aberto
- Anexos (fotos e PDFs) com thumbnails automáticos via Firebase Storage
- Tags coloridas e cor de destaque por card
- Vinculação de pedido à Galeria
- Atualização em tempo real via `onSnapshot`

### Orçamentos
- Criação com itens do catálogo ou livres, desconto (% ou valor fixo), condição de pagamento e forma de entrega
- Envio via WhatsApp com mensagem personalizável
- Fluxo: Rascunho → Enviado → Aprovado (gera pedido automaticamente) / Rejeitado / Expirado
- Exportação para PDF, duplicar orçamento existente
- Tags, cor de destaque, filtros avançados e taxa de conversão

### Clientes
- CRUD completo com foto, telefone, e-mail, endereço e aniversário
- Status: Ativo, VIP, Recorrente, Inadimplente, Parceiro
- Histórico de pedidos e total gasto por cliente
- Alerta de inadimplência vinculado a orçamentos

### Catálogo de Produtos
- Gerenciamento de produtos com foto, preço, categoria e descrição
- Busca, filtro por categoria e alternância entre grade/lista
- Atualização em tempo real

### Galeria
- Pastas de trabalhos com foto de capa personalizável
- Upload de fotos por pasta
- Tags em pastas com filtro por tag

### Agenda Semanal
- Visualização das entregas nos 7 dias da semana (segunda a domingo)
- Filtro por status, resumo semanal com total e valor
- Destaque visual para o dia atual

### Dashboard
- KPIs em tempo real: receita, ticket médio, pedidos em aberto, novos clientes
- Alertas de entregas próximas e pedidos em atraso

### Relatórios
- KPIs de período, gráfico de faturamento, análise por status
- Top produtos e top clientes

### Configurações
- Logo, banner e avatar do negócio
- Tema claro/escuro e paleta de cores da interface
- Template de mensagem WhatsApp e configuração dos cards do Dashboard

### Autenticação
- Login, registro e recuperação de senha via Firebase Auth
- Dados isolados por usuário via regras Firestore/Storage

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

## Deploy (GitHub Pages)

1. Adicione os secrets do Firebase em **Settings → Secrets and variables → Actions** do repositório (mesmas variáveis do `.env.local`)
2. Vá em **Settings → Pages** e selecione **Source: GitHub Actions**
3. Faça push para `main` — o deploy é automático via GitHub Actions

URL: `https://<seu-usuario>.github.io/<nome-do-repo>/`

---

## Segurança

As credenciais do Firebase nunca são commitadas — ficam apenas no `.env.local` (ignorado pelo git) e nos Secrets do GitHub Actions.

As regras do Firestore e Storage garantem que cada usuário acessa somente os seus próprios dados. Veja [FIRESTORE_SECURITY_RULES.md](FIRESTORE_SECURITY_RULES.md) para detalhes.
