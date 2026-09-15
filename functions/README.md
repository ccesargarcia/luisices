# Firebase Cloud Functions - Luisices

Funções serverless para autenticação, convites, gestão de usuários e envio de mensagens via Resend e Evolution API.

## 📦 Instalação

```bash
cd functions
npm install
```

## 🔧 Configuração

### 1. Configurar secrets

```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set EVOLUTION_API_KEY
```

`EVOLUTION_API_KEY` é opcional para usar somente e-mail. A API usa `https://wa.luisices.com.br` e a instância `homeassistant`.

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

### Gestão de usuários

- `sendAdminPasswordReset`: administrador envia reset para outro usuário.
- `createUserInvitation`: cria convite com token em hash e validade de 48 horas; aceita WhatsApp opcional.
- `validateUserInvitation`: valida o convite.
- `completeUserInvitation`: cria o perfil `user` e marca o convite como utilizado.
- `deleteUser`: remove a conta do Firebase Auth e o perfil do Firestore; não permite excluir o próprio administrador.

### `sendPasswordResetEmail`

**Trigger**: HTTPS Callable
**Descrição**: Envia e-mail via Resend e, quando há telefone no perfil, também via Evolution API.

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

## 📚 Observações

- O Firebase Auth não fornece histórico de senhas. A aplicação não armazena nem compara senhas anteriores.
- O deploy manual no GitHub Actions é recomendado quando o Firebase CLI local estiver bloqueado pela rede corporativa.
