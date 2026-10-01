/**
 * Módulo de Apresentação Visual da Alexa (Alexa Presentation Language - APL).
 * Renderiza cartões visuais interativos e elegantes para dispositivos Echo Show, Fire TV e tablets.
 */

const DEFAULT_BRAND_LOGO = 'https://cdn.luisices.com.br/logo.png';
const DEFAULT_FALLBACK_IMAGE = 'https://cdn.luisices.com.br/placeholder-product.png';

/**
 * Verifica se a requisição veio de um dispositivo Alexa com suporte a tela (APL).
 */
function supportsApl(envelope) {
  return Boolean(
    envelope?.context?.System?.device?.supportedInterfaces?.['Alexa.Presentation.APL']
  );
}

/**
 * Constrói o documento APL para exibição do Card de Pedido no Echo Show.
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
            // Cabeçalho de Marca
            {
              type: 'AlexaHeader',
              headerTitle: 'Luisices • Ateliê Criativo',
              headerSubtitle: `Ambiente de ${envLabel}`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            // Card Central de Resumo do Pedido
            {
              type: 'Container',
              direction: 'row',
              grow: 1,
              paddingLeft: '32dp',
              paddingRight: '32dp',
              paddingBottom: '24dp',
              alignItems: 'center',
              justifyContent: 'center',
              items: [
                // Imagem do Produto (Coluna Esquerda)
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
                // Dados do Pedido (Coluna Direita)
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
                      paddingTop: '10dp',
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
 * Constrói o documento APL de Boas-Vindas no Echo Show (LaunchRequest).
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
            {
              type: 'AlexaHeader',
              headerTitle: 'Luisices • Ateliê Criativo',
              headerSubtitle: `Ambiente de ${envLabel}`,
              headerAttributionImage: DEFAULT_BRAND_LOGO,
            },
            {
              type: 'Container',
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
                // Ações Rápidas em Pílulas
                {
                  type: 'Container',
                  direction: 'row',
                  items: [
                    {
                      type: 'Container',
                      backgroundColor: '#7C3AED',
                      borderRadius: '20dp',
                      paddingLeft: '20dp',
                      paddingRight: '20dp',
                      paddingTop: '10dp',
                      paddingBottom: '10dp',
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
                    {
                      type: 'Container',
                      backgroundColor: '#374151',
                      borderRadius: '20dp',
                      paddingLeft: '20dp',
                      paddingRight: '20dp',
                      paddingTop: '10dp',
                      paddingBottom: '10dp',
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
                    {
                      type: 'Container',
                      backgroundColor: '#374151',
                      borderRadius: '20dp',
                      paddingLeft: '20dp',
                      paddingRight: '20dp',
                      paddingTop: '10dp',
                      paddingBottom: '10dp',
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

module.exports = {
  supportsApl,
  buildOrderCardAplDirective,
  buildWelcomeAplDirective,
};
