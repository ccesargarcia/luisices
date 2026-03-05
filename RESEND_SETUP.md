# Configuração do Resend para Emails

## ⚠️ IMPORTANTE - Sistema Atualizado (2026)

O Firebase descontinuou `functions.config()`. Agora usamos **Secrets Manager** (sistema mais seguro).

## 1. Obter API Key

1. Acesse: https://resend.com/api-keys
2. Faça login
3. Clique em **Create API Key**
4. Nome: `Firebase Functions - Luisices`
5. Copie a chave (começa com `re_`)

## 2. Configurar Secret no Firebase

```bash
# Configurar a API key como secret (novo método)
firebase functions:secrets:set RESEND_API_KEY

# Cole sua chave quando solicitado: re_xxxxxxxxxxxxxxxxxxxxxxxx
# Pressione Enter
```

**Verificar configuração:**
```bash
firebase functions:secrets:access RESEND_API_KEY
```

## 3. Verificar domínio no Resend (IMPORTANTE)

Para evitar SPF/DKIM failures e garantir deliverability:

### Opção A: Usar domínio personalizado (RECOMENDADO)

1. No Resend Dashboard, vá em **Domains** → **Add Domain**
2. Adicione `luisices.com.br`
3. Configure os registros DNS fornecidos:
   - **TXT** para SPF
   - **DKIM** (3 registros CNAME)
   - **MX** (opcional, para receber emails)

4. Aguarde verificação (pode levar até 48h)

### Opção B: Usar domínio compartilhado (TEMPORÁRIO)

Para testes iniciais, use: `onboarding@resend.dev`

⚠️ **Importante**: Emails de domínios compartilhados têm limite de 1 email/minuto e podem ir para spam.

## 4. Deploy das Functions

```bash
# Fazer deploy
firebase deploy --only functions

# Verificar se a configuração foi salva
firebase functions:config:get
```

## 5. Testar Email

### Via Console (teste direto)

```bash
# Abrir o Firebase Console
firebase functions:shell

# Chamar a função
sendPasswordResetEmail({email: 'seu-email@example.com'})
```

### Via Frontend (teste real)

1. Vá para `/recuperar-senha`
2. Digite um email cadastrado
3. Clique em "Enviar"
4. Verifique a caixa de entrada (não spam!)

## 6. Monitorar Envios

- Dashboard Resend: https://resend.com/emails
- Logs Firebase: `firebase functions:log`

## 7. Limites do Plano Gratuito

- ✅ **100 emails/dia** (suficiente para reset de senhas)
- ✅ **Domínio personalizado** (verificado)
- ✅ **Analytics completo**
- ❌ Apenas 1 domínio verificado no free tier

## Troubleshooting

### Erro: "Resend não configurado"
```bash
firebase functions:config:set resend.key="sua_chave_aqui"
firebase deploy --only functions
```

### Erro: "Invalid 'from' address"
- Certifique-se que o domínio está verificado no Resend
- Ou use `onboarding@resend.dev` temporariamente

### Email não chegou
1. Verifique logs: `firebase functions:log`
2. Dashboard Resend: veja o status do email
3. SPF/DKIM: confirme que domínio está verificado

### Email foi para spam
- Verifique SPF/DKIM configurados corretamente
- Evite usar domínio compartilhado em produção
- Aguarde reputação do domínio melhorar (primeiros emails podem ir para spam)
