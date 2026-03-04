# 🚀 Guia de Deploy em Produção - Sistema de Permissões

## ⚠️ IMPORTANTE - Leia Antes de Fazer Deploy

Este deploy adiciona um **sistema completo de gerenciamento de usuários e permissões granulares**. É uma mudança significativa que afeta a autenticação e autorização.

---

## 📋 O Que Foi Alterado

### 1. **Nova Coleção no Firestore**
- `userProfiles` - armazena perfis de usuários com roles e permissões

### 2. **Firestore Rules Atualizadas**
- Adicionada regra para `userProfiles` permitindo read/write para usuários autenticados

### 3. **Sistema de Permissões**
- Controle granular de acesso por módulo (orders, customers, products, quotes, gallery, users)
- Cada módulo tem permissões: view, create, edit, delete
- Roles: `admin` (acesso total) e `user` (permissões customizáveis)

### 4. **Novas Funcionalidades**
- Página de gerenciamento de usuários (admin only)
- Controle de acesso por permissões em toda a aplicação
- Feedback de conta desativada no login
- Indicador de ambiente DEV

---

## ⚠️ RISCOS IDENTIFICADOS

### 🔴 RISCO ALTO
**Problema**: Usuários existentes em produção **não têm** documentos `userProfiles` ainda.

**Impacto**:
- No primeiro acesso após o deploy, cada usuário terá um perfil criado automaticamente como **ADMIN**
- Se múltiplos usuários acessarem simultaneamente, pode haver duplicação de perfis

**Mitigação**:
1. O código trata isso automaticamente em `firebaseUserService.getUserProfile()`
2. O primeiro usuário a fazer login vira admin automaticamente
3. Usar horário de baixo tráfego para o deploy

### 🟡 RISCO MÉDIO
**Problema**: Firestore Rules precisam ser deployadas **ANTES** do código do frontend.

**Impacto**:
- Se deployar o código antes das rules: usuários receberão erro 403 ao tentar acessar perfis

**Mitigação**:
- Seguir o plano de deploy passo a passo abaixo

### 🟢 RISCO BAIXO
**Problema**: Mudança na estrutura de autenticação (AuthContext carrega `userProfile` do Firestore).

**Impacto**:
- Logout/login pode ser mais lento em ~100-300ms (1 chamada extra ao Firestore)

---

## ✅ PLANO DE DEPLOY SEGURO

### **Passo 0: Backup** 🔒
```bash
# Exportar dados do Firestore (via Firebase Console)
# 1. Acesse: https://console.firebase.google.com
# 2. Selecione: papelaria-dashboard
# 3. Firestore Database > Import/Export
# 4. Escolha um bucket e exporte TUDO
```

### **Passo 1: Verificar Projeto Atual**
```bash
# Ver qual projeto está ativo
firebase use

# Deve mostrar: "Now using alias default (papelaria-dashboard)"
# Se não, executar:
firebase use default
```

### **Passo 2: Deploy das Firestore Rules PRIMEIRO** ⚠️
```bash
# Deployar SOMENTE as regras do Firestore
firebase deploy --only firestore:rules

# Aguardar confirmação:
# ✔  Deploy complete!
```

### **Passo 3: Testar Rules no Console**
1. Acesse: https://console.firebase.google.com
2. Projeto: `papelaria-dashboard`
3. Firestore Database > Regras
4. Verifique se aparece a regra para `userProfiles`

### **Passo 4: Build da Aplicação**
```bash
# Gerar build de produção
npm run build

# Verificar que não há erros
# ✓ built in Xs
```

### **Passo 5: Deploy do Hosting**
```bash
# Deploy do frontend para Firebase Hosting
firebase deploy --only hosting

# OU deploy completo (rules + hosting):
# firebase deploy
```

### **Passo 6: Primeiro Acesso (Você como Admin)**
1. Acesse a URL de produção
2. Faça **logout** se estiver logado
3. Faça **login** novamente com sua conta
4. Você será o primeiro → perfil criado como **ADMIN** automaticamente
5. Verifique: Menu "Usuários" deve aparecer

### **Passo 7: Gerenciar Outros Usuários**
1. Vá em **Usuários** (menu lateral)
2. Para cada usuário existente:
   - Eles farão login e terão perfis criados como ADMIN automaticamente
   - **IMPORTANTE**: Edite e altere o role deles de `admin` para `user` se necessário
   - Configure as permissões apropriadas

**OU** crie novos usuários pela interface:
1. Clique em "Novo Usuário"
2. Defina email, senha, nome, role e permissões
3. Usuário pode fazer login imediatamente

---

## 🧪 TESTES PÓS-DEPLOY

### Teste 1: Login de Usuário Existente
- [ ] Fazer login com conta existente → Deve funcionar
- [ ] Verificar que perfil foi criado no Firestore (`userProfiles/{uid}`)
- [ ] Perfil deve ter `role: "admin"` e todas as permissões

### Teste 2: Sistema de Permissões
- [ ] Menu lateral só mostra itens com permissão `view`
- [ ] Criar usuário de teste com permissões limitadas
- [ ] Fazer login → botões de ações devem respeitar permissões

### Teste 3: Gerenciamento de Usuários
- [ ] Página "Usuários" acessível só para admins
- [ ] Criar novo usuário funciona
- [ ] Editar permissões funciona
- [ ] Desativar usuário → ele não consegue fazer login

### Teste 4: Funcionalidades Existentes
- [ ] Criar pedidos, clientes, produtos, orçamentos → deve funcionar normalmente
- [ ] Galeria de artes → deve funcionar normalmente
- [ ] Relatórios → deve funcionar normalmente

---

## 🔄 ROLLBACK (Se algo der errado)

### Rollback do Hosting
```bash
# Listar deploys anteriores
firebase hosting:channel:list

# Fazer rollback para versão anterior
firebase hosting:rollback
```

### Rollback das Firestore Rules
1. Acesse: https://console.firebase.google.com
2. Firestore Database > Regras > Histórico de versões
3. Selecione a versão anterior e publique

### Restaurar Backup
Se necessário, restaure o backup do Firestore exportado no Passo 0.

---

## 📊 Monitoramento Pós-Deploy

### No Console do Firebase
1. **Analytics** - monitorar tráfego e erros
2. **Crashlytics** - verificar crashes (se configurado)
3. **Firestore** - observar número de leituras/gravações

### No Browser (Console do Desenvolvedor F12)
- Verificar logs: `[hasPermission] Verificação: ...`
- Procurar erros vermelhos

---

## ⏰ MELHOR HORÁRIO PARA DEPLOY

**Recomendado**: Deploy em horário de **baixo tráfego**
- Madrugada (2h-6h da manhã)
- Domingo de manhã
- Horário que você sabe que há menos usuários ativos

**Duração estimada do deploy**: 5-10 minutos
**Downtime**: ~0 segundos (Firebase Hosting faz deploy atômico)

---

## 📞 CHECKLIST PRÉ-DEPLOY

- [ ] Backup do Firestore realizado
- [ ] Build local funciona sem erros (`npm run build`)
- [ ] Testado em ambiente dev (`luisices-dev`)
- [ ] Lido este guia completamente
- [ ] Horário de deploy escolhido (baixo tráfego)
- [ ] Acesso ao Firebase Console disponível
- [ ] Credenciais de login da conta admin em mãos

---

## 🆘 SUPORTE

Se algo der errado:
1. **NÃO ENTRE EM PÂNICO** - o rollback é rápido
2. Verifique os logs no Console do Firebase
3. Verifique o Console do Browser (F12) para erros
4. Use o rollback se necessário

---

## ✅ CHECKLIST PÓS-DEPLOY

- [ ] Deploy de Firestore Rules concluído
- [ ] Deploy de Hosting concluído
- [ ] Primeiro login como admin bem-sucedido
- [ ] Perfil admin criado no Firestore
- [ ] Menu "Usuários" visível
- [ ] Testes básicos passando
- [ ] Sem erros no Console do Browser
- [ ] Usuários conseguem fazer login normalmente

---

**Última atualização**: 2024
**Versão**: Sistema de Permissões Granulares v1.0
