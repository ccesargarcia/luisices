# Guia de Configuração SendGrid

Este guia detalha a configuração completa do SendGrid para envio profissional de emails de recuperação de senha.

## 📋 Índice

1. [Criar Conta SendGrid](#1-criar-conta-sendgrid)
2. [Obter API Key](#2-obter-api-key)
3. [Configurar Firebase Functions](#3-configurar-firebase-functions)
4. [Atualizar Frontend](#4-atualizar-frontend)
5. [Autenticação de Domínio](#5-autenticação-de-domínio-opcional)
6. [Deploy e Teste](#6-deploy-e-teste)

---

## 1. Criar Conta SendGrid

1. Acesse: https://sendgrid.com/
2. Clique em **"Start for Free"**
3. Preencha o formulário de registro
4. **Plano Free**: 100 emails/dia permanentemente

### Verificação de Conta

Após criar a conta, você precisará:
- ✅ Verificar email
- ✅ Configurar autenticação de dois fatores (2FA) - obrigatório
- ✅ Completar perfil (nome da empresa, endereço)

---

## 2. Obter API Key

### Passos:

1. Faça login no SendGrid
2. Vá para: **Settings** → **API Keys**
3. Clique em **"Create API Key"**
4. Configure:
   - **Nome**: `Luisices Firebase Functions`
   - **Permissões**: Selecione **"Restricted Access"**
     - ✅ **Mail Send**: Full Access
     - 🚫 Demais permissões: No Access
5. Clique em **"Create & View"**
6. **IMPORTANTE**: Copie a API Key agora (ela não será exibida novamente)

**Formato**: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 3. Configurar Firebase Functions

### 3.1. Instalar Firebase CLI (se ainda não tiver)

```bash
npm install -g firebase-tools
firebase login
```

### 3.2. Inicializar Functions (se ainda não tiver)

```bash
firebase init functions

# Selecione:
# - Use an existing project: papelaria-dashboard
# - Language: JavaScript
# - ESLint: No (opcional)
# - Install dependencies: Yes
```

### 3.3. Instalar Dependências

```bash
cd functions
npm install @sendgrid/mail firebase-admin firebase-functions
```

### 3.4. Configurar API Key no Firebase

**NUNCA** commite a API Key no código! Use Firebase Config:

```bash
# Configure a variável de ambiente
firebase functions:config:set sendgrid.key="SUA_API_KEY_AQUI"

# Verifique se foi configurado corretamente
firebase functions:config:get
```

**Resultado esperado**:
```json
{
  "sendgrid": {
    "key": "SG.xxx..."
  }
}
```

### 3.5. Para Desenvolvimento Local

Baixe as configurações para o emulador:

```bash
firebase functions:config:get > .runtimeconfig.json
```

**IMPORTANTE**: Adicione `.runtimeconfig.json` ao `.gitignore`!

```bash
echo ".runtimeconfig.json" >> .gitignore
```

---

## 4. Atualizar Frontend

### 4.1. Modificar `firebaseAuthService.ts`

Substitua o método `resetPassword`:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

// ... outros imports

export const resetPassword = async (email: string): Promise<void> => {
  try {
    const functions = getFunctions();
    const sendResetEmail = httpsCallable(functions, 'sendPasswordResetEmail');

    const result = await sendResetEmail({ email });

    console.log('Email enviado:', result.data);
  } catch (error) {
    console.error('Erro ao enviar email de recuperação:', error);
    throw error;
  }
};
```

### 4.2. Atualizar Imports do Firebase

Certifique-se de que `firebase.ts` exporta `functions`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions'; // ← Adicionar esta linha

// ... resto do código
```

---

## 5. Autenticação de Domínio (Opcional)

Para enviar emails de `noreply@luisices.com.br` ao invés de `@firebaseapp.com`:

### 5.1. No SendGrid Dashboard

1. Vá para: **Settings** → **Sender Authentication**
2. Clique em **"Authenticate Your Domain"**
3. Preencha:
   - **Domain**: `luisices.com.br`
   - **DNS Host**: Selecione seu provedor de DNS (GoDaddy, Cloudflare, etc.)
4. SendGrid fornecerá registros DNS para adicionar:

**Exemplo de registros**:
```
Tipo: CNAME
Host: em1234.luisices.com.br
Valor: u1234567.wl098.sendgrid.net

Tipo: CNAME
Host: s1._domainkey.luisices.com.br
Valor: s1.domainkey.u1234567.wl098.sendgrid.net

Tipo: CNAME
Host: s2._domainkey.luisices.com.br
Valor: s2.domainkey.u1234567.wl098.sendgrid.net
```

### 5.2. Adicionar Registros no Provedor DNS

1. Faça login no seu provedor de domínio (onde comprou luisices.com.br)
2. Acesse **Gerenciamento de DNS**
3. Adicione os 3 registros CNAME fornecidos pelo SendGrid
4. Aguarde propagação (pode levar até 48h, geralmente 1-2 horas)

### 5.3. Verificar no SendGrid

1. Volte ao SendGrid Dashboard
2. Clique em **"Verify"** na página de Domain Authentication
3. ✅ Status: **"Verified"** (se DNS estiver propagado)

### 5.4. Atualizar `functions/index.js`

Após domínio verificado, altere o `from`:

```javascript
from: {
  email: 'noreply@luisices.com.br', // ← Agora pode usar seu domínio!
  name: 'Luisices - Papelaria Personalizada'
},
```

---

## 6. Deploy e Teste

### 6.1. Testar Localmente (Opcional)

```bash
# Iniciar emuladores
firebase emulators:start --only functions

# Em outro terminal, teste a função:
firebase functions:shell

# No shell, execute:
# sendPasswordResetEmail({email: "seuemail@teste.com"})
```

### 6.2. Deploy para Produção

```bash
# Deploy apenas das functions
firebase deploy --only functions

# Ou deploy completo (functions + firestore rules + storage rules)
firebase deploy
```

**Saída esperada**:
```
✔ functions[sendPasswordResetEmail(us-central1)] Successful update operation.

Function URL (sendPasswordResetEmail):
https://us-central1-papelaria-dashboard.cloudfunctions.net/sendPasswordResetEmail
```

### 6.3. Testar Fluxo Completo

1. Acesse: https://luisices.com.br/recuperar-senha
2. Digite um email cadastrado
3. Clique em "Enviar Link de Recuperação"
4. Verifique:
   - ✅ Email chegou na caixa de entrada (não em spam)
   - ✅ Link redireciona para `luisices.com.br/action`
   - ✅ Formulário de nova senha funciona
   - ✅ Login com nova senha funciona

---

## 🔍 Troubleshooting

### Erro: "SendGrid não configurado"

**Causa**: API Key não foi configurada no Firebase Config

**Solução**:
```bash
firebase functions:config:get
# Se vazio:
firebase functions:config:set sendgrid.key="SUA_API_KEY"
firebase deploy --only functions
```

---

### Email não chega

**Verificações**:
1. Confira logs do Firebase Functions:
   ```bash
   firebase functions:log
   ```

2. Verifique SendGrid Activity:
   - Dashboard → **Activity Feed**
   - Status deve ser: **"Delivered"** ✅

3. Email em spam? Configure autenticação de domínio (Seção 5)

---

### Erro: "auth/user-not-found" visível no console

**Comportamento esperado**: A função retorna sucesso mesmo se usuário não existe (segurança)

**Verificação**:
```javascript
// Em index.js, confirme que há:
if (error.code === 'auth/user-not-found') {
  return { success: true, message: '...' };
}
```

---

### Custo além do Free Tier (100 emails/dia)

**Opções**:
1. **Twilio SendGrid Essentials**: $19.95/mês para 50.000 emails
2. **Mailgun**: $35/mês para 50.000 emails
3. **Amazon SES**: $0.10 por 1.000 emails (mais barato para alto volume)

Para 100 emails/dia = 3.000/mês → Free tier é suficiente!

---

## 📊 Monitoramento

### Ver estatísticas de emails:

1. SendGrid Dashboard → **Stats**
2. Métricas:
   - **Requests**: Quantos emails enviados
   - **Delivered**: Quantos chegaram ao destino
   - **Opens**: Taxa de abertura
   - **Clicks**: Cliques em links

---

## 🔐 Segurança

### Checklist:

- ✅ API Key com **Restricted Access** (apenas Mail Send)
- ✅ API Key armazenada em Firebase Config (não no código)
- ✅ `.runtimeconfig.json` no `.gitignore`
- ✅ Cloud Function retorna sucesso mesmo se usuário não existe
- ✅ CORS configurado (Cloud Functions lida automaticamente)
- ✅ Links expiram em 1 hora (padrão Firebase)

---

## ✅ Checklist de Implementação

- [ ] Conta SendGrid criada
- [ ] 2FA ativado no SendGrid
- [ ] API Key gerada e copiada
- [ ] Firebase Config definido (`sendgrid.key`)
- [ ] Dependências instaladas (`npm install`)
- [ ] `functions/index.js` criado
- [ ] `functions/package.json` configurado
- [ ] `firebaseAuthService.ts` atualizado
- [ ] `.runtimeconfig.json` adicionado ao `.gitignore`
- [ ] Functions deployadas (`firebase deploy --only functions`)
- [ ] Teste realizado (email enviado e recebido)
- [ ] (Opcional) Domínio autenticado no SendGrid
- [ ] (Opcional) Email `from` atualizado para `@luisices.com.br`

---

## 📚 Recursos

- [Documentação SendGrid](https://docs.sendgrid.com/)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [SendGrid Node.js Library](https://github.com/sendgrid/sendgrid-nodejs)
- [Autenticação de Domínio](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)

---

**Última atualização**: 2025-01-22
