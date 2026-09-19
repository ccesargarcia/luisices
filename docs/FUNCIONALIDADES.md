# Luisices
## Funcionalidades do produto

Este documento descreve o sistema Luisices pelo ponto de vista do negócio. O produto apoia a gestão diária de uma papelaria personalizada, desde o primeiro contato com o cliente até a produção, entrega, recebimento e relacionamento posterior.

## Regras de negócio

### Acesso e usuários

- O acesso exige autenticação por e-mail e senha.
- Perfis ficam em `userProfiles/{uid}` e possuem `role` (`admin`, `funcionario` ou `user`), `permissions` e `active`.
- Somente administradores ativos gerenciam usuários, convites, permissões, delegação de pedidos, resets e exclusões.
- Um administrador não pode excluir a própria conta.
- Usuários inativos não podem acessar o sistema.
- Usuários comuns e funcionários não podem alterar o próprio papel, permissões ou status.
- O perfil de um convite aceito recebe o papel `user` e as permissões padrão configuradas no sistema (podendo ser promovido a `funcionario` ou `admin` pelo administrador).

### Convites

- O convite é destinado a um único e-mail e expira em 48 horas.
- O token bruto aparece apenas no link enviado; o Firestore armazena somente seu hash.
- O e-mail informado no convite fica bloqueado no cadastro.
- O convite só pode ser concluído pelo mesmo endereço de e-mail convidado.
- Após o aceite, o convite muda de `pending` para `accepted` e não pode ser reutilizado.
- O convite pode ser enviado por Resend e, se um telefone for informado, também pela Evolution API.

### Senhas

- O reset gera um link de uso único com validade de uma hora.
- O link pode ser enviado por Resend e opcionalmente por WhatsApp.
- Senhas nunca são armazenadas pela aplicação.
- O Firebase Auth não disponibiliza histórico da senha anterior; portanto, a aplicação não consegue garantir a não reutilização sem um mecanismo adicional próprio.
- O reset público possui limite de três tentativas por e-mail a cada hora.

### Dados operacionais

- Pedidos, clientes, orçamentos, produtos e itens da galeria respeitam o `userId` conforme as regras do Firestore.
- Pedidos podem ser atribuídos por administradores a um colaborador (`funcionario`), concedendo permissão de visualização e atualização de workflow ao responsável delegado.
- Usuários comuns (`user`) gerenciam dados criados por eles mesmos, podendo excluir seus próprios pedidos e acessar seus relatórios financeiros individuais e permutas.
- Alterações de permissões e status têm efeito imediato em tempo real via listeners no perfil do usuário, sem necessidade de novo login.
- Orçamentos podem expirar conforme a data configurada e seu status atual.
- Pedidos de permuta podem representar troca/parceria sem cobrança monetária convencional.

## 1. Visão geral

O Luisices centraliza:

- Cadastro e relacionamento com clientes.
- Registro e acompanhamento de pedidos do ateliê.
- Controle das etapas do workflow de produção.
- Orçamentos e conversão em pedidos.
- Pagamentos e valores a receber.
- Agenda semanal de entregas.
- Galeria de artes e referências.
- Permutas e parcerias.
- Lojinha Online, vitrine pública e gestão de pedidos do catálogo.
- Indicadores e relatórios consolidados.
- Usuários, permissões granulares (RBAC) e configurações da operação.

Os dados são atualizados em tempo real e ficam isolados por usuário e papel conforme as regras de acesso do Firebase.

## 2. Acesso e autenticação

### Login
Permite acessar o sistema com e-mail e senha.

### Cadastro por Convite
Criação de conta vinculada a um convite emitido por um administrador.

### Recuperação de senha
Solicitação de link seguro de redefinição com expiração em 1 hora.

### Controle de acesso
Rotas protegidas exigem autenticação e permissão específica no perfil do usuário.

## 3. Dashboard

Ponto de acompanhamento diário da operação com KPIs em tempo real:

- Receita do mês atual.
- Total de pedidos ativos e em aberto.
- Pedidos em produção e aguardando início.
- Valores a receber e faturamento consolidado.
- Ticket médio descartando pedidos cancelados.
- Próximas entregas e alertas de pedidos em atraso.
- Produtos mais vendidos e distribuição por status.
- Filtro de equipe (`AdminTeamFilter`) para administradores.

## 4. Clientes

- CRUD completo com foto, contatos, data de aniversário e endereço.
- Classificação: Padrão, VIP, Recorrente, Inadimplente e Parceiro/Permuta.
- Preenchimento automático por CEP via ViaCEP com fallback para preenchimento manual internacional.
- Histórico de compras, total gasto e galeria de artes vinculada.

## 5. Pedidos do Ateliê

- Workflow de produção em 7 etapas: Design → Aprovação → Impressão → Corte → Montagem → Qualidade → Embalagem.
- Atribuição para equipe (`assignedTo`) com delegação individual e em lote (*bulk assign*).
- Controle financeiro: valor total, valor pago, saldo restante e método de pagamento.
- Anexos de fotos/PDFs, tags personalizáveis e observações.

## 6. Agenda Semanal

- Visualização cronológica das entregas dos próximos 7 dias.
- Resumo diário de entregas e alerta de prazos críticos.
- Navegação entre semanas e atalho para retorno à semana atual.

## 7. Orçamentos

- Criação com itens do catálogo interno ou livres.
- Aplicação de descontos em porcentagem ou valor fixo.
- Expiração automática conforme prazo de validade.
- Disparo de proposta comercial via WhatsApp com texto formatado.
- Conversão automática em pedido de produção ao aprovar.
- Exportação para PDF e planilha.

## 8. Produtos (Ateliê Interno)

Catálogo de insumos, peças e padrões de confecção interna (`products`) para suporte à elaboração rápida de orçamentos e pedidos.

---

## 9. Lojinha Online & Catálogo Público (`/catalogo`)

A Lojinha Online é a vitrine comercial digital voltada para o cliente final, permitindo divulgar produtos prontos para encomenda via redes sociais (Instagram, link na bio, WhatsApp) com fechamento direto de pedidos.

### 9.1. Separação de catálogos (`storeProducts` vs `products`)
- **Produtos Internos (`products`):** insumos e peças cadastrados para a rotina de produção interna do ateliê.
- **Produtos da Lojinha (`storeProducts`):** itens com fotos de vitrine, descrições comerciais encantadoras, categorias e preços de venda para o cliente final.

### 9.2. Operações em Massa no Catálogo (`/produtos-lojinha`)
- **Cadastro em Massa por Fotos:** upload simultâneo de múltiplos arquivos de imagem com inferência automática de título comercial a partir do nome do arquivo e replicação rápida de categoria, preço e prazo de confecção.
- **Exclusão em Massa:** seleção múltipla com barra de ações flutuante e diálogo de confirmação com pré-visualização das fotos e títulos antes da remoção definitiva.
- **Ativação e Pausa em Lote:** alternância rápida de visibilidade na vitrine para múltiplos produtos de uma só vez.
- **Toggle Geral da Loja:** alternador instantâneo na barra superior (Loja Online 🟢 / Loja Fora do Ar 🔴) com modo de manutenção automático para os clientes.

### 9.3. Gestão de Pedidos da Lojinha (`/pedidos-lojinha`)
- **Painel de Atendimento:** listagem em tempo real de pedidos submetidos pelos clientes na vitrine pública (`catalogOrders`).
- **Ciclo de Vida do Pedido:**
  - `received` (Recebido / Novo): aguardando primeiro contato.
  - `contacted` (Em Contato): atendimento iniciado no WhatsApp.
  - `converted` (Convertido): transformado em pedido oficial de produção.
  - `cancelled` (Cancelado): descartado.
- **Conversão Segura em Pedido de Produção (`convertToProductionOrder`):**
  - Transfere automaticamente itens, quantidades, personalizações de nomes/temas e prazos para a esteira oficial de pedidos (`/orders`).
  - **Lock Anti-duplicação:** bloqueio a nível de transação para impedir que o mesmo pedido seja convertido mais de uma vez.
- **Auditoria Anti-adulteração de Preços:**
  - O backend compara o subtotal submetido pelo cliente com os preços oficiais vigentes na coleção `storeProducts`.
  - Divergências superiores a R$ 0,05 ativam a flag `isPriceTampered = true` e exibem um alerta em destaque para a equipe.

### 9.4. Experiência do Cliente na Vitrine Pública (`/catalogo`)
- Acesso sem necessidade de login.
- Banners rotativos de destaque com carrossel automático.
- Sacola de encomendas interativa com campos de personalização (nome da criança, tema, observações).
- Checkout com direcionamento formatado para o WhatsApp de vendas dedicado.
- Isolamento total de tema: a vitrine pública inicia sempre em **tema claro (default)** e não afeta o tema do painel administrativo.

---

## 10. Galeria de Artes

Organização de fotos de trabalhos concluídos vinculados a clientes e pedidos para portfólio e consulta rápida.

## 11. Permutas e Parcerias

Acompanhamento de parcerias de divulgação sem cobrança monetária convencional, com registro de produtos fornecidos e benefícios/produtos recebidos em troca.

## 12. Relatórios & Inteligência Financeira

- Faturamento por período com comparação temporal automática.
- Ticket médio real com descarte estrito de pedidos cancelados.
- Preservação contábil (`salesLedger`) independente de exclusões operacionais de contatos.
- Exportação dinâmica sob demanda em Excel (`xlsx`) e PDF (`jspdf`).

## 13. Central de E-mails (`/emails`)

- Disparo de e-mails transacionais via Resend (exclusivo para administradores).
- Rate limit de segurança de 50 envios por hora por administrador.
- Controle visual de cota diária (100/dia) e mensal (3.000/mês).
- Recebimento de mensagens via Webhook com validação criptográfica Svix e proteção anti-replay.

## 14. Configurações

- **Informações do Negócio (Ateliê):** dados institucionais, endereço por CEP e WhatsApp oficial de orçamentos e documentos.
- **Personalização da Lojinha:** WhatsApp exclusivo de vendas para a vitrine pública (`catalogWhatsappPhone`), banners e comunicados.
- **Identidade Visual:** avatar, logotipo, banner, paletas de cores de destaque e modo claro/escuro.
- **Operação Padrão:** prazos padrão de confecção, método de pagamento pré-selecionado e antecedência de alertas.
- **Navegação:** reordenação dos módulos do menu lateral.

## 15. Usuários, Permissões e Equipe (RBAC)

- **Admin:** controle total da operação, equipe, relatórios consolidados, delegação de pedidos e auditoria geral.
- **Funcionário:** execução da produção, acompanhamento de pedidos atribuídos e atualização de etapas.
- **User:** gestão dos seus próprios pedidos, clientes, orçamentos e relatórios individuais.
- **Permissões Granulares:** controle individual por módulo (dashboard, pedidos, clientes, produtos, orçamentos, galeria, relatórios, permutas, precificação, lojinha, e-mails, whatsapp e copiloto de IA).
- **Revogação em Tempo Real:** alterações de permissões ou desativação de contas são refletidas imediatamente na sessão via listeners do Firestore, ocultando rotas, menus e botões no frontend e bloqueando o backend.

## 16. Central de Ajuda (`/ajuda`)

- Guia operacional interativo passo a passo.
- FAQ com soluções para dúvidas comuns.
- Catálogo de atalhos rápidos de teclado.
- Atalhos para suporte técnico.

## 17. Central de Atendimento WhatsApp (`/whatsapp`)

- **Chat Bidirecional em Tempo Real:** comunicação direta com o cliente via Evolution API sincronizada com o Firestore (`whatsapp_chats` e `whatsapp_messages`).
- **Modelos de Resposta Rápida (Quick Replies):** templates prontos para aviso de pedido pronto, entrada em produção, confirmação de orçamento e cobrança amigável.
- **Início de Conversa (Mobile-First):** suporte tanto para seleção rápida de clientes cadastrados quanto para digitação de número avulso com DDD (com botão flutuante FAB no mobile).
- **Gestão de Mensagens:** envio direto pelo sistema, link alternativo para abrir conversa no WhatsApp Web e exclusão de mensagens com opção de apagar para todos.
- **Controle de Acesso:** módulo com controle estrito de permissão (`whatsapp`), ocultando o menu de navegação e bloqueando a rota quando revogado.

## 18. Inteligência Artificial (Copiloto Interno & Visão Computacional)

- **Copiloto Interno Multimodal (`AiCopilotSheet`):** assistente inteligente operacional acessível no cabeçalho alimentado por modelos Gemini (Google AI).
- **Extração Inteligente de Pedidos:** interpretação de áudios/mensagens de clientes para preenchimento de novo pedido com 1 clique.
- **Precificação e Margem Protegida:** cálculo de custos, margens mínimas e sugestões de preços de venda.
- **Visão Computacional na Galeria (`enrichGalleryItemWithAi`):** análise automática de fotos de produtos para gerar descrições ricas, tags e identificação de técnicas de personalização.
- **Guardrails de Segurança:**
  - **Isolamento de Dados:** usuários não-admin consultam via IA exclusivamente seus próprios clientes, pedidos e artes; administradores possuem visão de auditoria global.
  - **Human-in-the-Loop:** a IA gera rascunhos para revisão e aprovação humana do operador.
  - **Rate Limiting:** limitadores de taxa dedicados (`aiAgentLimiter`: 60 req/min; `galleryAiLimiter`: 20 req/min).
  - **Sanitização de Saída:** remoção de pensamentos e raciocínios internos de modelos thinking em inglês (`cleanAiOutput`).
  - **Permissão `aiCopilot`:** revogação oculta o copiloto, desativa ferramentas de IA na galeria e barra execuções nas Cloud Functions.

