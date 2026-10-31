# Luisices: catálogo de fatos para vídeos

**Revisão da fonte:** 28/10/2026, código e documentação local da branch `develop`.
**Uso:** apoiar roteiro, storyboard e narração para apresentar o produto a possíveis
clientes. Confirme no app atual as telas que serão filmadas antes de cada entrega.

Esta referência descreve capacidades verificadas no repositório. Não garante que
cada conta tenha acesso a todos os módulos: permissões, configuração, integrações e
publicação do ambiente podem limitar a disponibilidade.

## O que é o Luisices

O Luisices é uma plataforma web de gestão de ateliês de papelaria personalizada e
produtos artesanais. Reúne rotinas de pedidos, clientes, orçamento, produção,
precificação, vitrine online e atendimento. A interface é responsiva e pode ser usada
em celular e desktop. Não anunciar funcionamento offline completo.

Uma mensagem central segura para apresentação é: **ajuda o ateliê a organizar o
caminho do pedido, do cadastro ao acompanhamento da produção, pagamento e entrega**.
Evite prometer que substitui toda ferramenta financeira, contábil, logística ou de
comunicação externa.

## Funcionalidades para o usuário final

### 1. Dashboard e pedidos

- Dashboard operacional com lista de pedidos, filtros por situação e indicadores
  disponíveis, como pedidos em aberto, produção, valores recebidos ou pendentes e
  alertas de prazo. A composição dos indicadores depende dos dados consultados e das
  preferências do usuário.
- Cadastro e edição de pedidos com cliente, data de entrega, observações,
  personalização, etiquetas e anexos quando habilitados.
- Pedido estruturado com **1 a 10 itens**, cada qual com quantidade, preço unitário
  e subtotal próprios. Valores são tratados em reais.
- Acompanhamento de estados operacionais como pendente, em produção, concluído ou
  cancelado, além de etapas de trabalho do ateliê quando usadas.
- Registro de pagamento integral ou parcial, método, histórico e saldo a receber.
- Atribuição de pedidos a colaboradores, ações em lote autorizadas, arquivamento e
  consulta de pedidos arquivados.
- Importação de pedidos a partir de planilhas compatíveis, com prévia, revisão e
  correção das linhas antes da confirmação.
- Links públicos de acompanhamento podem ser gerados e administrados conforme as
  permissões e a configuração do ambiente.

**Como demonstrar:** use um pedido fictício de lembrancinhas com dois itens, mostre
total, pagamento parcial, prazo e status. Não exponha pedidos reais, nem sugira que
uma mudança na interface substitui confirmação ou comunicação com o cliente.

### 2. Agenda e produção

- Agenda semanal para consultar prazos de entrega e abrir detalhes do pedido.
- Filtros por responsável/equipe quando permitidos.
- Os dados da agenda refletem pedidos cadastrados; não é um sistema autônomo de
  previsão de capacidade ou otimização de produção.
- Algumas etapas de produção podem ser acompanhadas pelo pedido, conforme o fluxo
  habilitado pelo ateliê.

**Não afirmar:** que a agenda distribui automaticamente o trabalho, calcula a
capacidade produtiva ou garante que uma entrega será cumprida.

### 3. Clientes e relacionamento

- Cadastro e consulta de clientes, com informações de contato e dados úteis ao
  relacionamento, conforme permissões.
- Consulta de pedidos e histórico relacionado ao cliente, além de indicadores
  históricos exibidos pela plataforma.
- Atalhos de contato e classificação de clientes podem estar disponíveis conforme o
  módulo/configuração.

**Cuidado:** indicadores históricos não devem ser apresentados como contabilidade
oficial ou como caixa recebido no período sem validar o significado do relatório.
Use exclusivamente dados demonstrativos.

### 4. Orçamentos e conversão em pedido

- Criação de propostas com cliente, itens, quantidades, preços e descontos.
- Acompanhamento do estado do orçamento e exportação quando disponível.
- Conversão de orçamento em pedido, sujeita às validações do sistema.

Não prometa aprovação automática, assinatura eletrônica ou envio automático ao
cliente, a menos que o fluxo exato tenha sido confirmado na versão filmada.

### 5. Produtos, custos e precificação

- Catálogo interno de produtos do ateliê.
- Cadastro de insumos e apoio a cálculos de custo/precificação, incluindo receitas,
  perdas, mão de obra, setup, despesas e margem, conforme os campos disponíveis.
- Calculadora de insumos e sugestões de preço para apoiar a decisão do ateliê.
- Os produtos internos e os produtos publicados na vitrine são cadastros com funções
  diferentes.

**Cuidado:** preço sugerido depende das informações fornecidas. Não chamar de preço
garantido, lucro líquido, avaliação fiscal ou substituto de revisão do responsável.

### 6. Vitrine e pedidos online

- Catálogo público separado do catálogo interno, com produtos selecionados para
  divulgação, fotos, categorias e informações comerciais liberadas para o público.
- Cadastro/edição individual e publicação de vários produtos a partir de imagens,
  conforme os recursos disponíveis na conta.
- Personalização da apresentação da loja, incluindo identidade visual e banners,
  conforme configuração disponível.
- A loja pode ser pausada ou configurada para receber encomendas online ou funcionar
  como vitrine de consulta, dependendo da configuração.
- A vitrine pode oferecer um caminho de consulta por WhatsApp quando essa opção estiver
  habilitada.
- Pedidos recebidos pela lojinha ficam disponíveis na área de gestão para análise e
  conversão ao fluxo operacional.

Não mostrar informações privadas de custo, produtos ocultos ou dados do painel na
visão pública. Não prometer pagamentos online integrados sem confirmação no fluxo
atual.

### 7. Galeria e portfólio

- Organização de imagens/referências do ateliê em uma galeria e associação a
  clientes, conforme o fluxo habilitado.
- Recursos de IA podem sugerir enriquecimento visual ou textos de produtos. As
  sugestões devem ser revisadas antes de publicação.

Não sugerir que a IA comprova estoque, prazo, popularidade, direitos de uso ou
características não visíveis do produto.

### 8. Atendimento por WhatsApp e e-mail

- Módulo de WhatsApp para consultar conversas/mensagens e realizar ações permitidas
  pela configuração e autorização da conta.
- O Copiloto pode preparar rascunhos de mensagens. O usuário deve revisar e confirmar
  o envio quando esse fluxo for demonstrado.
- Módulo de e-mail para fluxos de composição, envio, recebimento e histórico conforme
  a integração configurada e as permissões.

Não afirmar que o sistema envia qualquer mensagem automaticamente nem que WhatsApp,
Resend ou outra integração estará ativa em toda conta.

### 9. Relatórios e gestão

- Relatórios e indicadores operacionais/comerciais com filtros e exportações onde
  disponíveis.
- Os resultados dependem dos pedidos e pagamentos registrados e da definição do
  indicador. Não confundir valor total de pedidos, valor recebido e fluxo de caixa.
- Área de equipe/usuários com papéis e permissões por módulo. Ações administrativas
  dependem do papel do usuário.
- Configurações de negócio e integrações, com partes exclusivas de administradores.

Não anunciar o Luisices como sistema contábil, emissor fiscal, folha de pagamento ou
conciliação bancária.

### 10. Recursos opcionais e avançados

- **Copiloto de IA:** pode auxiliar com consultas, resumos, estimativas, rascunhos e
  referências da galeria por meio de ferramentas específicas. O resultado depende do
  pedido, escopo, permissões e dados disponíveis. Um rascunho ou sugestão não
  significa que uma ação foi executada. Consulte `docs/COPILOTO_IA.md` para o
  comportamento atual antes de roteirizar uma capacidade específica.
- **Alexa:** integração independente, sujeita a configuração, pareamento,
  autorização e publicação no ambiente. Não é recurso básico garantido para todos.
- **API/MCP:** integração avançada para clientes e ferramentas compatíveis, com
  credenciais, permissões e escopos próprios. Evite incluí-la em vídeo geral para
  ateliês; crie material separado para público técnico.
- **Permutas e parcerias:** gestão de pedidos/parcerias desse tipo quando o módulo
  estiver disponível para a conta.

## O que não deve ser atribuído ao produto sem nova verificação

- Aplicativo nativo Android/iOS, sincronização offline completa ou funcionamento sem
  internet.
- Integração automática com bancos, emissão de nota fiscal, contabilidade,
  transportadoras ou pagamentos online.
- Envio automático de mensagens ou campanhas sem confirmação do usuário.
- Planejamento automático da capacidade de produção ou garantia de prazo.
- Autonomia da IA para alterar/salvar dados sem as etapas de autorização e confirmação
  reais do fluxo demonstrado.
- Disponibilidade universal de todos os módulos, integrações ou permissões.
- Preços, planos, testes grátis, garantias comerciais ou números de resultados sem
  fonte comercial atual aprovada.

## Fontes de verificação no repositório

- [Funcionalidades e jornadas](../../../../docs/FUNCIONALIDADES.md): resumo dos módulos,
  fluxos e limitações operacionais.
- [Central de ajuda do app](../../../../src/app/pages/HelpCenter.tsx): instruções e
  rótulos visíveis; conferir possíveis textos antigos antes de reproduzir alegações.
- [Navegação e permissões da interface](../../../../src/app/pages/Layout.tsx) e
  [rotas](../../../../src/app/routes.tsx): módulos expostos e controle de acesso.
- [Copiloto de IA](../../../../docs/COPILOTO_IA.md): ferramentas e limites da IA.
- [Arquitetura](../../../../docs/DEPENDENCIAS_E_ARQUITETURA.md): integrações e fronteiras
  do sistema; usar só quando o público do vídeo precisar desse contexto.
