# Sistema de Compartilhamento de Pedidos

## Implementação Concluída ✅

O sistema de compartilhamento de pedidos foi implementado no ambiente **DEV** e está pronto para testes.

## 🎯 Funcionalidades

### Para o Usuário que Compartilha (ex: Caio)
- **Compartilhar acesso** aos seus pedidos com outros usuários (ex: Amanda)
- **Controlar recursos**: Escolher quais dados compartilhar (Pedidos, Clientes, Orçamentos, Produtos, Galeria)
- **Definir expiração**: Opcional - Compartilhamento pode ter data de validade
- **Gerenciar permissões**: Ativar/desativar ou revogar acessos a qualquer momento
- **Visualizar compartilhamentos**: Ver quem tem acesso aos seus dados

### Para o Usuário que Recebe (ex: Amanda)
- **Visualizar pedidos compartilhados**: Pedidos de outros usuários aparecem automaticamente
- **Identificação visual**: Badge "Compartilhado" em todos os pedidos que não são dele
- **Acesso somente leitura**: Pode visualizar, mas não editar pedidos compartilhados
- **Ver quem compartilhou**: Lista de todos os acessos recebidos

## 📍 Como Acessar

1. Faça login no ambiente DEV: https://luisices-dev.web.app
2. Vá em **Configurações** (menu lateral)
3. Role até a seção **"Compartilhamento de Acesso"**

## 🧪 Como Testar

### Cenário 1: Compartilhar pedidos com outro usuário

1. **Usuário Caio** faz login
2. Vai em Configurações → Compartilhamento de Acesso
3. Clica em **"Compartilhar Acesso"**
4. Digite o email da **Amanda** (usuário que receberá o acesso)
5. Marque os recursos que deseja compartilhar (ex: ✅ Pedidos)
6. (Opcional) Defina uma data de expiração
7. Clique em **"Compartilhar"**

### Cenário 2: Visualizar pedidos compartilhados

1. **Usuária Amanda** faz login
2. Vai na página **Dashboard** ou **Pedidos**
3. Amanda vê:
   - ✅ Seus próprios pedidos (sem badge)
   - ✅ Pedidos do Caio com badge **"Compartilhado"** 🔵
4. **Filtrar apenas compartilhados**:
   - Clique no badge azul **"Compartilhados"** (👥)
   - Agora vê apenas os pedidos de outros usuários
   - Clique novamente ou em "Limpar filtros" para ver todos

### Cenário 3: Gerenciar compartilhamentos

**Caio pode:**
- ✅ **Desativar** temporariamente o acesso (sem deletar)
- ✅ **Reativar** acesso que foi desativado
- ✅ **Revogar** permanentemente (deletar o compartilhamento)
- ✅ Ver quando criou o compartilhamento
- ✅ Ver data de expiração (se definida)

**Amanda pode:**
- ✅ Ver lista de usuários que compartilharam dados com ela
- ✅ Ver quais recursos ela tem acesso
- ✅ Ver data de validade do compartilhamento

## 🔍 Validações Importantes

### ✅ O que deve funcionar:
- Compartilhar com email válido de usuário cadastrado
- Ver pedidos compartilhados no Dashboard/Pedidos
- Badge "Compartilhado" aparece corretamente
- Desativar/Ativar compartilhamento funciona
- Revogar acesso remove pedidos da visualização
- Expiração automática (pedidos somem após data de validade)

### ❌ O que NÃO deve funcionar (comportamento esperado):
- Compartilhar com email que não existe → Erro: "Usuário não encontrado"
- Compartilhar consigo mesmo → Erro: "Você não pode compartilhar acesso consigo mesmo"
- Editar pedido compartilhado → Deve ser somente leitura nos próximos updates

## 🎨 Indicadores Visuais

### Badge "Compartilhado" em Pedidos
- **Cor**: Azul claro (🔵)
- **Ícone**: Usuários (👥)
- **Localização**: Ao lado do status do pedido
- **Visível em**: Modo compacto e modo confortável

### Badge de Filtro "Compartilhados" 
- **Localização**: Dashboard, abaixo da barra de busca
- **Comportamento**: 
  - Clique para ativar/desativar
  - Quando ativo: fundo azul escuro com borda destacada
  - Quando inativo: fundo azul claro
  - Mostra apenas pedidos de outros usuários quando ativo
- **Combinável**: Pode ser usado junto com outros filtros (tags, busca, permutas)

### Badge "Compartilhado"
- **Cor**: Azul claro (🔵)
- **Ícone**: Usuários (👥)
- **Localização**: Ao lado do status do pedido
- **Visível em**: Modo compacto e modo confortável

### Seções em Settings
1. **"Acessos que Compartilhei"**: Lista de pessoas que têm acesso aos seus dados
2. **"Acessos Compartilhados Comigo"**: Lista de pessoas que compartilharam dados com você

## 🚀 Próximos Passos (se tudo funcionar)

1. ✅ Testar todos os cenários acima
2. ✅ Validar comportamento em diferentes telas (mobile/desktop)
3. ✅ Confirmar que queries estão otimizadas (sem lentidão)
4. 🔄 Merge para `main` e deploy em **PRODUÇÃO**

## 📊 Estrutura de Dados

### Coleção: `sharedAccess`
```typescript
{
  id: string,
  ownerId: string,        // UID de quem compartilhou
  ownerEmail: string,     // Email de quem compartilhou
  ownerName: string,      // Nome de quem compartilhou
  grantedToUserId: string, // UID de quem recebeu
  grantedToEmail: string, // Email de quem recebeu
  resources: ['orders', 'customers', ...], // Recursos compartilhados
  createdAt: string,      // Data de criação
  expiresAt?: string,     // Data de expiração (opcional)
  active: boolean,        // Se está ativo ou não
  userId: string          // Para regras Firestore
}
```

## 🔧 Arquivos Modificados

- ✅ `src/app/types.ts` - Novos tipos
- ✅ `src/services/firebaseSharedAccessService.ts` - Service criado
- ✅ `src/app/components/SharedAccessManager.tsx` - UI de gerenciamento
- ✅ `src/contexts/OrdersContext.tsx` - Query atualizada
- ✅ `src/app/components/OrderCard.tsx` - Indicador visual
- ✅ `src/app/pages/Settings.tsx` - Integração
- ✅ `firestore.rules` - Regras atualizadas

## 📝 Notas Técnicas

- **Performance**: Usa batching de queries (limite de 10 usuários por batch no Firestore)
- **Segurança**: Regras do Firestore validam permissões no backend
- **Real-time**: Usa `onSnapshot` para atualização em tempo real
- **UX**: Indicadores visuais claros para diferenciar pedidos próprios e compartilhados

---

**Status**: ✅ Pronto para testes em DEV
**Ambiente**: https://luisices-dev.web.app
**Deploy**: Regras Firestore atualizadas ✅
