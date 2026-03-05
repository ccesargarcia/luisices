# 🔧 Troubleshooting - Recuperação de Senha

## ✅ **ATUALIZADO: Domínio Personalizado Configurado!**

O sistema agora usa seu domínio personalizado (`luisices.com.br`) nos links de recuperação de senha.

**Como funciona:**
1. Usuário solicita recuperação em `/recuperar-senha`
2. Email enviado com link: `https://luisices.com.br/action?mode=resetPassword&oobCode=...`
3. Página `/action` processa o link e permite redefinir a senha
4. Após sucesso, redireciona para `/login`

---

## 🔒 **Configuração no Firebase Console**

### **1. Adicionar Domínio Autorizado**

**No Firebase Console:**
1. Acesse: https://console.firebase.google.com/project/papelaria-dashboard/authentication/users
2. Busque pelo email que você tentou recuperar
3. ✅ Se aparecer → Email está cadastrado
4. ❌ Se NÃO aparecer → Email não existe no sistema

**Importante:** O Firebase **SEMPRE** mostra mensagem de sucesso, mesmo que o email não exista (por segurança). Se o email não estiver cadastrado, nenhum email será enviado.

---

### 2️⃣ **Verificar Spam/Lixo Eletrônico**

O email pode cair na pasta de spam. Procure por:
- Remetente: `noreply@<seu-projeto>.firebaseapp.com`
- Assunto: Padrão do Firebase ou personalizado

---

### 3️⃣ **Testar com Console do Navegador**

Abra o console (F12) e veja os logs:

```
[ResetPassword] Enviando email para: usuario@email.com
[ResetPassword] Email enviado com sucesso (ou email não existe)
```

Se houver erro, você verá:
```
[ResetPassword] Erro ao enviar email: [detalhes]
[ResetPassword] Código do erro: auth/invalid-email
```

**Códigos comuns:**
- `auth/invalid-email` → Email mal formatado
- `auth/user-not-found` → Email não cadastrado (raro, Firebase esconde isso)
- `auth/too-many-requests` → Muitas tentativas

---

### 4️⃣ **Configurar Template de Email (Recomendado)**

O Firebase pode estar configurado para não enviar emails ou o template pode estar desabilitado.

**Passos:**
1. Acesse: https://console.firebase.google.com/project/papelaria-dashboard/authentication/emails
2. Clique em **"Redefinição de senha"** (Password reset)
3. Verifique se está **ATIVADO**
4. Personalize o template:

```
Assunto: Recuperação de Senha - Papelaria Personalizada

Olá,

Recebemos uma solicitação para redefinir a senha da sua conta.

Clique no botão abaixo para criar uma nova senha:
%LINK%

Se você não solicitou esta alteração, ignore este e-mail.

Este link expira em 1 hora.

Atenciosamente,
Equipe Papelaria Personalizada
```

5. Clique em **"Salvar"**

---

### 5️⃣ **Verificar Configuração de Domínio Autorizado**

No Firebase Console:
1. Vá em **Authentication → Settings → Authorized domains**
2. Certifique-se de que está incluído:
   - `localhost`
   - `luisices.com.br`
   - `ccesargarcia.github.io` (ou seu domínio GitHub Pages)

---

### 6️⃣ **Configurar SMTP Customizado (Avançado)**

Por padrão, o Firebase usa um servidor de email gratuito que pode ter limitações. Para produção, considere:

**Gmail/Google Workspace:**
1. Firebase Console → Authentication → Templates
2. Configure SMTP customizado com suas credenciais

**SendGrid/Mailgun:**
Melhores para produção (mais confiável)

---

### 7️⃣ **Verificar Quota de Emails**

Firebase tem limites no plano gratuito:
- Spark (gratuito): ~100 emails/dia
- Blaze (pago): ilimitado

Verifique em: https://console.firebase.google.com/project/papelaria-dashboard/usage

---

### 8️⃣ **Testar Manualmente**

Teste direto no console do navegador (F12):

```javascript
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

const auth = getAuth();
sendPasswordResetEmail(auth, 'seu-email@exemplo.com')
  .then(() => {
    console.log('✅ Email enviado!');
  })
  .catch((error) => {
    console.error('❌ Erro:', error.code, error.message);
  });
```

---

## ✅ **Solução Rápida**

**Se o email não chega MESMO com email cadastrado:**

1. **Verifique o spam** (99% dos casos!)
2. **Aguarde 5-10 minutos** (pode demorar)
3. **Tente outro email** (Gmail, Outlook)
4. **Configure template no Firebase** (passo 4️⃣)
5. **Verifique logs do console** (passo 3️⃣)

---

## 📧 **Email de Teste Recomendado**

Para testar, use Gmail ou Outlook (mais confiáveis):
- ✅ Gmail: meuemail@gmail.com
- ✅ Outlook: meuemail@outlook.com
- ⚠️ Provedores pequenos podem bloquear

---

## 🆘 **Ainda Não Funciona?**

1. Verifique se o **Authentication** está habilitado:
   - https://console.firebase.google.com/project/papelaria-dashboard/authentication/providers
   - **Email/Password** deve estar **ENABLED**

2. Recrie o usuário:
   ```bash
   # Delete e recrie na interface ou console
   ```

3. Teste com email diferente
4. Verifique logs do Firebase Console → Functions (se tiver)

---

**Data:** Março 2026
**Status:** Em troubleshooting
