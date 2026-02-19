# Guia Rápido: Configurar Firebase Storage

## ⚠️ ERRO ATUAL: Missing or insufficient permissions

Isso significa que o **Firebase Storage não tem regras de segurança** ou está bloqueado.

---

## 🔥 Passo a Passo (5 minutos):

### **1. Ative o Firebase Storage**

1. Acesse: https://console.firebase.google.com/project/papelaria-dashboard/storage
2. Se aparecer **"Get Started"**, clique nele
3. Escolha **"Start in production mode"** (depois vamos mudar as regras)
4. Selecione localização: **`southamerica-east1`** (São Paulo) ou **`us-central1`**
5. Clique em **"Done"**

---

### **2. Configure as Regras de Segurança**

1. No Firebase Console, vá em **Storage** → **Rules** (aba superior)
2. **DELETE TUDO** que estiver lá
3. **Cole o código abaixo:**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir imagens até 5MB para usuários autenticados
    match /users/{userId}/{folder}/{fileName} {
      // Usuário logado pode ler seus próprios arquivos
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Usuário logado pode fazer upload (apenas imagens, max 5MB)
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024  // 5MB
                   && request.resource.contentType.matches('image/.*');
      
      // Usuário logado pode deletar seus próprios arquivos
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Clique em **"Publish"** (Publicar)

---

### **3. Configure as Regras do Firestore (se ainda não fez)**

1. Vá em **Firestore Database** → **Rules**
2. Certifique-se que tem a regra para **settings**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // ORDERS
    match /orders/{orderId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow delete: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
    
    // USER METADATA
    match /users/{userId}/metadata/{document=**} {
      allow read, write: if isOwner(userId);
    }
    
    // USER SETTINGS (IMPORTANTE!)
    match /users/{userId}/settings/{document=**} {
      allow read, write: if isOwner(userId);
    }
    
    // Bloquear todo o resto
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Clique em **"Publish"**

---

## ✅ Testar se Funcionou:

1. **Recarregue** a página: `https://luisices.com.br/configuracoes`
2. **Faça upload** de uma imagem de avatar
3. **Deve funcionar!** 🎉

---

## 🆘 Se Ainda Não Funcionar:

Verifique no **Firebase Console → Storage → Rules** se o código está exatamente igual ao de cima.

**Regra errada que bloqueia tudo:**
```javascript
allow read, write: if false;  // ❌ ISSO BLOQUEIA TUDO
```

**Regra correta:**
```javascript
allow read: if request.auth != null && request.auth.uid == userId;  // ✅
allow write: if request.auth != null && request.auth.uid == userId  // ✅
             && request.resource.size < 5 * 1024 * 1024
             && request.resource.contentType.matches('image/.*');
```

---

## 📸 Links Diretos:

- **Storage Rules:** https://console.firebase.google.com/project/papelaria-dashboard/storage/rules
- **Firestore Rules:** https://console.firebase.google.com/project/papelaria-dashboard/firestore/rules
- **Storage Files:** https://console.firebase.google.com/project/papelaria-dashboard/storage/files

---

## 🔍 Como Saber se está Configurado:

Vá em **Storage → Files** e veja se tem a pasta `users/` com seus uploads.

Se aparecer erro de permissão ao tentar listar → **regras estão erradas**.
