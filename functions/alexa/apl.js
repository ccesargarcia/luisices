/**
 * Módulo de Apresentação Visual da Alexa (Alexa Presentation Language - APL 1.6+).
 * Design System oficial do Luisices para dispositivos com tela (Echo Show 5/8/10/15, Echo Spot e Fire TV).
 * Inclui layouts responsivos, suporte a telas circulares (Echo Spot), Glassmorphism, e botões interativos por toque.
 */

const DEFAULT_BRAND_LOGO = 'https://cdn.luisices.com.br/logo.png';
const DEFAULT_FALLBACK_IMAGE = 'https://cdn.luisices.com.br/placeholder-product.png';
const DEFAULT_QR_PLACEHOLDER = 'https://cdn.luisices.com.br/qr-pairing-placeholder.png';

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
      bgMain: '#1E1B2E',
      bgCard: '#28223B',
      bgGlass: 'rgba(40, 34, 59, 0.85)',
      borderGlass: 'rgba(255, 255, 255, 0.12)',
      primaryPurple: '#7C3AED',
      primaryPurpleLight: '#9333EA',
      accentGreen: '#10B981',
      accentGreenLight: '#34D399',
      accentAmber: '#F59E0B',
      accentCoral: '#EF4444',
      textPrimary: '#FFFFFF',
      textSecondary: '#D8B4FE',
      textMuted: '#9CA3AF',
    },
  };
}

/**
 * 1. Constrói o documento APL de Boas-Vindas no Echo Show e Echo Spot (LaunchRequest).
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
      parameters: ['payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1E1B2E',
          items: [
            // Cabeçalho (Oculto em telas redondas compactas como Echo Spot)
            {
              type: 'AlexaHeader',
              when: "${viewport.shape != 'round'}",
              headerTitle: 'Luisices • Ateliê Criativo',
              headerSubtitle: `Ambiente de ${envLabel}`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            // Layout Especial Circular para Echo Spot (480x480)
            {
              type: 'Container',
              when: "${viewport.shape == 'round'}",
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
                  paddingBottom: '8dp',
                },
                {
                  type: 'Text',
                  text: '👋 Olá, ${payload.welcome.userName}!',
                  color: '#FFFFFF',
                  fontSize: '20dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                },
                {
                  type: 'Text',
                  text: 'Luisices • ${payload.welcome.envLabel}',
                  color: '#D8B4FE',
                  fontSize: '14dp',
                  paddingTop: '4dp',
                  paddingBottom: '12dp',
                  textAlign: 'center',
                },
                {
                  type: 'TouchWrapper',
                  onPress: [{ type: 'SendEvent', arguments: ['intent', 'CreateOrderIntent'] }],
                  items: [
                    {
                      type: 'Container',
                      backgroundColor: '#7C3AED',
                      borderRadius: '16dp',
                      paddingLeft: '16dp',
                      paddingRight: '16dp',
                      paddingTop: '8dp',
                      paddingBottom: '8dp',
                      items: [
                        {
                          type: 'Text',
                          text: '🗣️ Criar Pedido',
                          color: '#FFFFFF',
                          fontSize: '14dp',
                          fontWeight: 'bold',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            // Layout Principal para Echo Show (Telas Retangulares / Grandes)
            {
              type: 'Container',
              when: "${viewport.shape != 'round'}",
              grow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '32dp',
              paddingRight: '32dp',
              items: [
                {
                  type: 'Text',
                  text: '👋 Olá, ${payload.welcome.userName}!',
                  color: '#FFFFFF',
                  fontSize: '32dp',
                  fontWeight: 'bold',
                },
                {
                  type: 'Text',
                  text: 'O que deseja fazer hoje no ateliê?',
                  color: '#D8B4FE',
                  fontSize: '20dp',
                  paddingTop: '8dp',
                  paddingBottom: '24dp',
                },
                // Ações Rápidas em Pílulas Tocáveis
                {
                  type: 'Container',
                  direction: 'row',
                  items: [
                    {
                      type: 'TouchWrapper',
                      onPress: [{ type: 'SendEvent', arguments: ['intent', 'CreateOrderIntent'] }],
                      items: [
                        {
                          type: 'Container',
                          backgroundColor: '#7C3AED',
                          borderRadius: '20dp',
                          paddingLeft: '20dp',
                          paddingRight: '20dp',
                          paddingTop: '12dp',
                          paddingBottom: '12dp',
                          marginRight: '16dp',
                          items: [
                            {
                              type: 'Text',
                              text: '🗣️ "Criar pedido"',
                              color: '#FFFFFF',
                              fontSize: '18dp',
                              fontWeight: 'bold',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'TouchWrapper',
                      onPress: [{ type: 'SendEvent', arguments: ['intent', 'RecentOrdersIntent'] }],
                      items: [
                        {
                          type: 'Container',
                          backgroundColor: '#374151',
                          borderRadius: '20dp',
                          paddingLeft: '20dp',
                          paddingRight: '20dp',
                          paddingTop: '12dp',
                          paddingBottom: '12dp',
                          marginRight: '16dp',
                          items: [
                            {
                              type: 'Text',
                              text: '📋 "Ver últimos pedidos"',
                              color: '#FFFFFF',
                              fontSize: '18dp',
                              fontWeight: 'bold',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'TouchWrapper',
                      onPress: [{ type: 'SendEvent', arguments: ['intent', 'LinkVoiceIntent'] }],
                      items: [
                        {
                          type: 'Container',
                          backgroundColor: '#374151',
                          borderRadius: '20dp',
                          paddingLeft: '20dp',
                          paddingRight: '20dp',
                          paddingTop: '12dp',
                          paddingBottom: '12dp',
                          items: [
                            {
                              type: 'Text',
                              text: '🎙️ "Vincular voz"',
                              color: '#FFFFFF',
                              fontSize: '18dp',
                              fontWeight: 'bold',
                            },
                          ],
                        },
                      ],
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

  const datasources = {
    payload: {
      welcome: {
        userName,
        envLabel,
      },
    },
  };

  return {
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: 'luisicesWelcomeToken',
    document,
    datasources,
  };
}

/**
 * 2. Constrói o documento APL para exibição do Card Interativo de Pedido no Echo Show e Echo Spot.
 * Suporta botões tocáveis [Confirmar] e [Cancelar] e adaptação circular para Echo Spot.
 */
function buildOrderCardAplDirective({
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
      parameters: ['payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1E1B2E',
          items: [
            // Cabeçalho (Oculto em telas redondas como Echo Spot)
            {
              type: 'AlexaHeader',
              when: "${viewport.shape != 'round'}",
              headerTitle: 'Luisices • Ateliê Criativo',
              headerSubtitle: `Ambiente de ${envLabel}`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            // Layout Circular para Echo Spot (480x480)
            {
              type: 'Container',
              when: "${viewport.shape == 'round'}",
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
                  paddingBottom: '4dp',
                },
                {
                  type: 'Container',
                  backgroundColor: '#5B21B6',
                  borderRadius: '6dp',
                  paddingLeft: '8dp',
                  paddingRight: '8dp',
                  paddingTop: '2dp',
                  paddingBottom: '2dp',
                  items: [
                    {
                      type: 'Text',
                      text: '${payload.order.statusLabel}',
                      color: '#F3E8FF',
                      fontSize: '11dp',
                      fontWeight: 'bold',
                    },
                  ],
                },
                {
                  type: 'Text',
                  text: '${payload.order.quantity}x ${payload.order.product}',
                  color: '#FFFFFF',
                  fontSize: '16dp',
                  fontWeight: 'bold',
                  maxLines: 1,
                  paddingTop: '4dp',
                  textAlign: 'center',
                },
                {
                  type: 'Text',
                  text: '👤 ${payload.order.customer}',
                  color: '#D8B4FE',
                  fontSize: '13dp',
                  paddingTop: '2dp',
                  textAlign: 'center',
                },
                {
                  type: 'Text',
                  text: '${payload.order.totalPrice}',
                  color: '#34D399',
                  fontSize: '18dp',
                  fontWeight: 'bold',
                  paddingTop: '4dp',
                },
                {
                  type: 'Container',
                  direction: 'row',
                  paddingTop: '8dp',
                  when: '${payload.order.showActions}',
                  items: [
                    {
                      type: 'TouchWrapper',
                      onPress: [{ type: 'SendEvent', arguments: ['confirmOrder'] }],
                      items: [
                        {
                          type: 'Container',
                          backgroundColor: '#10B981',
                          borderRadius: '12dp',
                          paddingLeft: '12dp',
                          paddingRight: '12dp',
                          paddingTop: '6dp',
                          paddingBottom: '6dp',
                          marginRight: '8dp',
                          items: [
                            {
                              type: 'Text',
                              text: '✅ Confirmar',
                              color: '#FFFFFF',
                              fontSize: '12dp',
                              fontWeight: 'bold',
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'TouchWrapper',
                      onPress: [{ type: 'SendEvent', arguments: ['cancelOrder'] }],
                      items: [
                        {
                          type: 'Container',
                          backgroundColor: '#EF4444',
                          borderRadius: '12dp',
                          paddingLeft: '12dp',
                          paddingRight: '12dp',
                          paddingTop: '6dp',
                          paddingBottom: '6dp',
                          items: [
                            {
                              type: 'Text',
                              text: '❌ Cancelar',
                              color: '#FFFFFF',
                              fontSize: '12dp',
                              fontWeight: 'bold',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            // Layout Retangular Padrão para Echo Show 5 / 8 / 10 / 15
            {
              type: 'Container',
              when: "${viewport.shape != 'round'}",
              direction: 'row',
              grow: 1,
              paddingLeft: '32dp',
              paddingRight: '32dp',
              paddingBottom: '24dp',
              alignItems: 'center',
              justifyContent: 'center',
              items: [
                // Coluna Esquerda: Imagem do Produto
                {
                  type: 'Image',
                  source: '${payload.order.imageUrl}',
                  width: '260dp',
                  height: '260dp',
                  scale: 'best-fit',
                  borderRadius: '16dp',
                  backgroundColor: '#2A2438',
                  overlayColor: 'rgba(0,0,0,0.1)',
                },
                // Coluna Direita: Dados do Pedido + Botões de Toque
                {
                  type: 'Container',
                  grow: 1,
                  paddingLeft: '32dp',
                  justifyContent: 'center',
                  items: [
                    // Badge de Status
                    {
                      type: 'Container',
                      backgroundColor: '#5B21B6',
                      borderRadius: '8dp',
                      paddingLeft: '12dp',
                      paddingRight: '12dp',
                      paddingTop: '4dp',
                      paddingBottom: '4dp',
                      alignSelf: 'start',
                      items: [
                        {
                          type: 'Text',
                          text: '${payload.order.statusLabel}',
                          color: '#F3E8FF',
                          fontSize: '14dp',
                          fontWeight: 'bold',
                        },
                      ],
                    },
                    // Nome do Produto e Quantidade
                    {
                      type: 'Text',
                      text: '${payload.order.quantity}x ${payload.order.product}',
                      color: '#FFFFFF',
                      fontSize: '28dp',
                      fontWeight: 'bold',
                      maxLines: 2,
                      paddingTop: '8dp',
                    },
                    // Cliente
                    {
                      type: 'Text',
                      text: '👤 Cliente: ${payload.order.customer}',
                      color: '#D8B4FE',
                      fontSize: '20dp',
                      paddingTop: '6dp',
                    },
                    // Data de Entrega
                    {
                      type: 'Text',
                      text: '📅 Entrega: ${payload.order.deliveryDate}',
                      color: '#E9D5FF',
                      fontSize: '18dp',
                      paddingTop: '4dp',
                    },
                    // Valor Total em Destaque
                    {
                      type: 'Text',
                      text: '💰 Total: ${payload.order.totalPrice}',
                      color: '#34D399',
                      fontSize: '26dp',
                      fontWeight: 'bold',
                      paddingTop: '8dp',
                    },
                    // Botões Interativos de Confirmação por Toque
                    {
                      type: 'Container',
                      direction: 'row',
                      paddingTop: '16dp',
                      when: '${payload.order.showActions}',
                      items: [
                        {
                          type: 'TouchWrapper',
                          onPress: [{ type: 'SendEvent', arguments: ['confirmOrder'] }],
                          items: [
                            {
                              type: 'Container',
                              backgroundColor: '#10B981',
                              borderRadius: '16dp',
                              paddingLeft: '24dp',
                              paddingRight: '24dp',
                              paddingTop: '10dp',
                              paddingBottom: '10dp',
                              marginRight: '16dp',
                              items: [
                                {
                                  type: 'Text',
                                  text: '✅ Confirmar Pedido',
                                  color: '#FFFFFF',
                                  fontSize: '16dp',
                                  fontWeight: 'bold',
                                },
                              ],
                            },
                          ],
                        },
                        {
                          type: 'TouchWrapper',
                          onPress: [{ type: 'SendEvent', arguments: ['cancelOrder'] }],
                          items: [
                            {
                              type: 'Container',
                              backgroundColor: '#374151',
                              borderRadius: '16dp',
                              paddingLeft: '20dp',
                              paddingRight: '20dp',
                              paddingTop: '10dp',
                              paddingBottom: '10dp',
                              items: [
                                {
                                  type: 'Text',
                                  text: '❌ Cancelar',
                                  color: '#E5E7EB',
                                  fontSize: '16dp',
                                  fontWeight: 'bold',
                                },
                              ],
                            },
                          ],
                        },
                      ],
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

  const datasources = {
    payload: {
      order: {
        customer,
        product,
        quantity,
        deliveryDate,
        totalPrice,
        statusLabel,
        envLabel,
        imageUrl: imageUrl || DEFAULT_FALLBACK_IMAGE,
        showActions: Boolean(showActions),
      },
    },
  };

  return {
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: 'luisicesOrderToken',
    document,
    datasources,
  };
}

/**
 * 3. Constrói o documento APL de Celebração de Sucesso (Order Success).
 */
function buildOrderSuccessAplDirective({
  orderNumber = '0',
  customer = '',
  product = '',
  quantity = 1,
  totalPrice = '',
  envLabel = 'Teste',
}) {
  const document = {
    type: 'APL',
    version: '1.6',
    theme: 'dark',
    import: [{ name: 'alexa-layouts', version: '1.4.0' }],
    mainTemplate: {
      parameters: ['payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1E1B2E',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: '32dp',
          paddingRight: '32dp',
          items: [
            {
              type: 'Text',
              text: '🎉',
              fontSize: '48dp',
            },
            {
              type: 'Text',
              text: 'Pedido #${payload.success.orderNumber} Registrado!',
              color: '#34D399',
              fontSize: '32dp',
              fontWeight: 'bold',
              paddingTop: '12dp',
            },
            {
              type: 'Text',
              text: '${payload.success.quantity}x ${payload.success.product} para ${payload.success.customer}',
              color: '#FFFFFF',
              fontSize: '22dp',
              paddingTop: '8dp',
            },
            {
              type: 'Text',
              text: 'Total: ${payload.success.totalPrice} • Sincronizado no quadro de produção',
              color: '#D8B4FE',
              fontSize: '18dp',
              paddingTop: '6dp',
            },
          ],
        },
      ],
    },
  };

  const datasources = {
    payload: {
      success: {
        orderNumber,
        customer,
        product,
        quantity,
        totalPrice,
        envLabel,
      },
    },
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
      parameters: ['payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1E1B2E',
          paddingLeft: '32dp',
          paddingRight: '32dp',
          paddingTop: '24dp',
          items: [
            {
              type: 'AlexaHeader',
              headerTitle: 'Luisices • Sugestões de Produtos',
              headerSubtitle: `Não encontramos "${spokenProduct}"`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            {
              type: 'Text',
              text: 'Toque ou diga o produto desejado:',
              color: '#D8B4FE',
              fontSize: '20dp',
              paddingBottom: '20dp',
            },
            {
              type: 'Container',
              direction: 'row',
              justifyContent: 'center',
              items: suggestions.slice(0, 2).map((sug, idx) => ({
                type: 'TouchWrapper',
                onPress: [{ type: 'SendEvent', arguments: ['selectProduct', sug.name] }],
                items: [
                  {
                    type: 'Container',
                    backgroundColor: '#28223B',
                    borderRadius: '16dp',
                    paddingLeft: '24dp',
                    paddingRight: '24dp',
                    paddingTop: '20dp',
                    paddingBottom: '20dp',
                    marginRight: idx === 0 ? '24dp' : '0dp',
                    width: '380dp',
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
                ],
              })),
            },
          ],
        },
      ],
    },
  };

  const datasources = {
    payload: {
      spokenProduct,
      suggestions,
      envLabel,
    },
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
  const document = {
    type: 'APL',
    version: '1.6',
    theme: 'dark',
    import: [{ name: 'alexa-layouts', version: '1.4.0' }],
    mainTemplate: {
      parameters: ['payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1E1B2E',
          items: [
            {
              type: 'AlexaHeader',
              headerTitle: 'Luisices • Vincular Voz',
              headerSubtitle: `Ambiente de ${envLabel}`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            {
              type: 'Container',
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
                      color: '#D8B4FE',
                      fontSize: '22dp',
                    },
                    {
                      type: 'Container',
                      backgroundColor: '#28223B',
                      borderRadius: '16dp',
                      paddingLeft: '28dp',
                      paddingRight: '28dp',
                      paddingTop: '14dp',
                      paddingBottom: '14dp',
                      marginTop: '12dp',
                      marginBottom: '12dp',
                      alignSelf: 'start',
                      items: [
                        {
                          type: 'Text',
                          text: '${payload.pairing.formattedCode}',
                          color: '#FFFFFF',
                          fontSize: '48dp',
                          fontWeight: 'bold',
                          letterSpacing: '8dp',
                        },
                      ],
                    },
                    {
                      type: 'Text',
                      text: 'Acesse o aplicativo Luisices > Ajustes > Integração Alexa e informe este código para autorizar.',
                      color: '#9CA3AF',
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
                      type: 'Image',
                      source: '${payload.pairing.qrCodeUrl}',
                      width: '200dp',
                      height: '200dp',
                      scale: 'best-fit',
                      borderRadius: '12dp',
                      backgroundColor: '#FFFFFF',
                    },
                    {
                      type: 'Text',
                      text: 'Escaneie com a câmera',
                      color: '#D8B4FE',
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

  // Formata o código com espaço no meio: "749 201"
  const rawCode = String(pairingCode || '').trim();
  const formattedCode = rawCode.length === 6 ? `${rawCode.slice(0, 3)} ${rawCode.slice(3)}` : rawCode;

  const datasources = {
    payload: {
      pairing: {
        pairingCode: rawCode,
        formattedCode,
        qrCodeUrl: qrCodeUrl || DEFAULT_QR_PLACEHOLDER,
        envLabel,
      },
    },
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
