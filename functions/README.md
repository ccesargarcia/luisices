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

# Chave da API Gemini (Google AI) para o Copiloto e Visão Computacional
firebase functions:secrets:set GEMINI_API_KEY
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

### 🤖 3. Inteligência Artificial (Google Gemini)

| Função | Tipo | Descrição | Permissão |
|---|---|---|---|
| `aiAgentChat` | Callable v2 | Copiloto conversacional multimodal com tool calling: extração de pedidos, cálculo de precificação, sugestão de WhatsApp e consultas com isolamento de dados | Autenticado com `aiCopilot` (Rate limit: 60 req/min) |
| `enrichGalleryItemWithAi` | Callable v2 | Visão computacional (Gemini Vision) para catalogar foto da galeria, extraindo descrição rica, tags e cores | Autenticado com `aiCopilot` e dono/admin da arte (Rate limit: 20 req/min) |
| `syncAllOrdersToAiView` | Callable v2 | *(Legada/No-op)* Mantida para compatibilidade retroativa; o Copiloto agora utiliza projeção em memória em tempo real direta de `orders` | Apenas Admin |
| `getAiUsage` | Callable v2 | Consulta consumo de cota e métricas de requisições do Gemini API | Apenas Admin |

---

### 💬 4. Central de Atendimento (Evolution API WhatsApp)

| Função | Tipo | Descrição | Permissão |
|---|---|---|---|
| `sendWhatsAppDirectMessage` | Callable v2 | Envio de mensagem direta via Evolution API com gravação em `whatsapp_messages` e atualização do chat | Autenticado com `whatsapp` |
| `deleteWhatsAppMessage` | Callable v2 | Exclusão de mensagem do chat no Firestore e revogação no WhatsApp via Evolution API | Autenticado com `whatsapp` |
| `syncWhatsAppMessages` | Callable v2 | Sincronização de mensagens recentes entre a instância WhatsApp e o Firestore | Autenticado com `whatsapp` |
| `whatsappEvolutionWebhook` | HTTP onRequest | Recebimento de webhooks de mensagens e status de conexão da Evolution API | Público / Webhook Evolution |

---

## 🔒 Regras de Segurança e Rate Limiting

1. **Rate Limiting em Memória**:
   - `sendPasswordResetEmail`: máximo de 3 tentativas por e-mail por hora.
   - `sendCustomEmail`: máximo de 50 disparos por hora por administrador autenticado.
   - `aiAgentChat`: máximo de 60 requisições por minuto por usuário autenticado.
   - `enrichGalleryItemWithAi`: máximo de 20 requisições por minuto por usuário autenticado.
2. **Proteção Anti-Replay Svix**:
   - O webhook `resendReceivingWebhook` valida os headers `svix-id`, `svix-timestamp` e `svix-signature` com tolerância máxima de 300 segundos (5 minutos).
3. **Isolamento Multiusuário e Projeção em Memória de IA**:
   - Chamadas de IA executam sob estrito isolamento por `callerUid` para usuários não-administradores com projeção de leitura em memória em tempo real. O Copiloto não possui poder de escrita direta em coleções operacionais.
4. **Senhas**:
   - A aplicação nunca recebe nem armazena senhas em texto puro; todo o gerenciamento de credenciais é delegado com exclusividade ao Firebase Authentication.
