# Checklist de Testes Manuais

Use este checklist antes de cada deploy para produção.

## 📋 Pré-Deploy Checklist

### ✅ Autenticação
- [ ] Login com credenciais válidas funciona
- [ ] Login com credenciais inválidas mostra erro
- [ ] Logout funciona corretamente
- [ ] Reset de senha envia email
- [ ] Link de reset de senha funciona

### ✅ Dashboard
- [ ] Cards de estatísticas carregam corretamente
  - [ ] Total de Pedidos
  - [ ] Pedidos Ativos
  - [ ] Faturamento Total
  - [ ] Outros cards configurados
- [ ] Lista de pedidos carrega (ou mostra mensagem de vazio)
- [ ] Busca por nome/telefone/produto funciona
- [ ] Filtro por tags funciona
- [ ] Filtro "Permuta/Parceria" funciona
- [ ] **Filtro "Compartilhados" funciona** 🆕
- [ ] Botão "Limpar filtros" funciona
- [ ] Modal "Novo Pedido" abre
- [ ] Tabs (Todos/Pendentes/Concluídos) funcionam

### ✅ Pedidos
- [ ] Criar novo pedido funciona
- [ ] Editar pedido existente funciona
- [ ] Atualizar status do pedido funciona
- [ ] Duplicar pedido funciona
- [ ] Adicionar anexos funciona
- [ ] Remover anexos funciona
- [ ] Workflow de produção funciona
- [ ] Badge de pedido compartilhado aparece 🆕
- [ ] Pedidos compartilhados são visíveis 🆕
- [ ] Pedidos de troca/permuta funcionam
- [ ] Valores monetários não ficam negativos

### ✅ Clientes
- [ ] Listar clientes funciona
- [ ] Criar novo cliente funciona
- [ ] Editar cliente funciona
- [ ] Deletar cliente funciona (se permitido)
- [ ] Busca de clientes funciona
- [ ] Estatísticas do cliente (totalSpent, totalOrders) corretas

### ✅ Produtos
- [ ] Listar produtos funciona
- [ ] Criar novo produto funciona
- [ ] Editar produto funciona
- [ ] Deletar produto funciona
- [ ] Upload de foto funciona

### ✅ Orçamentos
- [ ] Listar orçamentos funciona
- [ ] Criar novo orçamento funciona
- [ ] Editar orçamento funciona
- [ ] Converter orçamento em pedido funciona
- [ ] Exportar orçamento (PDF/Excel) funciona

### ✅ Galeria
- [ ] Upload de imagens funciona
- [ ] Visualizar imagens funciona
- [ ] Deletar imagens funciona
- [ ] Vincular imagem a pedido/cliente funciona

### ✅ Compartilhamento de Acesso 🆕
- [ ] Abrir seção de compartilhamento em Settings
- [ ] Modal "Compartilhar Acesso" abre
- [ ] Compartilhar com email válido funciona
- [ ] Compartilhar com email inválido mostra erro
- [ ] Não permite compartilhar consigo mesmo
- [ ] Selecionar recursos para compartilhar funciona
- [ ] Definir data de expiração funciona
- [ ] Lista "Acessos que Compartilhei" carrega
- [ ] Desativar compartilhamento funciona
- [ ] Reativar compartilhamento funciona
- [ ] Revogar compartilhamento funciona
- [ ] Lista "Compartilhados Comigo" carrega
- [ ] Pedidos compartilhados aparecem automaticamente
- [ ] Expiração automática funciona

### ✅ Configurações
- [ ] Upload de avatar funciona
- [ ] Upload de logo funciona
- [ ] Upload de banner funciona
- [ ] Alterar informações do negócio funciona
- [ ] Trocar tema (claro/escuro) funciona
- [ ] Trocar cor do tema funciona
- [ ] Alterar preferências de dashboard funciona
- [ ] Resetar configurações funciona

### ✅ Relatórios
- [ ] Relatórios carregam dados corretos
- [ ] Filtros de data funcionam
- [ ] Exportação funciona
- [ ] Gráficos renderizam corretamente

### ✅ Navegação
- [ ] Menu lateral funciona em todas as páginas
- [ ] Links de navegação funcionam
- [ ] Breadcrumbs funcionam (se existirem)
- [ ] Voltar/Avançar do navegador funciona

### ✅ Responsividade
- [ ] Layout funciona em desktop (1920x1080)
- [ ] Layout funciona em tablet (768x1024)
- [ ] Layout funciona em mobile (375x667)
- [ ] Menu hamburguer funciona em mobile

### ✅ Erros e Edge Cases
- [ ] Mensagens de erro são claras
- [ ] Toasts/notificações aparecem corretamente
- [ ] Loading states aparecem onde necessário
- [ ] Estados vazios mostram mensagens apropriadas
- [ ] Não há erros no console do navegador
- [ ] Não há warnings críticos no console

### ✅ Performance
- [ ] Páginas carregam em menos de 3 segundos
- [ ] Imagens carregam adequadamente
- [ ] Não há travamentos ao interagir
- [ ] Scroll é suave

---

## 🚨 Itens Críticos (BLOQUEIA DEPLOY)

Estes itens **DEVEM** funcionar antes de deploy:

1. ✅ Login/Logout
2. ✅ Criar novo pedido
3. ✅ Visualizar pedidos existentes
4. ✅ Dashboard carrega sem erros
5. ✅ Valores monetários não ficam negativos
6. ✅ Firestore rules permitem acesso correto

---

## 📝 Notas de Teste

**Data do Teste**: _____________
**Testado por**: _____________
**Ambiente**: [ ] Local [ ] DEV [ ] Produção
**Navegador**: _____________
**Versão**: _____________

**Problemas Encontrados**:
```
(Liste aqui qualquer problema encontrado durante os testes)
```

**Status Final**: [ ] ✅ Aprovado para Deploy [ ] ❌ Bloqueado
