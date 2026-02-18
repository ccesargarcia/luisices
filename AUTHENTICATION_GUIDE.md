# 🔐 Autenticação e Segurança - Firebase

## ✅ O que foi implementado

### 1. **Sistema de Autenticação Completo**

#### AuthContext (`src/contexts/AuthContext.tsx`)
- Context API para gerenciar estado de autenticação global
- Hooks: `useAuth()` para acessar usuário, login, register, logout
- Observador automático de mudanças de autenticação

#### Páginas de Autenticação
- **Login** (`src/app/pages/Login.tsx`) - Login com email/senha
- **Register** (`src/app/pages/Register.tsx`) - Cadastro de novos usuários
- **ResetPassword** (`src/app/pages/ResetPassword.tsx`) - Recuperação de senha por email

#### Proteção de Rotas
- **ProtectedRoute** (`src/app/components/ProtectedRoute.tsx`) - Componente que protege rotas privadas
- Rotas `/login`, `/registrar`, `/recuperar-senha` são públicas
- Rotas `/` e `/agenda` são protegidas (requerem autenticação)

---

### 2. **Segurança do Firebase**

#### Atualização do `firebaseOrderService.ts`
Todas as operações agora incluem **segurança por userId**:

```typescript
// ✅ ANTES: Qualquer um podia ver/editar qualquer pedido
await getOrders(); // Retornava TODOS os pedidos

// ✅ AGORA: Cada usuário só vê seus próprios pedidos
const userId = auth.currentUser.uid;
await getOrders(); // Retorna apenas pedidos do usuário autenticado
```

**Mudanças Específicas:**

1. **createOrder()** - Adiciona `userId` automaticamente
2. **getOrderById()** - Verifica se pedido pertence ao usuário
3. **getOrders()** - Filtra por `userId`
4. **updateOrderStatus()** - Verifica propriedade antes de atualizar
5. **deleteOrder()** - Verifica propriedade antes de deletar

#### Atualização do `useFirebaseOrders.ts`
```typescript
// Query com filtro automático por userId
query(
  collection(db, 'orders'),
  where('userId', '==', user.uid),  // 🔐 Filtro de segurança
  where('deletedAt', '==', null),
  orderBy('createdAt', 'desc')
);
```

---

### 3. **Regras de Segurança do Firestore**

Arquivo: **FIRESTORE_SECURITY_RULES.md**

#### Estrutura de Dados Segura

```javascript
// Coleção: orders
{
  userId: "abc123",           // 🔐 ID do usuário dono
  orderNumber: "PED-2026-001",
  customerName: "João Silva",
  // ... outros campos
}
```

#### Regras Aplicadas

```javascript
// ✅ Ler: Apenas próprio usuário
allow read: if resource.data.userId == request.auth.uid;

// ✅ Criar: Apenas com userId correto
allow create: if request.resource.data.userId == request.auth.uid;

// ✅ Atualizar: Apenas dono, sem mudar userId
allow update: if resource.data.userId == request.auth.uid 
              && request.resource.data.userId == resource.data.userId;

// ✅ Deletar: Apenas dono
allow delete: if resource.data.userId == request.auth.uid;
```

---

### 4. **Interface do Usuário**

#### Layout Atualizado
- Avatar do usuário no header (iniciais do nome)
- Dropdown menu com nome, email e botão "Sair"
- Logout redireciona para `/login`

#### Fluxo de Autenticação
```
Não autenticado → /login
     ↓
Login bem-sucedido → / (Dashboard)
     ↓
Usuário autenticado pode acessar tudo
     ↓
Logout → /login
```

---

## 🔧 Como Usar

### 1. **Habilitar Autenticação no Firebase Console**

```bash
1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em "Authentication" (Autenticação)
4. Clique em "Get Started" (Começar)
5. Ative "Email/Password" em "Sign-in method"
```

### 2. **Aplicar Regras de Segurança**

```bash
1. Vá em "Firestore Database" → "Rules" (Regras)
2. Copie o conteúdo de FIRESTORE_SECURITY_RULES.md
3. Cole e clique em "Publish" (Publicar)
```

### 3. **Criar Primeiro Usuário**

```bash
# Opção 1: Via interface
1. Acesse http://localhost:5175/registrar
2. Preencha: nome, email, senha
3. Clique em "Criar Conta"

# Opção 2: Via Firebase Console
1. Authentication → Users → Add user
2. Preencha email e senha
3. Usuário será criado
```

### 4. **Testar Segurança**

```bash
# Teste 1: Login
1. Faça login com um usuário
2. Crie alguns pedidos
3. Verifique que aparecem no dashboard

# Teste 2: Isolamento de Dados
1. Crie segundo usuário
2. Faça login com ele
3. Verifique que NÃO vê os pedidos do primeiro usuário

# Teste 3: Proteção de Rotas
1. Faça logout
2. Tente acessar http://localhost:5175/
3. Será redirecionado para /login automaticamente
```

---

## 📊 Estrutura de Dados

### Coleção: `orders`
```javascript
{
  userId: "uid123",              // 🔐 ID do usuário (obrigatório)
  orderNumber: "PED-2026-001",   // Gerado automaticamente
  customerName: "Maria Silva",
  customerPhone: "(11) 98765-4321",
  productName: "Convites Casamento",
  quantity: 100,
  price: 500.00,
  status: "pending",             // pending | in-progress | completed | cancelled
  deliveryDate: "2026-03-15",
  notes: "Cor: azul claro",
  tags: [
    { name: "Urgente", color: "#ff0000" },
    { name: "VIP", color: "#ffd700" }
  ],
  createdAt: Timestamp,
  deletedAt: null                // Soft delete
}
```

### Coleção: `users/{userId}/metadata/counters`
```javascript
{
  orderCounter: 42  // Contador de pedidos do usuário
}
```

---

## 🔒 Segurança Garantida

### ✅ Implementado

1. **Autenticação Obrigatória**
   - Sem login = sem acesso ao dashboard
   - ProtectedRoute bloqueia rotas privadas

2. **Isolamento de Dados**
   - Cada usuário só vê seus próprios pedidos
   - Queries filtra m automaticamente por `userId`
   - Firestore Rules bloqueiam acesso cruzado

3. **Validação de Propriedade**
   - Atualizar/Deletar verifica `userId` antes de executar
   - Impossível modificar pedidos de outros usuários

4. **Soft Delete Seguro**
   - `deletedAt` marca como deletado
   - Queries filtram pedidos deletados
   - Dados ficam no banco (auditoria)

5. **Counter por Usuário**
   - Cada usuário tem seu próprio contador
   - `PED-2026-001` reinicia para cada usuário
   - Armazenado em `users/{userId}/metadata/counters`

---

## 🚀 Próximos Passos (Opcional)

### Melhorias de Segurança

1. **Email Verification**
```typescript
// Enviar email de verificação após registro
await sendEmailVerification(user);
```

2. **Rate Limiting**
```javascript
// Firestore Rules - Limitar criação de pedidos
allow create: if request.time > resource.data.lastCreatedAt + duration.value(1, 's');
```

3. **Auditoria**
```typescript
// Criar log de ações
await addDoc(collection(db, 'audit_logs'), {
  userId: user.uid,
  action: 'delete_order',
  orderId: orderId,
  timestamp: Timestamp.now()
});
```

4. **2FA (Two-Factor Authentication)**
```typescript
import { multiFactor } from 'firebase/auth';
// Implementar autenticação de dois fatores
```

---

## 📝 Resumo de Arquivos Modificados

### Criados
- `src/contexts/AuthContext.tsx` - Context de autenticação
- `src/app/pages/Login.tsx` - Página de login
- `src/app/pages/Register.tsx` - Página de registro
- `src/app/pages/ResetPassword.tsx` - Recuperação de senha
- `src/app/components/ProtectedRoute.tsx` - Proteção de rotas
- `FIRESTORE_SECURITY_RULES.md` - Regras de segurança

### Modificados
- `src/app/App.tsx` - Adicionado AuthProvider
- `src/app/routes.tsx` - Rotas públicas + protegidas
- `src/app/pages/Layout.tsx` - Avatar + logout
- `src/services/firebaseOrderService.ts` - userId em todas operações
- `src/hooks/useFirebaseOrders.ts` - Filtro por userId

---

## ⚠️ Importante

### Migração de Dados Existentes

Se você já criou pedidos **antes** de implementar autenticação:

```javascript
// ⚠️ Pedidos sem userId ficarão inacessíveis!

// Solução: Adicionar userId manualmente no Firebase Console
// Ou usar script de migração:

const batch = writeBatch(db);
const ordersSnapshot = await getDocs(collection(db, 'orders'));

ordersSnapshot.forEach(doc => {
  batch.update(doc.ref, {
    userId: 'seu-user-id-aqui'  // Use o UID do Firebase Auth
  });
});

await batch.commit();
```

---

## 🎉 Pronto!

Sistema completamente seguro e profissional! Cada usuário tem:
- ✅ Login/Registro próprio
- ✅ Dados isolados e privados
- ✅ Pedidos numerados sequencialmente
- ✅ Proteção contra acesso não autorizado
- ✅ Interface com avatar e logout

Para testar, basta criar uma conta e começar a criar pedidos! 🚀
