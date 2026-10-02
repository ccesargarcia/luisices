/**
 * Módulo de Apresentação Visual da Alexa (Alexa Presentation Language - APL 1.6+).
 * Design System oficial do Luisices para dispositivos com tela (Echo Show 5/8/10/15, Echo Spot e Fire TV).
 * Inclui layouts responsivos, suporte completo e robusto a telas circulares (Echo Spot), Glassmorphism, e botões interativos por toque e controle remoto.
 * Conformidade estrita com a especificação APL 1.6+ (uso de Frame para fundos e bordas, multivinculação resiliente de datasources para Fire TV e Echo Show).
 */

const DEFAULT_BRAND_LOGO = 'https://dev.luisices.com.br/images/alexa-large-icon.png';
const DEFAULT_FALLBACK_IMAGE = 'https://dev.luisices.com.br/images/alexa-large-icon.png';
const DEFAULT_QR_PLACEHOLDER = 'https://dev.luisices.com.br/images/alexa-large-icon.png';

// Expressões condicionais universais para detecção de viewport
// Echo Spot: viewport.shape é "ROUND" ou "round" (480x480).
// Dispositivos retangulares (Fire TV, Echo Show 5/8/10/15, Tablets): viewport.shape != "ROUND"
const WHEN_IS_ROUND = "${viewport.shape == 'ROUND' || viewport.shape == 'round'}";
const WHEN_IS_RECTANGULAR = "${viewport.shape != 'ROUND' && viewport.shape != 'round'}";

/**
 * Verifica se a requisição veio de um dispositivo Alexa com suporte a tela (APL).
 */
function supportsApl(envelope) {
  return Boolean(
    envelope?.context?.System?.device?.supportedInterfaces?.['Alexa.Presentation.APL']
  );
}

/**
 * Retorna estilos e paleta compartilhada do Design System Luisices.
 */
function getAplStyles() {
  return {
    colors: {
      bgMain: '#161214',
      bgCard: '#231C1E',
      bgGlass: 'rgba(35, 28, 30, 0.88)',
      borderGlass: 'rgba(235, 205, 205, 0.18)',
      primaryRose: '#F4B7B9',
      primaryButton: '#7B4D50',
      primaryPurple: '#7C3AED',
      secondaryText: '#E8E0E3',
      accentGreen: '#10B981',
      accentGreenLight: '#34D399',
      accentAmber: '#F59E0B',
      accentCoral: '#E58E8E',
      textPrimary: '#FFFFFF',
      textSecondary: '#E8E0E3',
      textMuted: '#C9C0B8',
    },
  };
}

/**
 * 1. Constrói o documento APL de Boas-Vindas no Echo Show, Echo Spot e Fire TV (LaunchRequest).
 */
function buildWelcomeAplDirective({ userName = 'Ateliê', envLabel = 'Teste' }) {
  const document = {
    type: 'APL',
    version: '1.6',
    theme: 'dark',
    import: [
      {
        name: 'alexa-layouts',
        version: '1.4.0',
      },
    ],
    mainTemplate: {
      parameters: ['welcomeData', 'welcome', 'payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#161214',
          items: [
            // Cabeçalho Oficial para telas retangulares (Echo Show 5/8/10/15, Fire TV)
            {
              type: 'AlexaHeader',
              when: WHEN_IS_RECTANGULAR,
              headerTitle: 'Luisices • Ateliê Criativo',
              headerSubtitle: `Ambiente de ${envLabel}`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            // Layout Especial Circular para Echo Spot (480x480)
            {
              type: 'Container',
              when: WHEN_IS_ROUND,
              width: '100vw',
              height: '100vh',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '24dp',
              paddingRight: '24dp',
              items: [
                {
                  type: 'Image',
                  source: DEFAULT_BRAND_LOGO,
                  width: '60dp',
                  height: '60dp',
                  scale: 'best-fit',
                  borderRadius: '30dp',
                  paddingBottom: '8dp',
                },
                {
                  type: 'Text',
                  text: '👋 Olá, ${welcomeData.userName || welcome.userName || payload.welcome.userName || "Ateliê"}!',
                  color: '#FFFFFF',
                  fontSize: '20dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  maxLines: 1,
                },
                {
                  type: 'Text',
                  text: 'Luisices • ${welcomeData.envLabel || welcome.envLabel || payload.welcome.envLabel || "Teste"}',
                  color: '#E8E0E3',
                  fontSize: '14dp',
                  paddingTop: '4dp',
                  paddingBottom: '12dp',
                  textAlign: 'center',
                },
                {
                  type: 'TouchWrapper',
                  onPress: [{ type: 'SendEvent', arguments: ['intent', 'CreateOrderIntent'] }],
                  item: {
                    type: 'Frame',
                    backgroundColor: '#7B4D50',
                    borderRadius: '16dp',
                    paddingLeft: '16dp',
                    paddingRight: '16dp',
                    paddingTop: '8dp',
                    paddingBottom: '8dp',
                    item: {
                      type: 'Text',
                      text: '🗣️ Criar Pedido',
                      color: '#FFFFFF',
                      fontSize: '14dp',
                      fontWeight: 'bold',
                    },
                  },
                },
              ],
            },
            // Layout Principal para Echo Show e Fire TV (Telas Retangulares / Grandes)
            {
              type: 'Container',
              when: WHEN_IS_RECTANGULAR,
              grow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '32dp',
              paddingRight: '32dp',
              items: [
                {
                  type: 'Text',
                  text: '👋 Olá, ${welcomeData.userName || welcome.userName || payload.welcome.userName || "Ateliê"}!',
                  color: '#FFFFFF',
                  fontSize: '34dp',
                  fontWeight: 'bold',
                },
                {
                  type: 'Text',
                  text: 'O que deseja fazer hoje no ateliê?',
                  color: '#E8E0E3',
                  fontSize: '20dp',
                  paddingTop: '8dp',
                  paddingBottom: '24dp',
                },
                // Ações Rápidas em Pílulas Tocáveis e Navegáveis
                {
                  type: 'Container',
                  direction: 'row',
                  items: [
                    {
                      type: 'TouchWrapper',
                      onPress: [{ type: 'SendEvent', arguments: ['intent', 'CreateOrderIntent'] }],
                      item: {
                        type: 'Frame',
                        backgroundColor: '#7B4D50',
                        borderRadius: '20dp',
                        paddingLeft: '20dp',
                        paddingRight: '20dp',
                        paddingTop: '12dp',
                        paddingBottom: '12dp',
                        marginRight: '16dp',
                        item: {
                          type: 'Text',
                          text: '🗣️ "Criar pedido"',
                          color: '#FFFFFF',
                          fontSize: '18dp',
                          fontWeight: 'bold',
                        },
                      },
                    },
                    {
                      type: 'TouchWrapper',
                      onPress: [{ type: 'SendEvent', arguments: ['intent', 'ListRecentOrdersIntent'] }],
                      item: {
                        type: 'Frame',
                        backgroundColor: '#231C1E',
                        borderColor: 'rgba(235, 205, 205, 0.18)',
                        borderWidth: '1dp',
                        borderRadius: '20dp',
                        paddingLeft: '20dp',
                        paddingRight: '20dp',
                        paddingTop: '12dp',
                        paddingBottom: '12dp',
                        marginRight: '16dp',
                        item: {
                          type: 'Text',
                          text: '📋 "Ver últimos pedidos"',
                          color: '#FFFFFF',
                          fontSize: '18dp',
                          fontWeight: 'bold',
                        },
                      },
                    },
                    {
                      type: 'TouchWrapper',
                      onPress: [{ type: 'SendEvent', arguments: ['intent', 'LinkVoiceIntent'] }],
                      item: {
                        type: 'Frame',
                        backgroundColor: '#231C1E',
                        borderColor: 'rgba(235, 205, 205, 0.18)',
                        borderWidth: '1dp',
                        borderRadius: '20dp',
                        paddingLeft: '20dp',
                        paddingRight: '20dp',
                        paddingTop: '12dp',
                        paddingBottom: '12dp',
                        item: {
                          type: 'Text',
                          text: '🎙️ "Vincular voz"',
                          color: '#FFFFFF',
                          fontSize: '18dp',
                          fontWeight: 'bold',
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const welcomeData = {
    userName,
    envLabel,
  };

  const datasources = {
    welcomeData,
    welcome: welcomeData,
    payload: {
      welcome: welcomeData,
      welcomeData,
      ...welcomeData,
    },
    ...welcomeData,
  };

  return {
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: 'luisicesWelcomeToken',
    document,
    datasources,
  };
}

/**
 * 2. Constrói o documento APL para exibição do Card Interativo de Pedido no Echo Show, Echo Spot e Fire TV.
 * Suporta botões tocáveis [Confirmar] e [Cancelar], vinculação de token/draftId/revision e adaptação circular para Echo Spot.
 */
function buildOrderCardAplDirective({
  draftId = null,
  revision = 1,
  customer = 'Não informado',
  product = 'Produto Personalizado',
  quantity = 1,
  deliveryDate = 'A combinar',
  totalPrice = 'R$ 0,00',
  statusLabel = 'Aguardando Confirmação',
  envLabel = 'Teste',
  imageUrl = null,
  showActions = true,
}) {
  const cleanCustomer = customer || 'Não informado';
  const cleanProduct = product || 'Produto Personalizado';
  const cleanQuantity = Number(quantity) || 1;
  const cleanDelivery = deliveryDate || 'A combinar';
  const cleanTotal = totalPrice || 'R$ 0,00';
  const cleanStatus = statusLabel || 'Aguardando Confirmação';
  const cleanImage = imageUrl || DEFAULT_FALLBACK_IMAGE;

  const document = {
    type: 'APL',
    version: '1.6',
    theme: 'dark',
    import: [
      {
        name: 'alexa-layouts',
        version: '1.4.0',
      },
    ],
    mainTemplate: {
      parameters: ['orderData', 'order', 'payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#161214',
          items: [
            // Cabeçalho Oficial para telas retangulares (Echo Show 5/8/10/15, Fire TV)
            {
              type: 'AlexaHeader',
              when: WHEN_IS_RECTANGULAR,
              headerTitle: 'Luisices • Ateliê Criativo',
              headerSubtitle: `Ambiente de ${envLabel}`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            // Layout Circular para Echo Spot (480x480)
            {
              type: 'Container',
              when: WHEN_IS_ROUND,
              width: '100vw',
              height: '100vh',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '20dp',
              paddingRight: '20dp',
              items: [
                {
                  type: 'Image',
                  source: DEFAULT_BRAND_LOGO,
                  width: '45dp',
                  height: '45dp',
                  scale: 'best-fit',
                  borderRadius: '22dp',
                  paddingBottom: '4dp',
                },
                {
                  type: 'Frame',
                  backgroundColor: '#7B4D50',
                  borderRadius: '6dp',
                  paddingLeft: '8dp',
                  paddingRight: '8dp',
                  paddingTop: '2dp',
                  paddingBottom: '2dp',
                  item: {
                    type: 'Text',
                    text: '${orderData.statusLabel || order.statusLabel || payload.order.statusLabel || "Aguardando"}',
                    color: '#F4B7B9',
                    fontSize: '11dp',
                    fontWeight: 'bold',
                  },
                },
                {
                  type: 'Text',
                  text: '${orderData.quantity || order.quantity || payload.order.quantity || 1}x ${orderData.product || order.product || payload.order.product || "Produto"}',
                  color: '#FFFFFF',
                  fontSize: '16dp',
                  fontWeight: 'bold',
                  maxLines: 1,
                  paddingTop: '4dp',
                  textAlign: 'center',
                },
                {
                  type: 'Text',
                  text: '👤 ${orderData.customer || order.customer || payload.order.customer || "Cliente"}',
                  color: '#E8E0E3',
                  fontSize: '13dp',
                  paddingTop: '2dp',
                  textAlign: 'center',
                },
                {
                  type: 'Text',
                  text: '${orderData.totalPrice || order.totalPrice || payload.order.totalPrice || "R$ 0,00"}',
                  color: '#34D399',
                  fontSize: '18dp',
                  fontWeight: 'bold',
                  paddingTop: '4dp',
                },
                {
                  type: 'Container',
                  direction: 'row',
                  paddingTop: '8dp',
                  when: '${orderData.showActions || order.showActions || payload.order.showActions}',
                  items: [
                    {
                      type: 'TouchWrapper',
                      onPress: [{ type: 'SendEvent', arguments: ['confirmOrder', '${orderData.draftId || order.draftId || payload.order.draftId}', '${orderData.revision || order.revision || payload.order.revision}'] }],
                      item: {
                        type: 'Frame',
                        backgroundColor: '#10B981',
                        borderRadius: '12dp',
                        paddingLeft: '12dp',
                        paddingRight: '12dp',
                        paddingTop: '6dp',
                        paddingBottom: '6dp',
                        marginRight: '8dp',
                        item: {
                          type: 'Text',
                          text: '✅ Confirmar',
                          color: '#FFFFFF',
                          fontSize: '12dp',
                          fontWeight: 'bold',
                        },
                      },
                    },
                    {
                      type: 'TouchWrapper',
                      onPress: [{ type: 'SendEvent', arguments: ['cancelOrder', '${orderData.draftId || order.draftId || payload.order.draftId}', '${orderData.revision || order.revision || payload.order.revision}'] }],
                      item: {
                        type: 'Frame',
                        backgroundColor: '#E58E8E',
                        borderRadius: '12dp',
                        paddingLeft: '12dp',
                        paddingRight: '12dp',
                        paddingTop: '6dp',
                        paddingBottom: '6dp',
                        item: {
                          type: 'Text',
                          text: '❌ Cancelar',
                          color: '#161214',
                          fontSize: '12dp',
                          fontWeight: 'bold',
                        },
                      },
                    },
                  ],
                },
              ],
            },
            // Layout Retangular Padrão Elegante para Echo Show e Fire TV
            {
              type: 'Container',
              when: WHEN_IS_RECTANGULAR,
              direction: 'row',
              grow: 1,
              paddingLeft: '40dp',
              paddingRight: '40dp',
              paddingBottom: '24dp',
              alignItems: 'center',
              justifyContent: 'center',
              spacing: '32dp',
              items: [
                // Coluna Esquerda: Imagem do Produto envolvida em Frame com Fallback Garantido
                {
                  type: 'Frame',
                  borderRadius: '20dp',
                  backgroundColor: '#231C1E',
                  borderColor: 'rgba(235, 205, 205, 0.18)',
                  borderWidth: '1dp',
                  width: '260dp',
                  height: '260dp',
                  padding: '8dp',
                  alignItems: 'center',
                  justifyContent: 'center',
                  item: {
                    type: 'Image',
                    source: '${orderData.imageUrl || order.imageUrl || payload.order.imageUrl || "' + DEFAULT_FALLBACK_IMAGE + '"}',
                    width: '100%',
                    height: '100%',
                    scale: 'best-fit',
                    borderRadius: '14dp',
                  },
                },
                // Coluna Direita: Dados do Pedido + Botões de Toque
                {
                  type: 'Container',
                  grow: 1,
                  maxWidth: '600dp',
                  justifyContent: 'center',
                  items: [
                    // Badge de Status
                    {
                      type: 'Frame',
                      backgroundColor: '#7B4D50',
                      borderRadius: '8dp',
                      paddingLeft: '14dp',
                      paddingRight: '14dp',
                      paddingTop: '4dp',
                      paddingBottom: '4dp',
                      alignSelf: 'start',
                      item: {
                        type: 'Text',
                        text: '${orderData.statusLabel || order.statusLabel || payload.order.statusLabel || "Aguardando Confirmação"}',
                        color: '#F4B7B9',
                        fontSize: '14dp',
                        fontWeight: 'bold',
                      },
                    },
                    // Nome do Produto e Quantidade
                    {
                      type: 'Text',
                      text: '${orderData.quantity || order.quantity || payload.order.quantity || 1}x ${orderData.product || order.product || payload.order.product || "Produto Personalizado"}',
                      color: '#FFFFFF',
                      fontSize: '28dp',
                      fontWeight: 'bold',
                      maxLines: 2,
                      paddingTop: '8dp',
                    },
                    // Cliente
                    {
                      type: 'Text',
                      text: '👤 Cliente: ${orderData.customer || order.customer || payload.order.customer || "A informar"}',
                      color: '#E8E0E3',
                      fontSize: '20dp',
                      paddingTop: '8dp',
                    },
                    // Data de Entrega
                    {
                      type: 'Text',
                      text: '📅 Entrega: ${orderData.deliveryDate || order.deliveryDate || payload.order.deliveryDate || "A combinar"}',
                      color: '#C9C0B8',
                      fontSize: '18dp',
                      paddingTop: '6dp',
                    },
                    // Valor Total em Destaque
                    {
                      type: 'Text',
                      text: '💰 Total: ${orderData.totalPrice || order.totalPrice || payload.order.totalPrice || "A calcular"}',
                      color: '#34D399',
                      fontSize: '28dp',
                      fontWeight: 'bold',
                      paddingTop: '10dp',
                    },
                    // Botões de Ação quando em confirmação ativa
                    {
                      type: 'Container',
                      direction: 'row',
                      paddingTop: '16dp',
                      when: '${orderData.showActions || order.showActions || payload.order.showActions}',
                      spacing: '16dp',
                      items: [
                        {
                          type: 'AlexaButton',
                          buttonText: '✅ Confirmar',
                          primaryAction: [
                            { type: 'SendEvent', arguments: ['confirmOrder', '${orderData.draftId || order.draftId || payload.order.draftId}', '${orderData.revision || order.revision || payload.order.revision}'] }
                          ]
                        },
                        {
                          type: 'AlexaButton',
                          buttonText: '❌ Cancelar',
                          buttonStyle: 'outlined',
                          primaryAction: [
                            { type: 'SendEvent', arguments: ['cancelOrder', '${orderData.draftId || order.draftId || payload.order.draftId}', '${orderData.revision || order.revision || payload.order.revision}'] }
                          ]
                        }
                      ]
                    },
                    // Dica informativa quando ainda preenchendo dados
                    {
                      type: 'Text',
                      when: '${!(orderData.showActions || order.showActions || payload.order.showActions)}',
                      text: '🎙️ Fale os dados pendentes ou diga o que deseja corrigir',
                      color: '#C9C0B8',
                      fontSize: '15dp',
                      paddingTop: '12dp',
                    }
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const token = draftId ? `luisicesOrderToken_${draftId}_${revision || 1}` : 'luisicesOrderToken';

  const orderData = {
    draftId: draftId || '',
    revision: revision || 1,
    customer: cleanCustomer,
    product: cleanProduct,
    quantity: cleanQuantity,
    deliveryDate: cleanDelivery,
    totalPrice: cleanTotal,
    statusLabel: cleanStatus,
    envLabel,
    imageUrl: cleanImage,
    showActions: Boolean(showActions),
  };

  const datasources = {
    orderData,
    order: orderData,
    payload: {
      order: orderData,
      orderData,
      ...orderData,
    },
    ...orderData,
  };

  return {
    type: 'Alexa.Presentation.APL.RenderDocument',
    token,
    document,
    datasources,
  };
}

/**
 * 3. Constrói o documento APL de Celebração de Sucesso (Order Success).
 * Layout Widescreen equilibrado para TV (16:9) e Echo Show, eliminando colunas vazias.
 */
function buildOrderSuccessAplDirective({
  orderNumber = '0',
  customer = '',
  product = '',
  quantity = 1,
  totalPrice = '',
  deliveryDate = '',
  envLabel = 'Teste',
}) {
  const hasNumber = Boolean(orderNumber && String(orderNumber).replace(/^#+/, '').trim());
  const cleanOrderNumber = hasNumber ? String(orderNumber).replace(/^#+/, '').trim() : '';
  const orderHeading = hasNumber ? `Pedido #${cleanOrderNumber} Registrado!` : 'Pedido Confirmado!';
  const cleanCustomer = customer || 'Cliente';
  const cleanProduct = product || 'Produto Personalizado';
  const cleanQuantity = Number(quantity) || 1;
  const cleanTotal = totalPrice || 'R$ 0,00';
  const cleanDelivery = deliveryDate || '';

  const document = {
    type: 'APL',
    version: '1.6',
    theme: 'dark',
    import: [{ name: 'alexa-layouts', version: '1.4.0' }],
    mainTemplate: {
      parameters: ['successData', 'success', 'payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#161214',
          items: [
            // Cabeçalho Oficial para telas retangulares (Echo Show, Fire TV)
            {
              type: 'AlexaHeader',
              when: WHEN_IS_RECTANGULAR,
              headerTitle: 'Luisices • Ateliê Criativo',
              headerSubtitle: `Ambiente de ${envLabel} • Pedido Confirmado`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            // Layout Circular para Echo Spot (480x480)
            {
              type: 'Container',
              when: WHEN_IS_ROUND,
              width: '100vw',
              height: '100vh',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '24dp',
              paddingRight: '24dp',
              items: [
                {
                  type: 'Text',
                  text: '🎉',
                  fontSize: '36dp',
                },
                {
                  type: 'Text',
                  text: '${successData.orderHeading || success.orderHeading || payload.success.orderHeading || "Pedido Confirmado!"}',
                  color: '#34D399',
                  fontSize: '18dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  paddingTop: '6dp',
                },
                {
                  type: 'Text',
                  text: '${successData.quantity || success.quantity || payload.success.quantity || 1}x ${successData.product || success.product || payload.success.product || "Produto"}',
                  color: '#FFFFFF',
                  fontSize: '14dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  maxLines: 1,
                  paddingTop: '4dp',
                },
                {
                  type: 'Text',
                  text: '👤 ${successData.customer || success.customer || payload.success.customer || "Cliente"}',
                  color: '#E8E0E3',
                  fontSize: '13dp',
                  textAlign: 'center',
                  paddingTop: '2dp',
                },
                {
                  type: 'Text',
                  text: 'Total: ${successData.totalPrice || success.totalPrice || payload.success.totalPrice || "R$ 0,00"}',
                  color: '#34D399',
                  fontSize: '16dp',
                  fontWeight: 'bold',
                  paddingTop: '4dp',
                },
              ],
            },
            // Layout Widescreen Equilibrado para Echo Show e Fire TV (Duas Colunas Harmoniosas)
            {
              type: 'Container',
              when: WHEN_IS_RECTANGULAR,
              direction: 'row',
              grow: 1,
              paddingLeft: '48dp',
              paddingRight: '48dp',
              paddingBottom: '24dp',
              alignItems: 'center',
              justifyContent: 'center',
              spacing: '24dp',
              items: [
                // Painel Esquerdo: Celebração, Badge e Sincronização
                {
                  type: 'Frame',
                  backgroundColor: '#231C1E',
                  borderColor: 'rgba(235, 205, 205, 0.18)',
                  borderWidth: '1dp',
                  borderRadius: '24dp',
                  padding: '28dp',
                  width: '360dp',
                  alignItems: 'center',
                  item: {
                    type: 'Container',
                    alignItems: 'center',
                    items: [
                      {
                        type: 'Text',
                        text: '🎉',
                        fontSize: '52dp',
                      },
                      {
                        type: 'Frame',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderColor: '#10B981',
                        borderWidth: '1dp',
                        borderRadius: '12dp',
                        paddingLeft: '16dp',
                        paddingRight: '16dp',
                        paddingTop: '4dp',
                        paddingBottom: '4dp',
                        marginTop: '10dp',
                        item: {
                          type: 'Text',
                          text: '✅ Pedido Confirmado',
                          color: '#34D399',
                          fontSize: '15dp',
                          fontWeight: 'bold',
                        },
                      },
                      {
                        type: 'Text',
                        text: '${successData.orderHeading || success.orderHeading || payload.success.orderHeading || "Pedido Confirmado!"}',
                        color: '#FFFFFF',
                        fontSize: '22dp',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        paddingTop: '12dp',
                      },
                      {
                        type: 'Text',
                        text: '✨ Sincronizado no quadro de produção do Luisices',
                        color: '#C9C0B8',
                        fontSize: '13dp',
                        paddingTop: '10dp',
                        textAlign: 'center',
                      },
                    ],
                  },
                },
                // Painel Direito: Resumo Completo e Elegante dos Dados do Pedido
                {
                  type: 'Frame',
                  backgroundColor: '#231C1E',
                  borderColor: 'rgba(235, 205, 205, 0.18)',
                  borderWidth: '1dp',
                  borderRadius: '24dp',
                  paddingLeft: '36dp',
                  paddingRight: '36dp',
                  paddingTop: '28dp',
                  paddingBottom: '28dp',
                  grow: 1,
                  maxWidth: '560dp',
                  item: {
                    type: 'Container',
                    items: [
                      {
                        type: 'Text',
                        text: '${successData.quantity || success.quantity || payload.success.quantity || 1}x ${successData.product || success.product || payload.success.product || "Produto Personalizado"}',
                        color: '#F4B7B9',
                        fontSize: '28dp',
                        fontWeight: 'bold',
                        maxLines: 2,
                      },
                      {
                        type: 'Text',
                        text: '👤 Cliente: ${successData.customer || success.customer || payload.success.customer || "Cliente"}',
                        color: '#FFFFFF',
                        fontSize: '20dp',
                        paddingTop: '12dp',
                      },
                      {
                        type: 'Text',
                        text: '📅 Entrega: ${successData.deliveryDate || success.deliveryDate || payload.success.deliveryDate || ""}',
                        color: '#E8E0E3',
                        fontSize: '18dp',
                        paddingTop: '8dp',
                        when: '${(successData.deliveryDate || success.deliveryDate || payload.success.deliveryDate || "") != ""}',
                      },
                      {
                        type: 'Text',
                        text: '💰 Total: ${successData.totalPrice || success.totalPrice || payload.success.totalPrice || "R$ 0,00"}',
                        color: '#34D399',
                        fontSize: '28dp',
                        fontWeight: 'bold',
                        paddingTop: '14dp',
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const successData = {
    orderHeading,
    orderNumber: cleanOrderNumber,
    customer: cleanCustomer,
    product: cleanProduct,
    quantity: cleanQuantity,
    totalPrice: cleanTotal,
    deliveryDate: cleanDelivery,
    envLabel,
  };

  const datasources = {
    successData,
    success: successData,
    payload: {
      success: successData,
      successData,
      ...successData,
    },
    ...successData,
  };

  return {
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: 'luisicesSuccessToken',
    document,
    datasources,
  };
}

/**
 * 4. Constrói o documento APL para Seleção Visual de Sugestões Fuzzy (Fuzzy Suggestions Picker).
 */
function buildFuzzySuggestionsAplDirective({ spokenProduct = '', suggestions = [], envLabel = 'Teste' }) {
  const document = {
    type: 'APL',
    version: '1.6',
    theme: 'dark',
    import: [{ name: 'alexa-layouts', version: '1.4.0' }],
    mainTemplate: {
      parameters: ['suggestionsData', 'suggestions', 'payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#161214',
          items: [
            // Cabeçalho Oficial para telas retangulares (Echo Show 5/8/10/15, Fire TV)
            {
              type: 'AlexaHeader',
              when: WHEN_IS_RECTANGULAR,
              headerTitle: 'Luisices • Sugestões de Produtos',
              headerSubtitle: `Não encontramos "${spokenProduct}"`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            // Layout Circular para Echo Spot (480x480)
            {
              type: 'Container',
              when: WHEN_IS_ROUND,
              width: '100vw',
              height: '100vh',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '20dp',
              paddingRight: '20dp',
              items: [
                {
                  type: 'Image',
                  source: DEFAULT_BRAND_LOGO,
                  width: '40dp',
                  height: '40dp',
                  scale: 'best-fit',
                  borderRadius: '20dp',
                  paddingBottom: '4dp',
                },
                {
                  type: 'Text',
                  text: 'Sugestões no Ateliê',
                  color: '#FFFFFF',
                  fontSize: '15dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                },
                {
                  type: 'Text',
                  text: 'Toque para escolher:',
                  color: '#E8E0E3',
                  fontSize: '12dp',
                  paddingBottom: '8dp',
                  textAlign: 'center',
                },
                {
                  type: 'Container',
                  items: suggestions.slice(0, 2).map((sug) => ({
                    type: 'TouchWrapper',
                    onPress: [{ type: 'SendEvent', arguments: ['selectProduct', sug.name] }],
                    item: {
                      type: 'Frame',
                      backgroundColor: '#231C1E',
                      borderColor: 'rgba(235, 205, 205, 0.18)',
                      borderWidth: '1dp',
                      borderRadius: '12dp',
                      paddingLeft: '12dp',
                      paddingRight: '12dp',
                      paddingTop: '6dp',
                      paddingBottom: '6dp',
                      marginBottom: '6dp',
                      width: '280dp',
                      item: {
                        type: 'Container',
                        alignItems: 'center',
                        items: [
                          {
                            type: 'Text',
                            text: sug.name,
                            color: '#FFFFFF',
                            fontSize: '13dp',
                            fontWeight: 'bold',
                            maxLines: 1,
                          },
                          {
                            type: 'Text',
                            text: sug.unitPrice ? `R$ ${sug.unitPrice.toFixed(2)} cada` : 'Catálogo',
                            color: '#34D399',
                            fontSize: '11dp',
                            paddingTop: '2dp',
                          },
                        ],
                      },
                    },
                  })),
                },
              ],
            },
            // Layout Retangular para Echo Show e Fire TV (Telas Grandes)
            {
              type: 'Container',
              when: WHEN_IS_RECTANGULAR,
              grow: 1,
              paddingLeft: '32dp',
              paddingRight: '32dp',
              paddingBottom: '24dp',
              alignItems: 'center',
              justifyContent: 'center',
              items: [
                {
                  type: 'Text',
                  text: `Não encontramos "${spokenProduct}". Você quis dizer:`,
                  color: '#E8E0E3',
                  fontSize: '22dp',
                  paddingBottom: '24dp',
                  textAlign: 'center',
                },
                {
                  type: 'Container',
                  direction: 'row',
                  spacing: '24dp',
                  items: suggestions.map((sug) => ({
                    type: 'TouchWrapper',
                    onPress: [{ type: 'SendEvent', arguments: ['selectProduct', sug.name] }],
                    item: {
                      type: 'Frame',
                      backgroundColor: '#231C1E',
                      borderColor: 'rgba(235, 205, 205, 0.18)',
                      borderWidth: '1dp',
                      borderRadius: '20dp',
                      padding: '24dp',
                      width: '380dp',
                      item: {
                        type: 'Container',
                        alignItems: 'center',
                        items: [
                          {
                            type: 'Image',
                            source: DEFAULT_FALLBACK_IMAGE,
                            width: '120dp',
                            height: '120dp',
                            scale: 'best-fit',
                            borderRadius: '12dp',
                          },
                          {
                            type: 'Text',
                            text: sug.name,
                            color: '#FFFFFF',
                            fontSize: '22dp',
                            fontWeight: 'bold',
                            paddingTop: '12dp',
                            textAlign: 'center',
                          },
                          {
                            type: 'Text',
                            text: sug.unitPrice ? `R$ ${sug.unitPrice.toFixed(2)} cada` : 'Catálogo',
                            color: '#34D399',
                            fontSize: '18dp',
                            paddingTop: '6dp',
                          },
                        ],
                      },
                    },
                  })),
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const suggestionsData = {
    spokenProduct,
    suggestions,
    envLabel,
  };

  const datasources = {
    suggestionsData,
    suggestions: suggestionsData,
    payload: {
      spokenProduct,
      suggestions,
      envLabel,
      suggestionsData,
    },
    ...suggestionsData,
  };

  return {
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: 'luisicesSuggestionsToken',
    document,
    datasources,
  };
}

/**
 * 5. Constrói o documento APL de Vinculação de Voz com Código Gigante & QR Code (Voice Pairing).
 */
function buildVoicePairingAplDirective({ pairingCode = '000000', qrCodeUrl = null, envLabel = 'Teste' }) {
  const rawCode = String(pairingCode || '').trim();
  const formattedCode = rawCode.length === 8
    ? `${rawCode.slice(0, 4)} ${rawCode.slice(4)}`
    : rawCode.length === 6
      ? `${rawCode.slice(0, 3)} ${rawCode.slice(3)}`
      : rawCode;

  const document = {
    type: 'APL',
    version: '1.6',
    theme: 'dark',
    import: [{ name: 'alexa-layouts', version: '1.4.0' }],
    mainTemplate: {
      parameters: ['pairingData', 'pairing', 'payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#161214',
          items: [
            // Cabeçalho Oficial para telas retangulares (Echo Show 5/8/10/15, Fire TV)
            {
              type: 'AlexaHeader',
              when: WHEN_IS_RECTANGULAR,
              headerTitle: 'Luisices • Vincular Voz',
              headerSubtitle: `Ambiente de ${envLabel}`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            // Layout Circular para Echo Spot (480x480)
            {
              type: 'Container',
              when: WHEN_IS_ROUND,
              width: '100vw',
              height: '100vh',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '24dp',
              paddingRight: '24dp',
              items: [
                {
                  type: 'Image',
                  source: DEFAULT_BRAND_LOGO,
                  width: '44dp',
                  height: '44dp',
                  scale: 'best-fit',
                  borderRadius: '22dp',
                  paddingBottom: '4dp',
                },
                {
                  type: 'Text',
                  text: 'Código de Pareamento:',
                  color: '#E8E0E3',
                  fontSize: '14dp',
                  textAlign: 'center',
                },
                {
                  type: 'Frame',
                  backgroundColor: '#231C1E',
                  borderColor: 'rgba(235, 205, 205, 0.18)',
                  borderWidth: '1dp',
                  borderRadius: '12dp',
                  paddingLeft: '18dp',
                  paddingRight: '18dp',
                  paddingTop: '8dp',
                  paddingBottom: '8dp',
                  marginTop: '6dp',
                  marginBottom: '6dp',
                  item: {
                    type: 'Text',
                    text: '${pairingData.formattedCode || pairing.formattedCode || payload.pairing.formattedCode || "' + formattedCode + '"}',
                    color: '#FFFFFF',
                    fontSize: '32dp',
                    fontWeight: 'bold',
                    letterSpacing: '4dp',
                  },
                },
                {
                  type: 'Text',
                  text: 'Informe no app Luisices',
                  color: '#C9C0B8',
                  fontSize: '12dp',
                  textAlign: 'center',
                },
              ],
            },
            // Layout Retangular para Echo Show e Fire TV (Telas Grandes)
            {
              type: 'Container',
              when: WHEN_IS_RECTANGULAR,
              direction: 'row',
              grow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '48dp',
              paddingRight: '48dp',
              items: [
                // Coluna Esquerda: Código Numérico Gigante
                {
                  type: 'Container',
                  grow: 1,
                  items: [
                    {
                      type: 'Text',
                      text: 'Seu Código de Pareamento:',
                      color: '#E8E0E3',
                      fontSize: '22dp',
                    },
                    {
                      type: 'Frame',
                      backgroundColor: '#231C1E',
                      borderColor: 'rgba(235, 205, 205, 0.18)',
                      borderWidth: '1dp',
                      borderRadius: '16dp',
                      paddingLeft: '28dp',
                      paddingRight: '28dp',
                      paddingTop: '14dp',
                      paddingBottom: '14dp',
                      marginTop: '12dp',
                      marginBottom: '12dp',
                      alignSelf: 'start',
                      item: {
                        type: 'Text',
                        text: '${pairingData.formattedCode || pairing.formattedCode || payload.pairing.formattedCode || "' + formattedCode + '"}',
                        color: '#FFFFFF',
                        fontSize: '48dp',
                        fontWeight: 'bold',
                        letterSpacing: '8dp',
                      },
                    },
                    {
                      type: 'Text',
                      text: 'Acesse o aplicativo Luisices > Ajustes > Integração Alexa e informe este código para autorizar.',
                      color: '#C9C0B8',
                      fontSize: '16dp',
                      maxLines: 2,
                    },
                  ],
                },
                // Coluna Direita: QR Code
                {
                  type: 'Container',
                  alignItems: 'center',
                  paddingLeft: '32dp',
                  items: [
                    {
                      type: 'Frame',
                      borderRadius: '12dp',
                      backgroundColor: '#FFFFFF',
                      paddingLeft: '4dp',
                      paddingRight: '4dp',
                      paddingTop: '4dp',
                      paddingBottom: '4dp',
                      item: {
                        type: 'Image',
                        source: '${pairingData.qrCodeUrl || pairing.qrCodeUrl || payload.pairing.qrCodeUrl || "' + (qrCodeUrl || DEFAULT_QR_PLACEHOLDER) + '"}',
                        width: '200dp',
                        height: '200dp',
                        scale: 'best-fit',
                        borderRadius: '10dp',
                      },
                    },
                    {
                      type: 'Text',
                      text: 'Escaneie com a câmera',
                      color: '#E8E0E3',
                      fontSize: '14dp',
                      paddingTop: '8dp',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const pairingData = {
    pairingCode: rawCode,
    formattedCode,
    qrCodeUrl: qrCodeUrl || DEFAULT_QR_PLACEHOLDER,
    envLabel,
  };

  const datasources = {
    pairingData,
    pairing: pairingData,
    payload: {
      pairing: pairingData,
      pairingData,
      ...pairingData,
    },
    ...pairingData,
  };

  return {
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: 'luisicesPairingToken',
    document,
    datasources,
  };
}

module.exports = {
  supportsApl,
  getAplStyles,
  buildWelcomeAplDirective,
  buildOrderCardAplDirective,
  buildOrderSuccessAplDirective,
  buildFuzzySuggestionsAplDirective,
  buildVoicePairingAplDirective,
};
