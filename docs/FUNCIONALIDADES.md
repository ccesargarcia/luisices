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
- Registro e acompanhamento de pedidos.
- Controle das etapas de produção.
- Orçamentos e conversão em pedidos.
- Pagamentos e valores a receber.
- Agenda de entregas.
- Galeria de artes e referências.
- Permutas e parcerias.
- Indicadores e relatórios.
- Usuários, permissões e configurações da operação.

Os dados são atualizados em tempo real e ficam isolados por usuário conforme as regras de acesso do Firebase.

## 2. Acesso e autenticação

### Login

Permite acessar o sistema com e-mail e senha.

### Cadastro

Cria uma nova conta de acesso ao sistema.

### Recuperação de senha

Permite solicitar um link de recuperação e definir uma nova senha.

### Controle de acesso

Rotas protegidas exigem autenticação. Usuários sem permissão não devem visualizar ou executar operações de módulos restritos.

## 3. Dashboard

O Dashboard é o ponto de acompanhamento diário da operação.

### Indicadores

Apresenta indicadores operacionais e do período corrente configuráveis, como:

- Receita do mês atual (baseada nas vendas concluídas no mês vigente).
- Total de pedidos no quadro operacional.
- Total em aberto (valor de pedidos a produzir e entregar).
- Pedidos em produção e aguardando início.
- Valores a receber (pagamentos pendentes exclusivamente de pedidos ativos).
- Recebido no mês atual (pagamentos computados no mês vigente).
- Ticket médio do mês atual (descartando pedidos cancelados).

### Acompanhamento operacional

- Próximas entregas.
- Pedidos atrasados.
- Pedidos recentes.
- Produtos mais vendidos.
- Distribuição dos pedidos por status.
- Evolução de pedidos por período.

### Busca e filtros

Permite pesquisar pedidos por cliente, produto ou telefone e filtrar por tags e permutas/parcerias.

### Operações em massa

Usuários autorizados podem selecionar vários pedidos visíveis e removê-los em uma única operação, mediante confirmação.

### Personalização

O usuário pode definir quais cards aparecem no Dashboard e ajustar a densidade de exibição.

### Paginação e visualização

- Paginação dos pedidos no quadro operacional por status (Todos, Pendentes, Em Produção e Concluídos).
- Seletor flexível de itens por página (6, 12, 24 ou Todos).
- Persistência da preferência de quantidade de pedidos por página no navegador.

## 4. Clientes

O módulo de Clientes funciona como cadastro e histórico de relacionamento.

### Cadastro

Inclui:

- Nome.
- Telefone.
- E-mail.
- Foto.
- Logradouro.
- Número.
- Complemento.
- Cidade.
- Estado ou região.
- CEP ou código postal.
- País.
- Data de aniversário.
- Observações.
- Classificação do cliente.

### Endereço por CEP

Ao informar um CEP brasileiro válido, o sistema consulta o ViaCEP e preenche automaticamente logradouro, cidade, estado e país.

Quando o CEP não é localizado ou o endereço é internacional, o usuário pode ativar **Preenchimento manual do endereço** e informar os dados livremente.

### Classificação do cliente

- Cliente padrão.
- VIP.
- Cliente recorrente.
- Inadimplente.
- Parceiro / Permuta.

A classificação orienta a leitura da carteira e pode influenciar regras operacionais. Clientes inadimplentes, por exemplo, não podem receber novos pedidos até a situação ser regularizada.

### Histórico e indicadores

O cadastro mostra histórico de pedidos, quantidade de pedidos, total gasto e último pedido.

### Filtros

É possível combinar:

- Busca por nome, telefone ou e-mail.
- Clientes com pedidos em aberto.
- Clientes sem pedidos relacionados.
- Classificação do cliente.

### Operações em massa

Permite selecionar clientes filtrados e remover vários registros. Clientes vinculados a pedidos ativos ficam bloqueados para exclusão.

## 5. Pedidos

Pedidos representam a execução comercial e produtiva de uma encomenda.

### Dados principais

- Cliente.
- Produto ou serviço.
- Quantidade.
- Valor.
- Data de entrega.
- Status.
- Observações.
- Tags.
- Cor de destaque.
- Anexos.
- Artes vinculadas.
- Dados de pagamento.

### Status do pedido

- Pendente.
- Em produção.
- Concluído.
- Cancelado.

### Workflow de produção

Quando utilizado, o pedido pode avançar pelas etapas:

1. Design.
2. Aprovação.
3. Impressão.
4. Corte.
5. Montagem.
6. Controle de qualidade.
7. Embalagem.

Cada etapa pode registrar conclusão, data, responsável e observações.

### Pagamentos

O pedido acompanha:

- Status pendente, parcial ou pago.
- Valor total.
- Valor recebido.
- Valor restante.
- Método de pagamento.
- Data e histórico de pagamentos.
- Observações financeiras.

Métodos disponíveis: PIX, dinheiro, crédito, débito e transferência.

### Anexos e galeria

Pedidos podem receber imagens e PDFs de referência, além de artes já cadastradas na galeria do cliente.

### Comunicação

O sistema permite abrir uma conversa no WhatsApp com os dados do pedido.

### Permuta e parceria

Um pedido pode ser marcado como permuta/parceria, com observações e itens recebidos, sem cobrança monetária convencional.

### Operações em massa

Pedidos filtrados podem ser selecionados e removidos em conjunto, com confirmação antes da ação.

## 6. Agenda semanal

A Agenda organiza as entregas dos próximos sete dias.

Permite:

- Visualizar pedidos por dia.
- Destacar o dia atual.
- Filtrar por status.
- Consultar resumo financeiro da semana.
- Abrir os detalhes do pedido.
- Atualizar status quando autorizado.

## 7. Orçamentos

Orçamentos apoiam a negociação antes da confirmação do pedido.

### Criação

Um orçamento pode conter:

- Cliente cadastrado ou novo cliente.
- Um ou mais itens.
- Produtos do catálogo ou itens digitados manualmente.
- Quantidade e preço unitário.
- Desconto percentual ou fixo.
- Condição de pagamento.
- Data de entrega.
- Data de validade.
- Forma de entrega.
- Endereço de entrega.
- Observações.
- Tags.
- Cor de destaque.

### Status

- Rascunho.
- Enviado.
- Aprovado.
- Rejeitado.
- Expirado.

### Expiração automática

Orçamentos em Rascunho ou Enviado cuja data de validade já passou são marcados automaticamente como Expirados quando carregados. Orçamentos Aprovados ou Rejeitados não são alterados por essa regra.

### Conversão

Ao aprovar um orçamento, o sistema pode convertê-lo em pedido, mantendo a relação entre os dois registros.

### Comunicação e exportação

- Mensagem de orçamento personalizável para WhatsApp.
- Exportação para PDF.
- Exportação para planilha.
- Duplicação de orçamento.

### Filtros

- Busca por cliente, número, produto ou tag.
- Período de criação.
- Forma de entrega.
- Tags.
- Status por abas.

## 8. Produtos (Ateliê Interno)

O catálogo de Produtos acelera o preenchimento de pedidos e orçamentos do ateliê.

Cada produto pode conter:

- Nome.
- Preço unitário.
- Descrição.
- Categoria.
- Imagem.
- Data de criação e atualização.

Produtos internos são selecionados durante a criação de pedidos e orçamentos operacionais, permitindo manter o controle de insumos e produtos de apoio sem expô-los diretamente ao público externo.

## 8.1. Lojinha Online & Catálogo Público (`/catalogo`)

A Lojinha Online é a vitrine comercial digital voltada para o cliente final, permitindo divulgar produtos prontos para encomenda via redes sociais (Instagram, link na bio, WhatsApp) com fechamento direto de pedidos.

### Separação de catálogos (`storeProducts` vs `products`)
- **Produtos Internos (`products`):** cadastrados para suporte à confecção, orçamentos e pedidos da rotina interna do ateliê.
- **Produtos da Lojinha (`storeProducts`):** itens com fotos, descrições comerciais, categorias e preços voltados para a vitrine pública. Essa separação impede conflitos operacionais e permite restringir quem pode gerenciar a vitrine externa através de permissões dedicadas.

### Gestão no painel administrativo
- **Submenu "Lojinha Online":** agrupamento intuitivo na barra lateral com acesso aos *Produtos da Lojinha* (`/produtos-lojinha`), *Personalizar Loja* (`/personalizar-lojinha`) e *Pedidos da Lojinha* (`/pedidos-lojinha`).
- **Modos de visualização:** alternância entre visualização em Grade/Galeria e Lista detalhada, com persistência da preferência do usuário em `localStorage` e layout responsivo que elimina barras de rolagem excessivas.
- **Controle de permissões (RBAC):** suporte a permissão específica `storeProducts` (visualizar, criar, editar e excluir) para controlar quais colaboradores têm autonomia sobre o catálogo público.
- **Toggle de Publicação (Loja No Ar / Manutenção):**
  - Chave liga/desliga na aba *Publicação & Flags* da tela de personalização.
  - Ao despublicar, a loja entra instantaneamente em modo de manutenção para os visitantes, exibindo logotipo, mensagem personalizada ou padrão e atalhos de contato via WhatsApp e Instagram.
- **Feature Flags e Controle de Funcionalidades:**
  - **Pedidos Online (Sacola):** permite ativar ou desativar o fluxo de carrinho/sacola e envio de pedidos. Quando desativada, a loja opera em modo vitrine/catálogo institucional, ocultando a gaveta de sacola e trocando os botões de compra por "Ver Detalhes" e link direto de consulta no WhatsApp com o nome do produto pré-preenchido.
  - **Modo Escuro:** toggle que controla se os visitantes podem alternar para o tema escuro ou se a loja opera estritamente no tema claro.

### Experiência do cliente no Catálogo Público (`/catalogo`)
- **Acesso livre:** visualização instantânea sem necessidade de login.
- **Banners rotativos:** carrossel de propaganda e anúncios com transição automática configurável, intervalo em segundos personalizável e opção de banner fixo.
- **Sacola de encomendas adaptativa:** adição rápida de produtos com seletor de quantidade e campos para personalização quando o modo de pedidos online está ativo. Quando inativo, direciona o cliente para o atendimento direto no WhatsApp.
- **Checkout via WhatsApp:** geração automática de mensagem estruturada e amigável com a lista de itens, código do pedido gerado, nomes personalizados, subtotal e dados de entrega para envio direto ao WhatsApp do ateliê.
- **Página de Manutenção:** tela dedicada com gradientes suaves, identidade visual e canais diretos de contato quando a loja estiver temporariamente despublicada.
- **Isolamento de tema e padrão claro obrigatório:**
  - O catálogo público adota **sempre o tema claro como padrão** em qualquer carregamento inicial.
  - O alternador de tema na vitrine opera em escopo local e não grava na chave global do painel administrativo.
  - Ao sair da lojinha e retornar ao painel interno, a preferência de tema da área administrativa é fielmente restabelecida, impedindo que a navegação do cliente altere a experiência do operador.

## 9. Galeria

A Galeria organiza artes e trabalhos realizados.

Permite:

- Criar pastas.
- Vincular pastas a clientes.
- Adicionar imagens.
- Editar títulos e descrições.
- Usar tags.
- Pesquisar e filtrar por cliente ou tag.
- Visualizar imagens em lightbox.
- Remover artes e pastas conforme as permissões.

A galeria pode ser reutilizada como referência durante a criação de pedidos.

## 10. Permutas e parcerias

Este módulo acompanha pedidos marcados como permuta/parceria.

Permite:

- Filtrar por cliente, status e período.
- Pesquisar por produto ou observação.
- Registrar produtos entregues.
- Registrar produtos recebidos.
- Trabalhar com valores estimados.
- Acompanhar saldo entre entrega e recebimento.
- Atualizar o status relacionado ao pedido.
- Exportar dados em CSV.
- Gerar versão para impressão/PDF.

## 11. Relatórios

Relatórios apoiam decisões comerciais e operacionais.

### Indicadores

- Receita total.
- Ticket médio.
- Total de pedidos.
- Taxa de conversão.
- Quantidade e valor de orçamentos.
- Novos clientes.
- Pedidos concluídos e cancelados.
- Comparação com o período anterior.

### Análises

- Receita ao longo do tempo.
- Distribuição de status.
- Métodos de pagamento.
- Produtos mais vendidos.
- Clientes com maior receita.
- Tags e filtros por período flexível (Hoje, Semana, Mês, Trimestre, Ano, Todo o Histórico ou Personalizado).
- Suporte multi-usuário com filtro de equipe para administradores.

### Histórico Financeiro e Descarte de Cancelados

- **Independência Operacional x Contábil:** Os registros financeiros de vendas (`salesLedger`) são preservados de forma independente dos cadastros operacionais. A exclusão de um cliente da lista de contatos ou a remoção/arquivamento de um pedido da visualização de trabalho não apaga o histórico de faturamento nem o ticket médio consolidado da empresa.
- **Descarte de Cancelados:** Pedidos com status cancelado são automaticamente descartados das métricas de faturamento e ticket médio para garantir relatórios fiéis.
- **Busca por Períodos Customizados:** O usuário e administradores podem consultar relatórios em janelas de tempo personalizadas com comparação automática com períodos anteriores.

### Períodos

- Semana.
- Mês.
- Trimestre.
- Ano.

### Exportação

Os dados podem ser exportados em CSV para análises externas.

## 12. Configurações

### Informações do negócio

- Nome do negócio.
- Telefone.
- E-mail.
- Logradouro/endereço.
- Número.
- Complemento.
- CEP.
- Cidade.
- Estado.
- Slogan ou descrição curta.
- Instagram.
- Site.
- WhatsApp.

O CEP preenche automaticamente logradouro, cidade e estado quando localizado.

### Identidade visual

- Avatar do usuário.
- Logo da empresa.
- Banner.
- Modo claro, escuro ou sistema.
- Paletas de destaque.
- Cor personalizada.
- Pré-visualização de elementos.

A interface utiliza uma linguagem glass com superfícies translúcidas, blur, bordas suaves e paleta adaptada para claro e dark.

### Dashboard

O usuário pode escolher os indicadores exibidos e o período padrão dos relatórios.

### Operação padrão

- Dias padrão para entrega.
- Método de pagamento padrão.
- Antecedência dos alertas de entrega.

### Navegação e exibição

- Reordenar módulos do menu.
- Usar cards compactos ou confortáveis.
- Recolher a sidebar no desktop.
- Navegação adaptada para mobile.

### WhatsApp

Permite configurar saudação e assinatura reutilizadas nas mensagens enviadas aos clientes.

### Permissões

Usuários podem consultar suas permissões; administradores gerenciam permissões de acesso.

### Ações irreversíveis

A restauração das configurações padrão remove personalizações, incluindo imagens enviadas, mediante confirmação.

## 12. Central de E-mails (`/emails`)

Disponível exclusivamente para administradores, centraliza o envio, monitoramento e recebimento de e-mails transacionais e de relacionamento.

### Envio de E-mails

- Composição de e-mail com destinatário, assunto, corpo e preview em tempo real.
- Seleção do remetente entre os domínios verificados (`contato@`, `noreply@`, `suporte@luisices.com.br`).
- Envio via Resend com feedback imediato de sucesso ou falha.
- Rate limiting: máximo de 50 disparos por hora por usuário administrador.

### Controle de Cota Diária

- Exibe a cota de envio do dia atual (enviados / limite) com barra de progresso visual.
- Sincronização via Cloud Function `getEmailUsage` que combina a API do Resend com contagem local no Firestore.
- Fallback para contagem do Firestore em caso de indisponibilidade da API Resend (cobrindo os 15 min de cache da API).

### Recebimento de E-mails (Webhook)

- Webhook HTTP seguro (`resendReceivingWebhook`) integrado à Cloud Function correspondente.
- Validação de assinatura Svix com proteção contra replay attacks (janela de 5 minutos).
- E-mails recebidos são armazenados na coleção `receivedEmails/{emailId}` e exibidos na interface.

### Segurança

- Módulo restrito ao papel `admin` — funcionários e usuários comuns não têm acesso.
- Rate limiting aplicado no backend para prevenir abuso.
- Validação rigorosa de payload e verificação de assinatura Svix no webhook.
- Em ambiente de desenvolvimento (`luisices-dev`), utiliza remetentes e domínios `dev.luisices.com.br`; em produção (`papelaria-dashboard`), utiliza os domínios verificados `luisices.com.br`.

## 13. Usuários, permissões e equipe (RBAC)

O sistema opera com três papéis fundamentais:

- **Administrador (`admin`)**:
  - Acesso irrestrito a todos os módulos, configurações e relatórios consolidados da empresa.
  - Gerenciamento de equipe e usuários (convidar, definir papéis, alterar permissões, resetar senhas e desativar contas).
  - Delegação de pedidos para funcionários responsáveis (individualmente ou em lote via *bulk assign*).
  - Filtro de equipe na Dashboard (`AdminTeamFilter`) para acompanhar a carga de trabalho de cada colaborador.

- **Funcionário (`funcionario`)**:
  - Perfil focado na esteira produtiva e operacional.
  - Visualiza e acompanha pedidos atribuídos a ele por um administrador ou criados por ele.
  - Atualiza as etapas do workflow de produção (Design → Aprovação → Impressão → Corte → Montagem → Qualidade → Embalagem).
  - Tem acesso aos cadastros de clientes e produtos conforme as permissões delegadas pelo administrador.

- **Usuário (`user`)**:
  - Perfil padrão para operação comercial autônoma.
  - Gerencia seus próprios pedidos, clientes, produtos e orçamentos.
  - Pode excluir pedidos cadastrados por ele mesmo.
  - Acessa relatórios financeiros e controle de permutas/trocas escopados estritamente aos seus próprios dados.

### Matriz de permissões granulares

As permissões são controladas por módulo e operação:
- **Operações:** Visualizar (`view`), Criar (`create`), Editar (`edit`), Excluir (`delete`).
- **Módulos disponíveis:**
  - **Pedidos (`orders`)**
  - **Clientes (`customers`)**
  - **Produtos do Ateliê (`products`)**
  - **Produtos da Lojinha (`storeProducts`)**: controle sobre a vitrine pública de vendas.
  - **Orçamentos (`quotes`)**
  - **Galeria (`gallery`)**
  - **Permutas/Trocas (`exchanges`)**
  - **Relatórios (`reports`)**
  - **Personalização da Loja (`storeSettings`)**
  - **Usuários e Equipe (`users`)**: exclusivo para administradores.

### Revogação de acesso em tempo real

O sistema utiliza listeners do Firestore no contexto de autenticação (`AuthContext`). Se um usuário tiver seu perfil desativado, seu papel alterado ou permissões revogadas por um administrador, a interface e as rotas protegidas reagem imediatamente, bloqueando o acesso e redirecionando a sessão sem que seja necessário novo login.

## 14. Central de Ajuda & Guia Operacional (`/ajuda`)

Disponível para todos os usuários autenticados via rota `/ajuda`, reúne:

- **Guia Operacional Interativo**: explicação passo a passo dos fluxos do sistema (pedidos, produção, orçamentos e clientes).
- **FAQ Dinâmico**: respostas rápidas para dúvidas operacionais mais comuns e boas práticas.
- **Catálogo de Atalhos de Teclado**: guia de produtividade para navegação rápida pelo sistema.
- **Canais de Atendimento**: atalhos para suporte via WhatsApp e e-mail com a equipe técnica.

## 15. Regras de negócio importantes

- Clientes inadimplentes não podem receber novos pedidos.
- Clientes com pedidos ativos não podem ser removidos.
- A exclusão em massa exige seleção e confirmação.
- Orçamentos vencidos em Rascunho ou Enviado tornam-se Expirados.
- Aprovar orçamento pode criar um pedido relacionado.
- Valores monetários não devem ser negativos.
- Pedidos de permuta podem não ter cobrança monetária.
- Dados são isolados por usuário nas regras do Firebase.
- Operações indisponíveis por permissão não devem ser executadas apenas por ocultação visual; o backend também deve impedir o acesso.
- A Lojinha Online (`/catalogo`) adota obrigatoriamente o **tema claro como padrão (default)**; o alternador de tema do catálogo opera isolado sem sobrescrever a preferência do painel administrativo.
- A vitrine pública (`/catalogo`) lê **exclusivamente** a coleção `storeProducts`. Quando a coleção está vazia, o catálogo exibe estado vazio — não há fallback para produtos internos (`products`). O cache local (`localStorage`) é invalidado a cada carregamento para garantir consistência imediata após remoções.


## 16. Fluxos recomendados

### Novo cliente e pedido

1. Cadastrar o cliente.
2. Informar o CEP ou preencher o endereço manualmente.
3. Criar o pedido.
4. Selecionar produto, quantidade e valor.
5. Definir entrega, pagamento e anexos.
6. Acompanhar a produção.
7. Atualizar pagamento e entrega.
8. Marcar o pedido como concluído.

### Orçamento convertido em pedido

1. Criar o orçamento.
2. Adicionar itens e condições comerciais.
3. Definir validade.
4. Enviar ao cliente.
5. Aprovar ou rejeitar.
6. Converter em pedido quando aprovado.
7. Acompanhar produção e recebimento.

### Acompanhamento diário

1. Consultar o Dashboard.
2. Verificar atrasos e próximas entregas.
3. Filtrar pedidos pendentes ou em produção.
4. Atualizar etapas do workflow.
5. Cobrar valores pendentes.
6. Usar relatórios para avaliar o período.

## 17. Limites e responsabilidades

- O ViaCEP depende de disponibilidade externa e cobre endereços brasileiros.
- Endereços não localizados devem ser preenchidos manualmente.
- A API key do Firebase não substitui regras de segurança.
- Exportações devem ser tratadas como cópias dos dados no momento da exportação.
- O usuário deve manter permissões, dados comerciais e configurações atualizados.
