# 🚀 Guia de Implementação Firebase - Passo a Passo

## ✅ Arquivos Criados

Todos os arquivos necessários foram criados:

```
src/
├── lib/
│   └── firebase.ts                    ✅ Configuração do Firebase
├── services/
│   ├── firebaseOrderService.ts        ✅ CRUD de pedidos
│   ├── firebaseWeeklyService.ts       ✅ Planejamento semanal
│   └── firebaseAuthService.ts         ✅ Autenticação
└── hooks/
    ├── useFirebaseOrders.ts           ✅ Hook real-time de pedidos
    └── useFirebaseAuth.ts             ✅ Hook de autenticação

.env.example                           ✅ Template de variáveis
```

---

## 📋 Próximos Passos (30 minutos)

### Passo 1: Instalar Firebase SDK (2 minutos)

```bash
npm install firebase
```

### Passo 2: Criar Projeto no Firebase Console (5 minutos)

1. **Acesse:** https://console.firebase.google.com
2. **Clique:** "Add project" (Adicionar projeto)
3. **Nome do projeto:** `papelaria-dashboard` (ou seu nome preferido)
4. **Google Analytics:** Pode desabilitar (opcional)
5. **Clique:** "Create project"

### Passo 3: Adicionar App Web (3 minutos)

1. No dashboard do projeto, clique no ícone **Web** (`</>`)
2. **Nome do app:** `Papelaria Dashboard`
3. **NÃO** marque "Firebase Hosting" (faremos depois)
4. Clique "Register app"
5. **COPIE** o código do `firebaseConfig` que aparece

### Passo 4: Configurar Variáveis de Ambiente (2 minutos)

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env.local
```

2. Abra `.env.local` e cole suas credenciais:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=papelaria-dashboard.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=papelaria-dashboard
VITE_FIREBASE_STORAGE_BUCKET=papelaria-dashboard.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Passo 5: Ativar Serviços do Firebase (5 minutos)

#### 5.1 Ativar Firestore Database

1. No menu lateral, clique em **"Firestore Database"**
2. Clique "Create database"
3. **Modo:** Production mode
4. **Location:** `southamerica-east1` (São Paulo) ou `us-central1`
5. Clique "Enable"

#### 5.2 Ativar Authentication

1. No menu lateral, clique em **"Authentication"**
2. Clique "Get started"
3. Aba "Sign-in method"
4. Clique em **"Email/Password"**
5. **Ative** o toggle "Email/Password"
6. Clique "Save"

#### 5.3 Ativar Storage (Opcional - para uploads)

1. No menu lateral, clique em **"Storage"**
2. Clique "Get started"
3. **Modo:** Production mode
4. **Location:** Mesmo do Firestore
5. Clique "Done"

### Passo 6: Configurar Regras de Segurança Firestore (3 minutos)

1. Vá em **Firestore Database** > **Rules**
2. Cole estas regras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Função helper
    function isAuthenticated() {
      return request.auth != null;
    }

    // Customers
    match /customers/{customerId} {
      allow read, write: if isAuthenticated();
    }

    // Orders
    match /orders/{orderId} {
      allow read, create, update: if isAuthenticated();
      allow delete: if false; // Apenas soft delete

      // Payments subcollection
      match /payments/{paymentId} {
        allow read, write: if isAuthenticated();
      }
    }

    // Tags
    match /tags/{tagId} {
      allow read: if true; // Público
      allow write: if isAuthenticated();
    }

    // Weekly Goals
    match /weeklyGoals/{weekId} {
      allow read, write: if isAuthenticated();
    }

    // Weekly Expenses
    match /weeklyExpenses/{expenseId} {
      allow read, write: if isAuthenticated();
    }

    // Metadata (counters)
    match /metadata/counters {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

3. Clique **"Publish"**

### Passo 7: Testar Conexão (5 minutos)

1. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev
```

2. **Teste a conexão** editando `src/App.tsx`:

```typescript
import { useEffect } from 'react';
import { firebaseOrderService } from './services/firebaseOrderService';

function App() {
  useEffect(() => {
    // Testar conexão com Firebase
    firebaseOrderService.getOrders()
      .then(orders => {
        console.log('✅ Firebase conectado!');
        console.log('📦 Pedidos:', orders);
      })
      .catch(err => {
        console.error('❌ Erro Firebase:', err);
      });
  }, []);

  return (
    <div>
      <h1>Papelaria Dashboard</h1>
      <p>Verifique o console para status do Firebase</p>
    </div>
  );
}

export default App;
```

3. **Abra o navegador** em `http://localhost:5173`
4. **Abra o Console** (F12)
5. Você deve ver: `✅ Firebase conectado!`

### Passo 8: Criar Primeiro Usuário (3 minutos)

No console do navegador, execute:

```javascript
import { firebaseAuthService } from './services/firebaseAuthService';

// Criar usuário de teste
firebaseAuthService.register(
  'seu-email@example.com',
  'senha-segura-123',
  'Seu Nome'
).then(user => {
  console.log('✅ Usuário criado:', user.email);
}).catch(err => {
  console.error('❌ Erro:', err.message);
});
```

### Passo 9: Criar Primeiro Pedido de Teste (5 minutos)

```javascript
import { firebaseOrderService } from './services/firebaseOrderService';

// Criar pedido de teste
firebaseOrderService.createOrder({
  customerName: 'Maria Silva',
  customerPhone: '(11) 98765-4321',
  customerEmail: 'maria@example.com',
  productName: 'Convite de Casamento',
  quantity: 100,
  totalValue: 500,
  downPayment: 200,
  deliveryDate: '2026-03-15',
  tags: ['casamento', 'urgente'],
  paymentMethod: 'Pix',
}).then(order => {
  console.log('✅ Pedido criado:', order.orderNumber);
  console.log('📦 Dados:', order);
}).catch(err => {
  console.error('❌ Erro:', err.message);
});
```

---

## 🎉 Pronto! Firebase Configurado

Você agora tem:

- ✅ Firebase configurado e conectado
- ✅ Autenticação funcionando
- ✅ Firestore Database ativo
- ✅ Services prontos para usar
- ✅ Hooks React para componentes
- ✅ Primeiro pedido criado

---

## 🔧 Como Usar nos Componentes

### Exemplo: Dashboard com Pedidos em Tempo Real

```typescript
import { useFirebaseOrders } from '@/hooks/useFirebaseOrders';

function Dashboard() {
  const { orders, loading, error } = useFirebaseOrders();

  if (loading) return <div>Carregando pedidos...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h1>Pedidos ({orders.length})</h1>
      {orders.map(order => (
        <div key={order.id}>
          <h3>{order.orderNumber} - {order.customerName}</h3>
          <p>{order.productName} - R$ {order.totalValue}</p>
        </div>
      ))}
    </div>
  );
}
```

### Exemplo: Criar Novo Pedido

```typescript
import { firebaseOrderService } from '@/services/firebaseOrderService';

function NewOrderForm() {
  const handleSubmit = async (data) => {
    try {
      const order = await firebaseOrderService.createOrder({
        customerName: data.name,
        customerPhone: data.phone,
        productName: data.product,
        quantity: data.quantity,
        totalValue: data.total,
        downPayment: data.downPayment,
        deliveryDate: data.deliveryDate,
        tags: data.tags,
      });

      alert(`✅ Pedido ${order.orderNumber} criado!`);
    } catch (err) {
      alert(`❌ Erro: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Seus campos aqui */}
    </form>
  );
}
```

### Exemplo: Autenticação

```typescript
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

function LoginPage() {
  const { user, isAuthenticated, login, logout } = useFirebaseAuth();

  const handleLogin = async () => {
    try {
      await login('email@example.com', 'senha');
      alert('✅ Login realizado!');
    } catch (err) {
      alert(`❌ Erro: ${err.message}`);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Bem-vindo, {user?.email}!</p>
          <button onClick={logout}>Sair</button>
        </>
      ) : (
        <button onClick={handleLogin}>Entrar</button>
      )}
    </div>
  );
}
```

---

## 📊 Monitorar Firestore

1. Acesse: https://console.firebase.google.com
2. Vá em **Firestore Database**
3. Veja suas collections:
   - `customers` - Clientes
   - `orders` - Pedidos
   - `orders/{id}/payments` - Pagamentos (subcollection)
   - `weeklyGoals` - Metas semanais
   - `metadata/counters` - Contador de pedidos

---

## 🔥 Custos e Limites

### Spark Plan (Gratuito)
- ✅ **50.000 leituras/dia** (suficiente para ~1.600 pedidos/dia)
- ✅ **20.000 escritas/dia**
- ✅ **1 GB de armazenamento**
- ✅ **Autenticação ilimitada**

### Quando migrar para Blaze (Pago)?
- Se ultrapassar 50k leituras/dia
- Se precisar de Cloud Functions
- Custo estimado: **$5-15/mês** para 100-500 pedidos/mês

---

## 🐛 Troubleshooting

### Erro: "Firebase: Error (auth/configuration-not-found)"
**Solução:** Verifique se as variáveis no `.env.local` estão corretas e se você reiniciou o servidor (`npm run dev`)

### Erro: "Missing or insufficient permissions"
**Solução:** Configure as regras de segurança no Firestore (Passo 6)

### Erro: "Failed to get document because the client is offline"
**Solução:** Verifique sua conexão com internet e se o Firestore está ativado no console

### Pedidos não aparecem em tempo real
**Solução:** Use o hook `useFirebaseOrders()` ao invés de `getOrders()` direto

---

## 🚀 Próximas Etapas

1. **Integrar com componentes existentes** - Use os hooks nos componentes do Dashboard e Calendar
2. **Adicionar autenticação** - Implemente login/logout nos componentes
3. **Criar tela de cadastro de pedidos** - Use o NewOrderDialog existente
4. **Deploy** - Deploy no Firebase Hosting (grátis!)

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar hosting
firebase init hosting

# Build
npm run build

# Deploy
firebase deploy
```

---

**🎉 Parabéns! Seu backend Firebase está pronto!**

Dúvidas? Consulte:
- [FIREBASE_BACKEND.md](./FIREBASE_BACKEND.md) - Documentação completa
- [Firebase Docs](https://firebase.google.com/docs)
