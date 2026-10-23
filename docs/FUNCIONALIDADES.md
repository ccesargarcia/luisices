# Funcionalidades e jornadas do Luisices

Revisado em **22/10/2026**, com base no código da branch `develop`. Este guia descreve o código atual. Disponibilidade depende de permissões, configuração das integrações e publicação no ambiente.

## Mapa do produto

| Módulo | Rota principal | Função |
|---|---|---|
| Dashboard/pedidos | `/dashboard` | Operação, indicadores, pedidos e etapas de produção |
| Arquivados | `/pedidos-arquivados` | Consulta de pedidos arquivados |
| Agenda | `/agenda` | Entregas e planejamento semanal |
| Clientes | `/clientes` | Cadastro, relacionamento, histórico e galeria por cliente |
| Produtos | `/produtos` | Catálogo interno de produtos |
| Orçamentos | `/orcamentos` | Propostas, itens, descontos, status e conversão |
| Precificação | `/precificacao` | Insumos, compras, receitas, mão de obra e preço sugerido |
| Galeria | `/galeria` | Portfólio, imagens, organização e enriquecimento por IA |
| Permutas | `/permutas` | Parcerias e trocas |
| Relatórios | `/relatorios` | Indicadores e exportações |
| Loja pública | `/loja`, `/catalogo` | Vitrine e envio de encomendas |
| Produtos da loja | `/produtos-lojinha` | Catálogo publicado e ações em lote |
| Pedidos da loja | `/pedidos-lojinha` | Recebimento e conversão para a operação |
| Personalização da loja | `/personalizar-lojinha` | Apresentação e configurações comerciais |
| WhatsApp | `/whatsapp` | Conversas, mensagens e atendimento |
| E-mails | `/emails` | Composição, recebimento e histórico |
| Usuários | `/usuarios` | Contas, permissões, presença e sessões |
| Configurações/ajuda | `/configuracoes`, `/ajuda` | Preferências, integrações e instruções de uso |

Fonte das rotas e aliases: [routes.tsx](../src/app/routes.tsx). A disponibilidade de um endereço não concede acesso aos dados.

## Os módulos fazem sentido juntos?

Sim. Existem três fluxos complementares:

1. **Venda:** cliente → orçamento ou encomenda da loja → pedido → pagamento → relatório.
2. **Produção:** produto/receita e insumos → preço → pedido → etapas de trabalho → entrega → portfólio.
3. **Relacionamento:** histórico do cliente → e-mail/WhatsApp → nova encomenda.

A separação entre `products` (catálogo interno), `storeProducts` (vitrine), `supplies` (insumos) e `pricingRecipes` (composição/cálculo) tem propósito. Unificá-los apenas por semelhança de nome misturaria custos, publicação e operação. A melhoria recomendada é explicitar esses nomes na ajuda e nos formulários.

## Pedidos, produção e agenda

Pedidos reúnem cliente, produto, quantidade, preço, pagamentos, entrega e status. O workflow inclui Design, Aprovação, Impressão, Corte, Montagem, Qualidade e Embalagem. Há atribuição de pedidos a colaboradores, filtros de equipe e consulta de arquivados.

A importação de pedidos por `.xlsx`, `.xls` ou `.csv` permite revisar e editar cada linha antes de gravar. É possível alterar cliente e contatos, produto, quantidade, valores, entrega, status, pagamento, etiquetas e observações. Os pedidos válidos começam selecionados; o usuário pode marcar ou desmarcar linhas, selecionar as linhas visíveis no filtro ou limpar toda a seleção. Trocar o filtro não altera os pedidos escolhidos.

O botão de importar mostra a quantidade selecionada e fica bloqueado enquanto houver edição aberta, nenhuma linha selecionada ou uma linha selecionada com erro. As edições são revalidadas ao salvar, recalculando o saldo do pagamento. A opção de cadastro automático de clientes atua somente sobre os pedidos efetivamente importados. Editar a prévia não altera o arquivo original nem grava dados no sistema; a gravação começa ao confirmar a importação. No celular a prévia usa cartões; no desktop, tabela com rolagem horizontal.

A leitura aceita arquivos de até 10 MB, com até 1.000 pedidos e 64 colunas. Quantidade, valores, datas e dados do cliente são revalidados antes de gravar, e as regras do Firestore impõem validação independente para criação e alteração de pedidos.

Fontes da importação: [modal](../src/app/components/orders/ImportOrdersDialog.tsx), [edição](../src/app/components/orders/ImportOrderRowEditor.tsx), [revisão e seleção](../src/app/utils/importOrdersReview.ts), [parsing e gravação](../src/app/utils/importOrdersExcel.ts).

A agenda organiza entregas. Não existe no Copiloto uma ferramenta dedicada para capacidade produtiva, dependências entre etapas ou alteração de responsável.

O autoarquivamento atual é acionado pela interface do dashboard conforme dados carregados e preferências. Não deve ser apresentado como agendamento autônomo garantido no servidor quando ninguém abre o sistema.

Fontes: [Dashboard](../src/app/pages/Dashboard.tsx), [serviço de pedidos](../src/services/firebaseOrderService.ts), [agenda](../src/app/pages/WeeklyCalendar.tsx).

## Clientes e histórico

Cadastro com contatos, classificação, endereço e aniversário. A interface oferece consulta de endereço por CEP e preenchimento manual.

Os indicadores históricos do cliente usam `salesLedger`, associados por identificador do cliente e proprietário. A lista de pedidos operacionais pode ter cobertura diferente. A galeria no histórico usa páginas de até 30 documentos, com carregamento incremental.

Excluir/alterar um cadastro não deve ser interpretado como remoção automática do histórico contábil.

## Orçamentos, produtos e precificação

Orçamentos têm itens, descontos, status, exportação e conversão em pedido. Produtos internos e itens da loja são cadastros distintos. A precificação trabalha com insumos, compras, receitas, perdas, mão de obra, setup, despesas e margem.

A estimativa do Copiloto reutiliza o motor de regras com setup rateado pela quantidade. O texto e o card identificam argumentos recebidos, configurações cadastradas e padrões assumidos; um argumento da ferramenta não comprova que foi informado pelo usuário. Zeros explícitos são preservados e argumentos inválidos são recusados. Os detalhes distinguem materiais, personalização, perdas, montagem e setup sem duplicar despesas fixas. Históricos antigos continuam visíveis com adaptação explícita. Não equivale a preço aprovado nem orçamento salvo; o atendente precisa revisar as premissas.

Fontes: [Quotes](../src/app/pages/Quotes.tsx), [Pricing](../src/app/pages/Pricing.tsx), [serviço de precificação](../src/services/firebasePricingService.ts).

## Loja pública

Vitrine com produtos, imagens, opções comerciais, personalização e envio de encomendas. O catálogo público recebe campos liberados pelo backend; produtos ocultos e metadados internos não são expostos. O envio passa por `submitPublicCatalogOrder`, que revalida disponibilidade, preço e pedido mínimo; a tela de gestão trata a conversão em pedido interno.

O enriquecimento visual por IA sugere textos e campos do produto. Prazo, preço, disponibilidade e selos comerciais precisam de conferência humana; uma fotografia não comprova estoque, prazo de fabricação ou popularidade.

Fontes: [PublicCatalog](../src/app/pages/PublicCatalog.tsx), [StoreProducts](../src/app/pages/StoreProducts.tsx), [StoreOrders](../src/app/pages/StoreOrders.tsx), [backend](../functions/orders/index.js).

## Atendimento

**E-mail:** envio e recebimento via Resend, anexos e acompanhamento de consumo. O backend aceita administradores ou contas com a permissão de envio correspondente. O formulário mantém chave de idempotência em repetições da mesma tentativa.

**WhatsApp:** rascunho e envio são operações distintas. A central consulta mensagens e permite ações conforme autorização. O Copiloto prepara um rascunho; o usuário revisa e confirma o envio. A interface mostra sucesso somente após retorno `success === true` do backend; um resultado incerto não gera repetição automática e orienta conferir o Atendimento. Abrir WhatsApp Web apenas carrega o texto. Homônimos/pedidos não localizados exigem identificação; cobrança e status usam somente fatos comprovados, sem presumir embalagem por pedido concluído.

O acesso às conversas depende das permissões e da configuração do módulo de atendimento.

## Relatórios e conceitos financeiros

| Conceito | Interpretação |
|---|---|
| Volume emitido | Valor dos pedidos válidos no conjunto consultado |
| Faturamento concluído | Valor dos pedidos concluídos no conjunto consultado |
| Valor recebido associado aos pedidos | Soma dos pagamentos registrados nesses pedidos |
| Saldo pendente | Valor ainda devido conforme os registros consultados |
| Caixa por data de pagamento | Exige selecionar eventos de pagamento pela data de recebimento; não é sinônimo dos itens acima |

O financeiro do Copiloto filtra pedidos por `createdAt` (ou todo o histórico sem filtro). Pedidos sem criação válida ficam fora de intervalos, sem usar entrega ou data atual como substituto. “Pagamentos registrados nos pedidos selecionados” refere-se aos pagamentos acumulados desses pedidos; não comprova entradas de caixa ocorridas no período solicitado. Ele consulta `orders`, enquanto o histórico de clientes utiliza o ledger. Não prometer igualdade entre bases sem reconciliação.

Relatórios permitem exportações; o Copiloto não tem ferramenta para gerar/anexar esses arquivos.

## Administração, sessões e presença

Há papéis `admin`, `funcionario` e `user`, permissões por módulo e verificações no backend/regras. Convites, recuperação de acesso e mudanças administrativas têm fluxos próprios.

A atualização visual de permissões depende de listeners e conectividade. Desconexão individual é cooperativa; revogação global é outra operação. A sincronização entre Auth, Firestore e RTDB pode ter etapas pendentes e não constitui uma transação única entre serviços.

## IA e Alexa

O Copiloto tem nove ferramentas de consulta/preparação; enriquecimento de imagens usa callables separados. Leia [capacidades, contratos e prompt aplicado](COPILOTO_IA.md).

Alexa é uma integração independente, com pareamento, autorização e modos de confirmação por voz ou aprovação no app. A configuração atual estabelece 15 minutos para rascunhos iniciais e 5 minutos para códigos de pareamento. No modo `app_approval`, o diálogo renova a validade para 24 horas ao encaminhar para o aplicativo; o encaminhamento de segurança após falhas de voz mantém a validade inicial. O prompt diferencia essas condições a partir de constantes compartilhadas. Consulte a interface e a configuração do ambiente; não aplicar a janela de convites de usuários a rascunhos Alexa.

Links públicos de acompanhamento de pedidos podem ser criados, listados, copiados, revogados e excluídos conforme o estado do pedido e a autorização do usuário. A configuração do template e da identidade visual pertence às configurações da loja; o acesso público é servido por endpoint próprio. A disponibilidade depende da publicação das Functions e do secret `ORDER_TRACKING_ENCRYPTION_KEY` no ambiente.

Fontes: [constantes compartilhadas](../functions/alexa/constants.js), [configuração Alexa](../functions/alexa/config.js), [diálogo](../functions/alexa/dialog.js), [Functions de acompanhamento](../functions/orders/index.js).

## Mobile e instalação

Layout responsivo, manifest e ícones de instalação fazem parte do frontend. O entrypoint desregistra service workers e limpa caches legados; não anunciar suporte offline completo. Confirme atualização, rolagem e ações nos dispositivos usados pelo ateliê.
