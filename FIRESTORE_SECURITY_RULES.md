# Regras de Segurança do Firebase

## 📋 Firestore Security Rules

Copie e cole estas regras no **Firebase Console** → **Firestore Database** → **Regras**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    // Verificar se usuário está autenticado
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Verificar se o usuário é dono do recurso
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // ============================================
    // ORDERS - Pedidos
    // ============================================
    
    match /orders/{orderId} {
      // Permitir leitura apenas se for dono
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      
      // Permitir criação apenas se autenticado e userId corresponde
      allow create: if isSignedIn() 
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.keys().hasAll([
                      'userId', 
                      'customerName', 
                      'customerPhone',
                      'productName',
                      'quantity',
                      'price',
                      'status',
                      'createdAt'
                    ]);
      
      // Permitir atualização apenas se for dono e não mudar userId
      allow update: if isSignedIn() 
                    && resource.data.userId == request.auth.uid
                    && request.resource.data.userId == resource.data.userId;
      
      // Permitir deleção (soft delete) apenas se for dono
      allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
    
    // ============================================
    // USER METADATA - Contadores e configurações
    // ============================================
    
    match /users/{userId}/metadata/{document=**} {
      // Permitir leitura e escrita apenas para o próprio usuário
      allow read, write: if isOwner(userId);
    }
    
    // ============================================
    // USER SETTINGS - Personalização
    // ============================================
    
    match /users/{userId}/settings/{document=**} {
      // Permitir leitura e escrita apenas para o próprio usuário
      allow read, write: if isOwner(userId);
    }
    
    // ============================================
    // BLOQUEAR TUDO QUE NÃO ESTÁ EXPLICITAMENTE PERMITIDO
    // ============================================
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 🔒 Explicação das Regras

### **1. Orders (Pedidos)**
- ✅ **Read**: Apenas o dono pode ler seus próprios pedidos
- ✅ **Create**: Apenas autenticado, com userId correto e campos obrigatórios
- ✅ **Update**: Apenas o dono, sem alterar userId
- ✅ **Delete**: Apenas o dono (soft delete com `deletedAt`)

### **2. User Metadata**
- ✅ Contadores de pedidos (`orderCounter`)
- ✅ Apenas o próprio usuário pode acessar

### **3. Segurança**
- 🔐 Todos os pedidos têm `userId`
- 🔐 Usuários só veem seus próprios dados
- 🔐 Não é possível alterar `userId` de um pedido
- 🔐 Campos obrigatórios são validados

## 📝 Como Aplicar

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto
3. Vá em **Firestore Database** → **Regras**
4. Cole o código acima
5. Clique em **Publicar**

## ⚠️ Importante

- Estas regras **substituem** as regras de desenvolvimento (allow read, write: if true)
- Após aplicar, apenas dados com `userId` correto serão acessíveis
- Pedidos antigos sem `userId` ficarão inacessíveis (delete-os ou adicione userId)

## 🧪 Testar Regras

No Firebase Console, use o **simulador de regras**:

```javascript
// Teste 1: Ler próprio pedido (deve passar)
get /databases/(default)/documents/orders/pedido123
auth: uid=user123
// resource.data.userId = user123

// Teste 2: Ler pedido de outro usuário (deve falhar)
get /databases/(default)/documents/orders/pedido123
auth: uid=user456
// resource.data.userId = user123

// Teste 3: Criar pedido (deve passar)
create /databases/(default)/documents/orders/novo
auth: uid=user123
// request.resource.data = { userId: "user123", customerName: "João", ... }
```

## 🔑 Storage Rules (Obrigatório)

Configurar no **Firebase Console** → **Storage** → **Regras**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir apenas imagem
s até 5MB por usuário
    match /users/{userId}/{folder}/{fileName} {
      // Apenas o próprio usuário pode ler/escrever
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024  // 5MB
                   && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
