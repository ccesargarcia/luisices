# ✅ Checklist de Deploy em Produção

## PRÉ-DEPLOY

- [ ] Li completamente o [DEPLOY_PRODUCAO.md](DEPLOY_PRODUCAO.md)
- [ ] Testei todas as funcionalidades em ambiente DEV
- [ ] Fiz backup do Firestore (via Firebase Console)
- [ ] Horário de deploy: __________ (idealmente madrugada/domingo)
- [ ] Build local funciona: `npm run build` ✅
- [ ] Tenho acesso ao Firebase Console
- [ ] Tenho minhas credenciais de admin em mãos

---

## DURANTE O DEPLOY

### Método 1: Script Automatizado (Recomendado)
```bash
bash deploy-production.sh
```
- [ ] Script executado sem erros
- [ ] Firestore Rules deployadas ✅
- [ ] Build gerado ✅
- [ ] Hosting deployado ✅

### Método 2: Manual
```bash
# 1. Verificar projeto
firebase use default

# 2. Build
npm run build

# 3. Deploy rules PRIMEIRO
firebase deploy --only firestore:rules

# 4. Deploy hosting
firebase deploy --only hosting
```

---

## PÓS-DEPLOY IMEDIATO

- [ ] Acesso à URL de produção funciona
- [ ] Fiz LOGOUT (se estava logado)
- [ ] Fiz LOGIN com minha conta admin
- [ ] Perfil criado no Firestore (`userProfiles/{meu-uid}`)
- [ ] Menu "Usuários" aparece no sidebar
- [ ] Console do browser (F12) sem erros críticos

---

## TESTES FUNCIONAIS

### Autenticação
- [ ] Login funciona normalmente
- [ ] Logout funciona
- [ ] Recuperação de senha funciona

### Sistema de Permissões
- [ ] Página "Usuários" acessível (como admin)
- [ ] Criar novo usuário funciona
- [ ] Editar permissões funciona
- [ ] Desativar usuário funciona
- [ ] Login com usuário desativado → mostra mensagem de erro

### Funcionalidades Existentes (Regressão)
- [ ] Dashboard carrega
- [ ] Criar pedido funciona
- [ ] Editar pedido funciona
- [ ] Criar cliente funciona
- [ ] Criar produto funciona
- [ ] Criar orçamento funciona
- [ ] Galeria de artes funciona
- [ ] Relatórios funcionam

### Permissões Granulares (Teste com usuário não-admin)
- [ ] Criar usuário de teste (role: user)
- [ ] Remover algumas permissões (ex: orders.create)
- [ ] Fazer login com usuário teste
- [ ] Botões sem permissão NÃO aparecem
- [ ] Rotas sem permissão redirecionam para /

---

## GERENCIAMENTO DE USUÁRIOS EXISTENTES

Para cada usuário que já existia:

**Usuário: __________________**
- [ ] Fez primeiro login pós-deploy
- [ ] Perfil criado automaticamente como admin
- [ ] Se NÃO deve ser admin:
  - [ ] Editei no menu "Usuários"
  - [ ] Mudei role para "user"
  - [ ] Configurei permissões apropriadas
  - [ ] Usuário fez logout/login para aplicar mudanças

---

## MONITORAMENTO (Primeiras 24h)

- [ ] **1h após deploy**: Verificar erros no Console do Firebase
- [ ] **4h após deploy**: Verificar Analytics/tráfego normal
- [ ] **24h após deploy**: Confirmar estabilidade

### Métricas a Observar
- [ ] Número de leituras/gravações no Firestore (normal/esperado)
- [ ] Erros 403 (Forbidden) → se tiver muitos, problema nas rules
- [ ] Tempo de carregamento da aplicação (deve estar normal)
- [ ] Feedback de usuários (bugs reportados?)

---

## ROLLBACK (Se necessário)

Se algo der muito errado:

```bash
# Rollback do Hosting
firebase hosting:rollback

# Ou via Console do Firebase:
# 1. Hosting > Histórico de versões
# 2. Selecionar versão anterior
# 3. Clicar em "Fazer rollback"
```

- [ ] Rollback executado
- [ ] Versão anterior restaurada
- [ ] Aplicação funcionando novamente
- [ ] Investigar causa do problema antes de tentar novamente

---

## COMUNICAÇÃO COM USUÁRIOS

### Antes do Deploy
```
📢 Manutenção programada

Olá! Faremos uma atualização do sistema no dia __/__/__ às __:__.
Novidades:
- Sistema de gerenciamento de usuários
- Controle de acesso por permissões

Duração estimada: 10 minutos
Não haverá indisponibilidade.
```

### Após o Deploy
```
✅ Atualização concluída!

O sistema foi atualizado com sucesso.
Nova funcionalidade: Gerenciamento de usuários e permissões.

Se você é administrador, acesse o menu "Usuários" para gerenciar acessos.

Qualquer problema, entre em contato.
```

---

## NOTAS IMPORTANTES

⚠️ **TODOS os usuários existentes se tornarão ADMIN no primeiro login**
- Isso é intencional (seguranção)
- Você deve manualmente ajustar os roles depois
- Use a página "Usuários" para isso

⚠️ **Usuários precisam fazer LOGOUT/LOGIN após mudança de permissões**
- As permissões são carregadas no login
- Mudanças não aplicam em sessões ativas

✅ **As Firestore Rules já estão corretas no arquivo**
- Incluem `userProfiles` com permissões corretas
- Deploy das rules é seguro

---

## STATUS DO DEPLOY

**Data/Hora**: ____/____/________ às ____:____
**Executado por**: __________________
**Versão deployada**: Sistema de Permissões v1.0
**Status**: [ ] Sucesso  [ ] Falhou  [ ] Rollback necessário

**Observações**:
_____________________________________________________
_____________________________________________________
_____________________________________________________

---

**Próxima revisão**: 24h após o deploy
