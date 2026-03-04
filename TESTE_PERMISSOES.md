# Guia de Teste - Permissões Granulares

## ⚠️ Importante

**Após alterar permissões de um usuário, o usuário PRECISA fazer logout e login novamente para que as mudanças tenham efeito.**

## Como Testar Corretamente

### 1. Preparação

1. Acesse o sistema com sua conta **ADMIN**
2. Vá em **Usuários** (menu lateral)
3. Crie um novo usuário de teste:
   - Email: `teste@exemplo.com`
   - Senha: `teste123`
   - Nome: `Usuário Teste`
   - Perfil: **Usuário** (não admin)

### 2. Configurar Permissões

1. Clique no ícone de edição (lápis) do usuário de teste
2. Na matriz de permissões, **desmarque** algumas permissões, por exemplo:
   - **Pedidos → Criar**: Desmarcado ❌
   - **Clientes → Editar**: Desmarcado ❌
   - **Produtos → Excluir**: Desmarcado ❌
3. Clique em **Salvar**
4. Você verá a mensagem: "Usuário atualizado. O usuário precisa fazer logout/login para aplicar as mudanças."

### 3. Fazer Logout da Conta Admin

1. Clique no seu nome/avatar no canto superior direito
2. Clique em **Sair**

### 4. Login com Usuário de Teste

1. Faça login com:
   - Email: `teste@exemplo.com`
   - Senha: `teste123`

### 5. Verificar Permissões

Agora verifique o comportamento:

#### ✅ O que DEVE acontecer:

- **Botão "Novo Pedido"**: NÃO deve aparecer (permissão `orders.create` removida)
- **Menu de navegação**: Só deve mostrar os módulos com permissão `view`
- **Tentar acessar rota direta** (ex: `/usuarios`): Deve redirecionar para `/`

#### ❌ O que NÃO deve acontecer:

- Ver botões de ações sem permissão
- Conseguir acessar páginas sem permissão `view`

### 6. Ver Suas Permissões

1. Vá em **⚙️ Configurações** (sempre visível)
2. Role até a seção **"Minhas Permissões"**
3. Você verá:
   - Seu perfil (Admin ou Usuário)
   - Status (Ativo/Inativo)
   - Lista de módulos com permissões concedidas

### 7. Testar Permissões Específicas

| Permissão Removida | Comportamento Esperado |
|---|---|
| `orders.create` | Botão "Novo Pedido" não aparece |
| `orders.edit` | Botão "Editar" não aparece nos cards de pedido |
| `orders.delete` | Botão "Excluir" não aparece nos detalhes do pedido |
| `customers.create` | Botão "Novo Cliente" não aparece |
| `products.create` | Botão "Novo Produto" não aparece |
| `quotes.create` | Botão "Novo Orçamento" não aparece |
| `gallery.create` | Botões "Nova Arte" e "Nova Pasta" não aparecem |

## 🔍 Debug - Verificar no Console

Abra o Console do Navegador (F12) e você verá logs como:

```
[hasPermission] Verificação: {
  role: "user",
  email: "teste@exemplo.com",
  permissions: { orders: { view: true, create: false, ... } },
  result: false
}
```

Isso ajuda a verificar se as permissões estão sendo carregadas corretamente.

## ⚠️ Problemas Comuns

### "Ainda vejo o botão mesmo sem permissão"

**Possíveis causas:**

1. **Você está logado como ADMIN**: Admins sempre têm todas as permissões
2. **Não fez logout/login**: Precisa sair e entrar novamente após alterar permissões
3. **Cache do navegador**: Limpe o cache (Ctrl+Shift+R ou Cmd+Shift+R)
4. **Perfil não atualizado no Firestore**: Verifique no console do Firebase se o documento foi salvo

### "Não consigo acessar nenhuma página"

Verifique se:
- O usuário está **Ativo** (toggle verde na lista de usuários)
- Pelo menos a permissão `view` está marcada nos módulos que precisa acessar

### "Recebi mensagem que minha conta foi desativada ao tentar fazer login"

Isso acontece quando um administrador desativou sua conta (toggle vermelho em Usuários). Entre em contato com o administrador do sistema para reativar seu acesso.

**Como o admin pode reativar:**
1. Fazer login com conta admin
2. Ir em **Usuários**
3. Encontrar o usuário inativo (toggle vermelho)
4. Clicar no toggle para ativar (ficará verde)
5. O usuário poderá fazer login normalmente

## 📊 Verificação no Firebase Console

1. Acesse: https://console.firebase.google.com
2. Selecione o projeto **luisices-dev**
3. Vá em **Firestore Database**
4. Abra a coleção `userProfiles`
5. Encontre o documento do usuário de teste (pelo email)
6. Verifique se o campo `permissions` reflete as mudanças feitas

## 🎯 Cenários de Teste Recomendados

### Cenário 1: Usuário Somente Visualização
- **Permissões**: Apenas `view` em todos os módulos
- **Resultado**: Vê todas as páginas mas nenhum botão de criar/editar/excluir

### Cenário 2: Usuário Operacional
- **Permissões**: `view` + `create` nos módulos principais
- **Resultado**: Pode criar mas não editar/excluir

### Cenário 3: Usuário Completo (exceto Admin)
- **Permissões**: Todas exceto `users`
- **Resultado**: Acesso total exceto gerenciamento de usuários

### Cenário 4: Usuário Inativo
- **Status**: Inativo (toggle vermelho)
- **Resultado**: Ao tentar fazer login, recebe mensagem "🚫 Sua conta foi desativada. Entre em contato com o administrador." e não consegue acessar o sistema

---

**Última atualização**: 2024
