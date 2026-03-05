# Firebase Cloud Functions - Luisices

Funções serverless para envio de emails via SendGrid.

## 📦 Instalação

```bash
cd functions
npm install
```

## 🔧 Configuração

### 1. Configurar SendGrid API Key

```bash
firebase functions:config:set sendgrid.key="SG.sua_api_key_aqui"
```

### 2. Para desenvolvimento local

```bash
firebase functions:config:get > .runtimeconfig.json
```

## 🚀 Deploy

```bash
# Deploy apenas das functions
npm run deploy

# Ou via Firebase CLI
firebase deploy --only functions
```

## 🧪 Teste Local

```bash
# Iniciar emuladores
firebase emulators:start --only functions

# Acessar UI do emulador
http://localhost:4000
```

## 📋 Funções Disponíveis

### `sendPasswordResetEmail`

**Trigger**: HTTPS Callable
**Descrição**: Envia email de recuperação de senha via SendGrid

**Parâmetros**:
```typescript
{
  email: string
}
```

**Resposta**:
```typescript
{
  success: boolean,
  message: string
}
```

**Exemplo de uso no frontend**:
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const sendResetEmail = httpsCallable(functions, 'sendPasswordResetEmail');

await sendResetEmail({ email: 'usuario@exemplo.com' });
```

## 📚 Documentação

- [SENDGRID_SETUP.md](../SENDGRID_SETUP.md) - Guia completo de configuração do SendGrid
