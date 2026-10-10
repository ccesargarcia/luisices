# Funcionalidades e jornadas do Luisices

Revisado em **10/10/2026**, com base na `develop` (`b2b6ef9`). Este guia descreve o código atual. Disponibilidade depende de permissões, configuração das integrações e publicação no ambiente.

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

A agenda organiza entregas. Não existe no Copiloto uma ferramenta dedicada para capacidade produtiva, dependências entre etapas ou alteração de responsável.

O autoarquivamento atual é acionado pela interface do dashboard conforme dados carregados e preferências. Não deve ser apresentado como agendamento autônomo garantido no servidor quando ninguém abre o sistema.

Fontes: [Dashboard](../src/app/pages/Dashboard.tsx), [serviço de pedidos](../src/services/firebaseOrderService.ts), [agenda](../src/app/pages/WeeklyCalendar.tsx).

## Clientes e histórico

Cadastro com contatos, classificação, endereço e aniversário. A interface oferece consulta de endereço por CEP e preenchimento manual.

Os indicadores históricos do cliente usam `salesLedger`, associados por identificador do cliente e proprietário. A lista de pedidos operacionais pode ter cobertura diferente. A galeria no histórico usa páginas de até 30 documentos, com carregamento incremental.

Excluir/alterar um cadastro não deve ser interpretado como remoção automática do histórico contábil. Confira [métricas](METRICAS_CLIENTES_LEDGER.md) e [paginação](PAGINACAO_GALERIA_CLIENTE.md).

## Orçamentos, produtos e precificação

Orçamentos têm itens, descontos, status, exportação e conversão em pedido. Produtos internos e itens da loja são cadastros distintos. A precificação trabalha com insumos, compras, receitas, perdas, mão de obra, setup, despesas e margem.

A estimativa do Copiloto reutiliza o motor de regras com setup rateado pela quantidade. O texto e o card identificam argumentos recebidos, configurações cadastradas e padrões assumidos; um argumento da ferramenta não comprova que foi informado pelo usuário. Zeros explícitos são preservados e argumentos inválidos são recusados. Os detalhes distinguem materiais, personalização, perdas, montagem e setup sem duplicar despesas fixas. Históricos antigos continuam visíveis com adaptação explícita. Não equivale a preço aprovado nem orçamento salvo; o atendente precisa revisar as premissas.

Fontes: [Quotes](../src/app/pages/Quotes.tsx), [Pricing](../src/app/pages/Pricing.tsx), [serviço de precificação](../src/services/firebasePricingService.ts).

## Loja pública

Vitrine com produtos, imagens, opções comerciais, personalização e envio de encomendas. O envio público passa por `submitPublicCatalogOrder`; a tela de gestão trata a conversão em pedido interno.

O enriquecimento visual por IA sugere textos e campos do produto. Prazo, preço, disponibilidade e selos comerciais precisam de conferência humana; uma fotografia não comprova estoque, prazo de fabricação ou popularidade.

Fontes: [PublicCatalog](../src/app/pages/PublicCatalog.tsx), [StoreProducts](../src/app/pages/StoreProducts.tsx), [StoreOrders](../src/app/pages/StoreOrders.tsx), [backend](../functions/orders/index.js).

## Atendimento

**E-mail:** envio e recebimento via Resend, anexos e acompanhamento de consumo. O backend aceita administradores ou contas com a permissão de envio correspondente. O formulário mantém chave de idempotência em repetições da mesma tentativa; consulte o [contrato de recuperação](RECUPERACAO_ENVIO_EMAIL.md).

**WhatsApp:** rascunho e envio são operações distintas. A central consulta mensagens e permite ações conforme autorização. O Copiloto prepara um rascunho; o usuário revisa e confirma o envio. A interface mostra sucesso somente após retorno `success === true` do backend; um resultado incerto não gera repetição automática e orienta conferir o Atendimento. Abrir WhatsApp Web apenas carrega o texto. Homônimos/pedidos não localizados exigem identificação; cobrança e status usam somente fatos comprovados, sem presumir embalagem por pedido concluído.

O modelo atual de conversa usa telefone e proprietário. Clientes de parceiros diferentes podem ter o mesmo telefone, mas isso ainda não cria caixas independentes para cada parceiro. Veja [o contrato atual](ISOLAMENTO_WHATSAPP_PARCEIROS.md).

## Relatórios e conceitos financeiros

| Conceito | Interpretação |
|---|---|
| Volume emitido | Valor dos pedidos válidos no conjunto consultado |
| Faturamento concluído | Valor dos pedidos concluídos no conjunto consultado |
| Valor recebido associado aos pedidos | Soma dos pagamentos registrados nesses pedidos |
| Saldo pendente | Valor ainda devido conforme os registros consultados |
| Caixa por data de pagamento | Exige selecionar eventos de pagamento pela data de recebimento; não é sinônimo dos itens acima |

O financeiro do Copiloto filtra pedidos por `createdAt` (ou todo o histórico sem filtro). Pedidos sem criação válida ficam fora de intervalos, sem usar entrega ou data atual como substituto. “Pagamentos registrados nos pedidos selecionados” refere-se aos pagamentos acumulados desses pedidos; não comprova entradas de caixa ocorridas no período solicitado. Ele consulta `orders`, enquanto o histórico de clientes utiliza o ledger. Não prometer igualdade entre bases sem reconciliação.

Resumos mensais têm contrato próprio: [integridade dos rollups](INTEGRIDADE_ROLLUPS_FINANCEIROS.md). Relatórios permitem exportações; o Copiloto não tem ferramenta para gerar/anexar esses arquivos.

## Administração, sessões e presença

Há papéis `admin`, `funcionario` e `user`, permissões por módulo e verificações no backend/regras. Convites, recuperação de acesso e mudanças administrativas têm fluxos próprios.

A atualização visual de permissões depende de listeners e conectividade. Desconexão individual é cooperativa; revogação global é outra operação. A sincronização entre Auth, Firestore e RTDB pode ter etapas pendentes e não constitui uma transação única entre serviços.

Consulte [sessões](SEGURANCA_DESCONEXAO_DISPOSITIVOS.md) e [presença](CORRECAO_PRESENCA_RTDB.md).

## IA e Alexa

O Copiloto tem nove ferramentas de consulta/preparação; enriquecimento de imagens usa callables separados. Leia [capacidades, contratos e prompt aplicado](COPILOTO_IA.md).

Alexa é uma integração independente, com pareamento, autorização e modos de confirmação por voz ou aprovação no app. A configuração atual estabelece 15 minutos para rascunhos iniciais e 5 minutos para códigos de pareamento. No modo `app_approval`, o diálogo renova a validade para 24 horas ao encaminhar para o aplicativo; o encaminhamento de segurança após falhas de voz mantém a validade inicial. O prompt diferencia essas condições a partir de constantes compartilhadas. Consulte a interface e a configuração do ambiente; não aplicar a janela de convites de usuários a rascunhos Alexa.

**Estado desta entrega:** contratos implementados e validados localmente, ainda sem publicação em DEV. Histórico por cliente, consulta de orçamentos, estoque e planejamento semanal no chat continuam propostos.

Fontes: [constantes compartilhadas](../functions/alexa/constants.js), [configuração Alexa](../functions/alexa/config.js), [diálogo](../functions/alexa/dialog.js).

## Mobile e instalação

Layout responsivo, manifest e ícones de instalação fazem parte do frontend. O entrypoint desregistra service workers e limpa caches legados; não anunciar suporte offline completo. Confirme atualização, rolagem e ações nos dispositivos usados pelo ateliê.
