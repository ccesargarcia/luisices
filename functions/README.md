# Firebase Cloud Functions — Luisices

Funções serverless (Firebase Functions v2) para autenticação, convites, gestão segura de usuários, envio e recebimento de e-mails transacionais (Resend) e mensageria WhatsApp (Evolution API).

---

## 📦 Instalação

```bash
cd functions
npm install
```

---

## 🔧 Configuração de Segredos (Secrets)

As funções utilizam o sistema de parâmetros e segredos do Google Cloud Secret Manager integrado ao Firebase Functions v2:

```bash
# Chave da API do Resend para envio de e-mails
firebase functions:secrets:set RESEND_API_KEY

# Token do Webhook do Resend para validação de assinatura Svix
firebase functions:secrets:set RESEND_WEBHOOK_SECRET

# Chave da API Evolution para envio de mensagens WhatsApp (opcional)
firebase functions:secrets:set EVOLUTION_API_KEY
```

> **Nota:** A Evolution API utiliza a URL `https://wa.luisices.com.br` e a instância `homeassistant`.

---

## 🚀 Deploy

```bash
# Deploy de todas as functions
npm run deploy

# Ou via Firebase CLI
firebase deploy --only functions
```

---

## 🧪 Teste Local (Emuladores)

```bash
# Iniciar emuladores
firebase emulators:start --only functions

# Acessar UI do emulador
http://localhost:4000
```

---

## 📋 Catálogo Completo de Funções

### 👤 1. Gestão de Usuários & Autenticação

| Função | Tipo | Descrição | Permissão |
|---|---|---|---|
| `createUser` | Callable v2 | Cria usuário no Firebase Auth e inicializa perfil em `userProfiles/{uid}` com role e permissões | Apenas Admin |
| `deleteUser` | Callable v2 | Exclui usuário do Firebase Auth e perfil do Firestore (com bloqueio de auto-exclusão do admin) | Apenas Admin |
| `createUserInvitation` | Callable v2 | Gera convite com token criptográfico de uso único (SHA-256) válido por 48h, enviado por e-mail e WhatsApp | Apenas Admin |
| `validateUserInvitation` | Callable v2 | Valida token de convite e retorna e-mail associado se estiver pendente e no prazo | Público |
| `completeUserInvitation` | Callable v2 | Conclui cadastro convidado via transação atômica, ativando perfil `user` e marcando convite como `accepted` | Autenticado |
| `sendAdminPasswordReset` | Callable v2 | Gera link de redefinição de senha para outro usuário e envia por e-mail e WhatsApp | Apenas Admin |
| `sendPasswordResetEmail` | Callable v2 | Solicitação pública de recuperação de senha com rate limit (3 tentativas/hora por e-mail) | Público |

---

### 📧 2. Central de E-mails & Webhooks (Resend)

| Função | Tipo | Descrição | Permissão |
|---|---|---|---|
| `sendCustomEmail` | Callable v2 | Disparo de e-mails transacionais com validação estrita de destinatários, tamanho (<500KB) e registro em `sentEmails` | Apenas Admin (Rate limit: 50 envios/hora) |
| `getEmailUsage` | Callable v2 | Consulta cota diária (100/dia) e mensal (3.000/mês) via Resend Metrics API combinada com contagem do Firestore | Admin ou permissão `emails` |
| `resendReceivingWebhook` | HTTP onRequest | Endpoint para recebimento de e-mails (`email.received`) com validação de assinatura Svix e tolerância de 5 min contra replay attack | Público / Webhook Svix |

---

## 🔒 Regras de Segurança e Rate Limiting

1. **Rate Limiting em Memória**:
   - `sendPasswordResetEmail`: máximo de 3 tentativas por e-mail por hora.
   - `sendCustomEmail`: máximo de 50 disparos por hora por administrador autenticado.
2. **Proteção Anti-Replay Svix**:
   - O webhook `resendReceivingWebhook` valida os headers `svix-id`, `svix-timestamp` e `svix-signature` com tolerância máxima de 300 segundos (5 minutos).
3. **Senhas**:
   - A aplicação nunca recebe nem armazena senhas em texto puro; todo o gerenciamento de credenciais é delegado com exclusividade ao Firebase Authentication.
