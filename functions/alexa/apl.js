/**
 * Módulo de Apresentação Visual da Alexa (Alexa Presentation Language - APL 1.6+).
 * Design System oficial do Luisices para dispositivos com tela (Echo Show 5/8/10/15, Echo Spot e Fire TV).
 * Inclui layouts responsivos, suporte completo e robusto a telas circulares (Echo Spot), Glassmorphism,
 * botões interativos por toque e controle remoto de TV.
 * Conformidade estrita com a especificação ASK e APL com injeção segura e à prova de falhas de dados.
 */

const DEFAULT_BRAND_LOGO = 'https://dev.luisices.com.br/images/alexa-large-icon.png';
const DEFAULT_FALLBACK_IMAGE = 'https://dev.luisices.com.br/images/alexa-large-icon.png';
const DEFAULT_QR_PLACEHOLDER = 'https://dev.luisices.com.br/images/alexa-large-icon.png';
const DEFAULT_BACKGROUND_IMAGE = 'https://dev.luisices.com.br/images/login-bg-800.png';

/**
 * Constrói o componente padrão de plano de fundo do Luisices (AlexaBackground).
 * Utiliza a mesma imagem fotográfica acolhedora da tela de login (versão PNG otimizada para Echo Show)
 * com scrim protetor escuro para garantir máxima legibilidade dos textos e cartões (contraste AAA).
 */
function buildDefaultBackgroundComponent() {
  return {
    type: 'AlexaBackground',
    backgroundImageSource: DEFAULT_BACKGROUND_IMAGE,
    backgroundColor: '#161214',
    backgroundBlur: false,
    colorOverlay: true,
  };
}

// Expressões condicionais universais para detecção de viewport
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
 * Retorna opções rápidas de datas de entrega relativas em pt-BR (Hoje, Amanhã, Sábado, Em 7 dias)
 * no fuso horário America/Sao_Paulo com ISO YYYY-MM-DD e rótulos amigáveis para chips de tela.
 */
function getQuickDeliveryDateOptions(timezone = 'America/Sao_Paulo') {
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
  const [y, m, d] = todayStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(y, m - 1, d));

  const options = [];

  // 1. Hoje
  const todayLabel = `Hoje (${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')})`;
  options.push({ isoDate: todayStr, label: todayLabel });

  // 2. Amanhã
  const tomorrow = new Date(baseDate.getTime() + 86400000);
  const tomY = tomorrow.getUTCFullYear();
  const tomM = tomorrow.getUTCMonth() + 1;
  const tomD = tomorrow.getUTCDate();
  const tomorrowIso = `${tomY}-${String(tomM).padStart(2, '0')}-${String(tomD).padStart(2, '0')}`;
  const tomorrowLabel = `Amanhã (${String(tomD).padStart(2, '0')}/${String(tomM).padStart(2, '0')})`;
  options.push({ isoDate: tomorrowIso, label: tomorrowLabel });

  // 3. Próximo Sábado
  const dayOfWeek = baseDate.getUTCDay(); // 0 = Dom, 6 = Sáb
  let daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  if (daysUntilSaturday === 0) {
    daysUntilSaturday = 7;
  }
  const saturday = new Date(baseDate.getTime() + daysUntilSaturday * 86400000);
  const satY = saturday.getUTCFullYear();
  const satM = saturday.getUTCMonth() + 1;
  const satD = saturday.getUTCDate();
  const satIso = `${satY}-${String(satM).padStart(2, '0')}-${String(satD).padStart(2, '0')}`;
  const satLabel = `Sábado (${String(satD).padStart(2, '0')}/${String(satM).padStart(2, '0')})`;
  options.push({ isoDate: satIso, label: satLabel });

  // 4. Em 7 dias
  const in7Days = new Date(baseDate.getTime() + 7 * 86400000);
  const in7Y = in7Days.getUTCFullYear();
  const in7M = in7Days.getUTCMonth() + 1;
  const in7D = in7Days.getUTCDate();
  const in7Iso = `${in7Y}-${String(in7M).padStart(2, '0')}-${String(in7D).padStart(2, '0')}`;
  const in7Label = `+7 dias (${String(in7D).padStart(2, '0')}/${String(in7M).padStart(2, '0')})`;
  options.push({ isoDate: in7Iso, label: in7Label });

  return options;
}

/**
 * Retorna estilos dinâmicos para botões APL com suporte nativo a D-pad (Fire TV Stick) e Toque (Echo Show).
 * Inclui estados :focused (borda branca 3dp, zoom 1.08x) e :pressed para feedback visual imediato pelo controle remoto.
 */
function getAplButtonStyles() {
  return {
    btnPrimaryStyle: {
      values: [
        {
          backgroundColor: '#7B4D50',
          borderColor: 'rgba(244, 183, 185, 0.35)',
          borderWidth: '1dp',
          transform: [{ scale: 1.0 }],
        },
        {
          when: '${state.focused}',
          backgroundColor: '#9E555A',
          borderColor: '#FFFFFF',
          borderWidth: '3dp',
          transform: [{ scale: 1.08 }],
        },
        {
          when: '${state.pressed}',
          transform: [{ scale: 0.96 }],
        },
      ],
    },
    btnSecondaryStyle: {
      values: [
        {
          backgroundColor: 'rgba(35, 28, 30, 0.88)',
          borderColor: 'rgba(235, 205, 205, 0.22)',
          borderWidth: '1dp',
          transform: [{ scale: 1.0 }],
        },
        {
          when: '${state.focused}',
          backgroundColor: 'rgba(75, 50, 55, 0.98)',
          borderColor: '#FFFFFF',
          borderWidth: '3dp',
          transform: [{ scale: 1.08 }],
        },
        {
          when: '${state.pressed}',
          transform: [{ scale: 0.96 }],
        },
      ],
    },
    btnConfirmStyle: {
      values: [
        {
          backgroundColor: '#10B981',
          borderColor: 'rgba(52, 211, 153, 0.45)',
          borderWidth: '1dp',
          transform: [{ scale: 1.0 }],
        },
        {
          when: '${state.focused}',
          backgroundColor: '#059669',
          borderColor: '#FFFFFF',
          borderWidth: '3dp',
          transform: [{ scale: 1.08 }],
        },
        {
          when: '${state.pressed}',
          transform: [{ scale: 0.96 }],
        },
      ],
    },
    btnCancelStyle: {
      values: [
        {
          backgroundColor: 'rgba(45, 30, 34, 0.85)',
          borderColor: 'rgba(229, 142, 142, 0.4)',
          borderWidth: '1dp',
          transform: [{ scale: 1.0 }],
        },
        {
          when: '${state.focused}',
          backgroundColor: 'rgba(110, 35, 42, 0.98)',
          borderColor: '#FFFFFF',
          borderWidth: '3dp',
          transform: [{ scale: 1.08 }],
        },
        {
          when: '${state.pressed}',
          transform: [{ scale: 0.96 }],
        },
      ],
    },
    btnSuggestionCardStyle: {
      values: [
        {
          backgroundColor: 'rgba(35, 28, 30, 0.88)',
          borderColor: 'rgba(235, 205, 205, 0.22)',
          borderWidth: '1dp',
          transform: [{ scale: 1.0 }],
        },
        {
          when: '${state.focused}',
          backgroundColor: 'rgba(55, 40, 44, 0.98)',
          borderColor: '#FFFFFF',
          borderWidth: '3dp',
          transform: [{ scale: 1.04 }],
        },
        {
          when: '${state.pressed}',
          transform: [{ scale: 0.97 }],
        },
      ],
    },
    btnChipStyle: {
      values: [
        {
          backgroundColor: 'rgba(45, 34, 38, 0.92)',
          borderColor: 'rgba(244, 183, 185, 0.3)',
          borderWidth: '1dp',
          transform: [{ scale: 1.0 }],
        },
        {
          when: '${state.focused}',
          backgroundColor: '#9E555A',
          borderColor: '#FFFFFF',
          borderWidth: '3dp',
          transform: [{ scale: 1.10 }],
        },
        {
          when: '${state.pressed}',
          transform: [{ scale: 0.95 }],
        },
      ],
    },
  };
}

/**
 * 1. Constrói o documento APL de Boas-Vindas no Echo Show, Echo Spot e Fire TV (LaunchRequest).
 */
function buildWelcomeAplDirective({ userName = 'Ateliê', envLabel = 'Teste' }) {
  const cleanUserName = (userName && String(userName).trim()) || 'Ateliê';
  const cleanEnvLabel = (envLabel && String(envLabel).trim()) || 'Teste';

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
    styles: getAplButtonStyles(),
    onMount: [
      {
        when: "${viewport.mode == 'tv' || viewport.mode == 'TV'}",
        type: 'SetFocus',
        componentId: 'btnWelcomePrimary',
      },
    ],
    mainTemplate: {
      parameters: ['payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#161214',
          items: [
            // Fundo Oficial Luisices (mesma imagem da tela de login) com Scrim Escuro
            buildDefaultBackgroundComponent(),
            // Cabeçalho Oficial para telas retangulares (Echo Show 5/8/10/15, Fire TV)
            {
              type: 'AlexaHeader',
              when: WHEN_IS_RECTANGULAR,
              headerTitle: 'Luisices • Ateliê Criativo',
              headerSubtitle: `Ambiente de ${cleanEnvLabel}`,
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
                  text: `👋 Olá, ${cleanUserName}!`,
                  color: '#FFFFFF',
                  fontSize: '20dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  maxLines: 1,
                },
                {
                  type: 'Text',
                  text: `Luisices • ${cleanEnvLabel}`,
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
                    borderColor: 'rgba(244, 183, 185, 0.4)',
                    borderWidth: '1dp',
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
                  text: `👋 Olá, ${cleanUserName}!`,
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
                      id: 'btnWelcomePrimary',
                      onPress: [{ type: 'SendEvent', arguments: ['intent', 'CreateOrderIntent'] }],
                      item: {
                        type: 'Frame',
                        inheritParentState: true,
                        style: 'btnPrimaryStyle',
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
                      id: 'btnWelcomeOrders',
                      onPress: [{ type: 'SendEvent', arguments: ['intent', 'ListRecentOrdersIntent'] }],
                      item: {
                        type: 'Frame',
                        inheritParentState: true,
                        style: 'btnSecondaryStyle',
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
                      id: 'btnWelcomeVoice',
                      onPress: [{ type: 'SendEvent', arguments: ['intent', 'LinkVoiceIntent'] }],
                      item: {
                        type: 'Frame',
                        inheritParentState: true,
                        style: 'btnSecondaryStyle',
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

  const welcome = {
    userName: cleanUserName,
    envLabel: cleanEnvLabel,
  };

  const datasources = {
    payload: {
      userName: cleanUserName,
      envLabel: cleanEnvLabel,
      welcome,
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
 * Constrói a área interativa de controles do pedido baseada no estágio atual (expectedInput).
 * No Fire TV Stick, permite selecionar quantidade, datas rápidas, base de preço e confirmação via D-Pad ou toque.
 */
function buildOrderControlArea({
  isActionsVisible,
  expectedInput,
  suggestedPriceText,
  cleanDraftId,
  cleanRevision,
}) {
  if (isActionsVisible) {
    return [
      {
        type: 'Container',
        direction: 'row',
        paddingTop: '20dp',
        items: [
          {
            type: 'TouchWrapper',
            id: 'btnOrderConfirm',
            onPress: [
              {
                type: 'SendEvent',
                arguments: ['confirmOrder', cleanDraftId, String(cleanRevision)],
              },
            ],
            item: {
              type: 'Frame',
              inheritParentState: true,
              style: 'btnConfirmStyle',
              borderRadius: '16dp',
              paddingLeft: '28dp',
              paddingRight: '28dp',
              paddingTop: '14dp',
              paddingBottom: '14dp',
              marginRight: '16dp',
              item: {
                type: 'Text',
                text: '✅ Confirmar Pedido',
                color: '#FFFFFF',
                fontSize: '18dp',
                fontWeight: 'bold',
              },
            },
          },
          {
            type: 'TouchWrapper',
            id: 'btnOrderCancel',
            onPress: [
              {
                type: 'SendEvent',
                arguments: ['cancelOrder', cleanDraftId, String(cleanRevision)],
              },
            ],
            item: {
              type: 'Frame',
              inheritParentState: true,
              style: 'btnCancelStyle',
              borderRadius: '16dp',
              paddingLeft: '24dp',
              paddingRight: '24dp',
              paddingTop: '14dp',
              paddingBottom: '14dp',
              item: {
                type: 'Text',
                text: '❌ Cancelar',
                color: '#F4B7B9',
                fontSize: '18dp',
                fontWeight: 'bold',
              },
            },
          },
        ],
      },
    ];
  }

  if (expectedInput === 'quantity') {
    const qtyList = [1, 2, 3, 5, 10, 20, 50];
    return [
      {
        type: 'Container',
        paddingTop: '14dp',
        items: [
          {
            type: 'Text',
            text: '👉 Escolha a quantidade no controle ou fale o número:',
            color: '#F4B7B9',
            fontSize: '16dp',
            fontWeight: 'bold',
            paddingBottom: '10dp',
          },
          {
            type: 'Container',
            direction: 'row',
            items: qtyList.map((qty) => ({
              type: 'TouchWrapper',
              id: `btnQty_${qty}`,
              onPress: [
                {
                  type: 'SendEvent',
                  arguments: ['selectQuantity', qty],
                },
              ],
              item: {
                type: 'Frame',
                inheritParentState: true,
                style: 'btnChipStyle',
                borderRadius: '14dp',
                paddingLeft: '18dp',
                paddingRight: '18dp',
                paddingTop: '10dp',
                paddingBottom: '10dp',
                marginRight: '8dp',
                item: {
                  type: 'Text',
                  text: String(qty),
                  color: '#FFFFFF',
                  fontSize: '18dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                },
              },
            })),
          },
          {
            type: 'Text',
            text: '🎙️ Ou diga qualquer outra quantidade desejada',
            color: '#C9C0B8',
            fontSize: '14dp',
            paddingTop: '8dp',
          },
        ],
      },
    ];
  }

  if (expectedInput === 'deliveryDate') {
    const quickDates = getQuickDeliveryDateOptions();
    return [
      {
        type: 'Container',
        paddingTop: '14dp',
        items: [
          {
            type: 'Text',
            text: '👉 Escolha a data de entrega no controle ou diga o dia:',
            color: '#F4B7B9',
            fontSize: '16dp',
            fontWeight: 'bold',
            paddingBottom: '10dp',
          },
          {
            type: 'Container',
            direction: 'row',
            items: quickDates.map((opt, idx) => ({
              type: 'TouchWrapper',
              id: `btnDate_${idx}`,
              onPress: [
                {
                  type: 'SendEvent',
                  arguments: ['selectDeliveryDate', opt.isoDate],
                },
              ],
              item: {
                type: 'Frame',
                inheritParentState: true,
                style: 'btnChipStyle',
                borderRadius: '14dp',
                paddingLeft: '16dp',
                paddingRight: '16dp',
                paddingTop: '10dp',
                paddingBottom: '10dp',
                marginRight: '8dp',
                item: {
                  type: 'Text',
                  text: opt.label,
                  color: '#FFFFFF',
                  fontSize: '15dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                },
              },
            })),
          },
          {
            type: 'Text',
            text: '🎙️ Ou diga uma data específica (ex: "25 de outubro")',
            color: '#C9C0B8',
            fontSize: '14dp',
            paddingTop: '8dp',
          },
        ],
      },
    ];
  }

  if (expectedInput === 'priceBasis') {
    return [
      {
        type: 'Container',
        paddingTop: '14dp',
        items: [
          {
            type: 'Text',
            text: '👉 Como é esse valor?',
            color: '#F4B7B9',
            fontSize: '16dp',
            fontWeight: 'bold',
            paddingBottom: '10dp',
          },
          {
            type: 'Container',
            direction: 'row',
            items: [
              {
                type: 'TouchWrapper',
                id: 'btnPriceUnit',
                onPress: [
                  {
                    type: 'SendEvent',
                    arguments: ['selectPriceBasis', 'unit'],
                  },
                ],
                item: {
                  type: 'Frame',
                  inheritParentState: true,
                  style: 'btnPrimaryStyle',
                  borderRadius: '16dp',
                  paddingLeft: '22dp',
                  paddingRight: '22dp',
                  paddingTop: '12dp',
                  paddingBottom: '12dp',
                  marginRight: '12dp',
                  item: {
                    type: 'Text',
                    text: '🍰 Por Unidade (cada)',
                    color: '#FFFFFF',
                    fontSize: '16dp',
                    fontWeight: 'bold',
                  },
                },
              },
              {
                type: 'TouchWrapper',
                id: 'btnPriceTotal',
                onPress: [
                  {
                    type: 'SendEvent',
                    arguments: ['selectPriceBasis', 'total'],
                  },
                ],
                item: {
                  type: 'Frame',
                  inheritParentState: true,
                  style: 'btnSecondaryStyle',
                  borderRadius: '16dp',
                  paddingLeft: '22dp',
                  paddingRight: '22dp',
                  paddingTop: '12dp',
                  paddingBottom: '12dp',
                  item: {
                    type: 'Text',
                    text: '💰 Total do Pedido',
                    color: '#FFFFFF',
                    fontSize: '16dp',
                    fontWeight: 'bold',
                  },
                },
              },
            ],
          },
        ],
      },
    ];
  }

  if (expectedInput === 'suggestedPrice') {
    const priceDisplay = suggestedPriceText ? `${suggestedPriceText} cada` : 'sugerido';
    return [
      {
        type: 'Container',
        paddingTop: '14dp',
        items: [
          {
            type: 'Text',
            text: `👉 Usar preço de catálogo (${priceDisplay})?`,
            color: '#F4B7B9',
            fontSize: '16dp',
            fontWeight: 'bold',
            paddingBottom: '10dp',
          },
          {
            type: 'Container',
            direction: 'row',
            items: [
              {
                type: 'TouchWrapper',
                id: 'btnSuggestedConfirm',
                onPress: [
                  {
                    type: 'SendEvent',
                    arguments: ['confirmSuggestedPrice'],
                  },
                ],
                item: {
                  type: 'Frame',
                  inheritParentState: true,
                  style: 'btnConfirmStyle',
                  borderRadius: '16dp',
                  paddingLeft: '22dp',
                  paddingRight: '22dp',
                  paddingTop: '12dp',
                  paddingBottom: '12dp',
                  marginRight: '12dp',
                  item: {
                    type: 'Text',
                    text: '✅ Sim, usar este valor',
                    color: '#FFFFFF',
                    fontSize: '16dp',
                    fontWeight: 'bold',
                  },
                },
              },
              {
                type: 'TouchWrapper',
                id: 'btnSuggestedReject',
                onPress: [
                  {
                    type: 'SendEvent',
                    arguments: ['rejectSuggestedPrice'],
                  },
                ],
                item: {
                  type: 'Frame',
                  inheritParentState: true,
                  style: 'btnSecondaryStyle',
                  borderRadius: '16dp',
                  paddingLeft: '22dp',
                  paddingRight: '22dp',
                  paddingTop: '12dp',
                  paddingBottom: '12dp',
                  item: {
                    type: 'Text',
                    text: '✏️ Informar outro valor',
                    color: '#F4B7B9',
                    fontSize: '16dp',
                    fontWeight: 'bold',
                  },
                },
              },
            ],
          },
        ],
      },
    ];
  }

  // Padrão para outros inputs (ex: customer, product)
  return [
    {
      type: 'Text',
      text: '🎙️ Fale os dados pendentes ou diga o que deseja corrigir',
      color: '#C9C0B8',
      fontSize: '16dp',
      paddingTop: '16dp',
    },
  ];
}

/**
 * 2. Constrói o documento APL para exibição do Card Interativo de Pedido no Echo Show, Echo Spot e Fire TV.
 * Suporta botões tocáveis [Confirmar] e [Cancelar], seletores interativos D-Pad (quantidade, data, preço),
 * vinculação de token/draftId/revision e adaptação circular para Echo Spot.
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
  expectedInput = null,
  suggestedPriceText = null,
}) {
  const cleanCustomer = (customer && String(customer).trim()) || 'Não informado';
  const cleanProduct = (product && String(product).trim()) || 'Produto Personalizado';
  const cleanQuantity = Number(quantity) || 1;
  const cleanDelivery = (deliveryDate && String(deliveryDate).trim()) || 'A combinar';
  const cleanTotal = (totalPrice && String(totalPrice).trim()) || 'R$ 0,00';
  const cleanStatus = (statusLabel && String(statusLabel).trim()) || 'Aguardando Confirmação';
  const cleanImage = (imageUrl && String(imageUrl).trim()) || DEFAULT_FALLBACK_IMAGE;
  const cleanDraftId = draftId ? String(draftId) : '';
  const cleanRevision = Number(revision) || 1;
  const isActionsVisible = Boolean(showActions);

  // Determina o foco inicial automático para navegação D-Pad em Fire TV Stick
  let initialFocusId = null;
  if (isActionsVisible) {
    initialFocusId = 'btnOrderConfirm';
  } else if (expectedInput === 'quantity') {
    initialFocusId = [1, 2, 3, 5, 10, 20, 50].includes(cleanQuantity) ? `btnQty_${cleanQuantity}` : 'btnQty_1';
  } else if (expectedInput === 'deliveryDate') {
    initialFocusId = 'btnDate_0';
  } else if (expectedInput === 'priceBasis') {
    initialFocusId = 'btnPriceUnit';
  } else if (expectedInput === 'suggestedPrice') {
    initialFocusId = 'btnSuggestedConfirm';
  }

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
    styles: getAplButtonStyles(),
    onMount: initialFocusId
      ? [
          {
            when: "${viewport.mode == 'tv' || viewport.mode == 'TV'}",
            type: 'SetFocus',
            componentId: initialFocusId,
          },
        ]
      : undefined,
    mainTemplate: {
      parameters: ['payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#161214',
          items: [
            // Fundo Oficial Luisices (mesma imagem da tela de login) com Scrim Escuro
            buildDefaultBackgroundComponent(),
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
                  paddingBottom: '2dp',
                },
                {
                  type: 'Text',
                  text: cleanStatus,
                  color: '#F4B7B9',
                  fontSize: '11dp',
                  fontWeight: 'bold',
                },
                {
                  type: 'Text',
                  text: `${cleanQuantity}x ${cleanProduct}`,
                  color: '#FFFFFF',
                  fontSize: '16dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  maxLines: 1,
                  paddingTop: '2dp',
                },
                {
                  type: 'Text',
                  text: `👤 ${cleanCustomer}`,
                  color: '#E8E0E3',
                  fontSize: '13dp',
                  paddingTop: '2dp',
                },
                {
                  type: 'Text',
                  text: cleanTotal,
                  color: '#34D399',
                  fontSize: '18dp',
                  fontWeight: 'bold',
                  paddingTop: '2dp',
                },
                ...(isActionsVisible
                  ? [
                      {
                        type: 'Container',
                        direction: 'row',
                        paddingTop: '8dp',
                        items: [
                          {
                            type: 'TouchWrapper',
                            onPress: [
                              {
                                type: 'SendEvent',
                                arguments: ['confirmOrder', cleanDraftId, String(cleanRevision)],
                              },
                            ],
                            item: {
                              type: 'Frame',
                              backgroundColor: '#10B981',
                              borderColor: 'rgba(52, 211, 153, 0.45)',
                              borderWidth: '1dp',
                              borderRadius: '14dp',
                              paddingLeft: '14dp',
                              paddingRight: '14dp',
                              paddingTop: '6dp',
                              paddingBottom: '6dp',
                              marginRight: '8dp',
                              item: {
                                type: 'Text',
                                text: '✅',
                                fontSize: '14dp',
                              },
                            },
                          },
                          {
                            type: 'TouchWrapper',
                            onPress: [
                              {
                                type: 'SendEvent',
                                arguments: ['cancelOrder', cleanDraftId, String(cleanRevision)],
                              },
                            ],
                            item: {
                              type: 'Frame',
                              backgroundColor: 'rgba(70, 30, 35, 0.9)',
                              borderColor: 'rgba(229, 142, 142, 0.45)',
                              borderWidth: '1dp',
                              borderRadius: '14dp',
                              paddingLeft: '14dp',
                              paddingRight: '14dp',
                              paddingTop: '6dp',
                              paddingBottom: '6dp',
                              item: {
                                type: 'Text',
                                text: '❌',
                                fontSize: '14dp',
                              },
                            },
                          },
                        ],
                      },
                    ]
                  : []),
              ],
            },
            // Layout Retangular Widescreen Elegante para Echo Show e Fire TV
            {
              type: 'Container',
              when: WHEN_IS_RECTANGULAR,
              direction: 'row',
              grow: 1,
              paddingLeft: '48dp',
              paddingRight: '48dp',
              paddingBottom: '32dp',
              alignItems: 'center',
              justifyContent: 'center',
              items: [
                // Coluna Esquerda: Imagem do Produto envolvida em Frame com Fallback Garantido
                {
                  type: 'Frame',
                  borderRadius: '24dp',
                  backgroundColor: 'rgba(35, 28, 30, 0.88)',
                  borderColor: 'rgba(235, 205, 205, 0.22)',
                  borderWidth: '1dp',
                  width: '280dp',
                  height: '280dp',
                  padding: '10dp',
                  alignItems: 'center',
                  justifyContent: 'center',
                  item: {
                    type: 'Image',
                    source: cleanImage,
                    width: '100%',
                    height: '100%',
                    scale: 'best-fit',
                    borderRadius: '16dp',
                  },
                },
                // Coluna Direita: Dados do Pedido + Controles Interativos em Painel de Vidro
                {
                  type: 'Frame',
                  backgroundColor: 'rgba(35, 28, 30, 0.88)',
                  borderColor: 'rgba(235, 205, 205, 0.22)',
                  borderWidth: '1dp',
                  borderRadius: '24dp',
                  paddingLeft: '32dp',
                  paddingRight: '32dp',
                  paddingTop: '24dp',
                  paddingBottom: '24dp',
                  marginLeft: '36dp',
                  grow: 1,
                  maxWidth: '650dp',
                  item: {
                    type: 'Container',
                    justifyContent: 'center',
                    items: [
                      // Badge de Status
                      {
                        type: 'Frame',
                        backgroundColor: '#7B4D50',
                        borderColor: 'rgba(244, 183, 185, 0.3)',
                        borderWidth: '1dp',
                        borderRadius: '8dp',
                        paddingLeft: '16dp',
                        paddingRight: '16dp',
                        paddingTop: '6dp',
                        paddingBottom: '6dp',
                        alignSelf: 'start',
                        item: {
                          type: 'Text',
                          text: cleanStatus,
                          color: '#F4B7B9',
                          fontSize: '15dp',
                          fontWeight: 'bold',
                        },
                      },
                      // Quantidade e Produto
                      {
                        type: 'Text',
                        text: `${cleanQuantity}x ${cleanProduct}`,
                        color: '#FFFFFF',
                        fontSize: '32dp',
                        fontWeight: 'bold',
                        maxLines: 2,
                        paddingTop: '10dp',
                      },
                      // Cliente
                      {
                        type: 'Text',
                        text: `👤 Cliente: ${cleanCustomer}`,
                        color: '#E8E0E3',
                        fontSize: '22dp',
                        paddingTop: '8dp',
                      },
                      // Data de Entrega
                      {
                        type: 'Text',
                        text: `📅 Entrega: ${cleanDelivery}`,
                        color: '#C9C0B8',
                        fontSize: '20dp',
                        paddingTop: '6dp',
                      },
                      // Valor Total em Destaque
                      {
                        type: 'Text',
                        text: `💰 Total: ${cleanTotal}`,
                        color: '#34D399',
                        fontSize: '32dp',
                        fontWeight: 'bold',
                        paddingTop: '12dp',
                      },
                      // Área de Controles Interativos (Seletores D-Pad de Quantidade, Data, Preço ou Ações de Confirmação)
                      ...buildOrderControlArea({
                        isActionsVisible,
                        expectedInput,
                        suggestedPriceText,
                        cleanDraftId,
                        cleanRevision,
                      }),
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

  const token = draftId ? `luisicesOrderToken_${draftId}_${revision || 1}` : 'luisicesOrderToken';

  const order = {
    draftId: cleanDraftId,
    revision: cleanRevision,
    customer: cleanCustomer,
    product: cleanProduct,
    quantity: cleanQuantity,
    deliveryDate: cleanDelivery,
    totalPrice: cleanTotal,
    statusLabel: cleanStatus,
    envLabel,
    imageUrl: cleanImage,
    showActions: isActionsVisible,
    expectedInput,
    suggestedPriceText,
  };

  const datasources = {
    payload: {
      ...order,
      order,
    },
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
  customer = 'Cliente',
  product = 'Produto Personalizado',
  quantity = 1,
  totalPrice = '',
  deliveryDate = '',
  envLabel = 'Teste',
  orderHeading = null,
}) {
  const hasNumber = Boolean(orderNumber && String(orderNumber).replace(/^#+/, '').trim());
  const cleanOrderNumber = hasNumber ? String(orderNumber).replace(/^#+/, '').trim() : '';
  const finalOrderHeading =
    orderHeading || (hasNumber ? `Pedido #${cleanOrderNumber} Registrado!` : 'Pedido Confirmado!');
  const cleanCustomer = (customer && String(customer).trim()) || 'Cliente';
  const cleanProduct = (product && String(product).trim()) || 'Produto Personalizado';
  const cleanQuantity = Number(quantity) || 1;
  const cleanTotal = totalPrice || 'R$ 0,00';
  const cleanDelivery = deliveryDate || '';

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
          backgroundColor: '#161214',
          items: [
            // Fundo Oficial Luisices (mesma imagem da tela de login) com Scrim Escuro
            buildDefaultBackgroundComponent(),
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
                  text: finalOrderHeading,
                  color: '#34D399',
                  fontSize: '18dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  paddingTop: '6dp',
                },
                {
                  type: 'Text',
                  text: `${cleanQuantity}x ${cleanProduct}`,
                  color: '#FFFFFF',
                  fontSize: '14dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  maxLines: 1,
                  paddingTop: '4dp',
                },
                {
                  type: 'Text',
                  text: `👤 ${cleanCustomer}`,
                  color: '#E8E0E3',
                  fontSize: '13dp',
                  textAlign: 'center',
                  paddingTop: '2dp',
                },
                {
                  type: 'Text',
                  text: `Total: ${cleanTotal}`,
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
              paddingLeft: '56dp',
              paddingRight: '56dp',
              paddingBottom: '32dp',
              alignItems: 'center',
              justifyContent: 'center',
              items: [
                // Painel Esquerdo: Celebração, Badge e Sincronização
                {
                  type: 'Frame',
                  backgroundColor: 'rgba(35, 28, 30, 0.88)',
                  borderColor: 'rgba(235, 205, 205, 0.22)',
                  borderWidth: '1dp',
                  borderRadius: '24dp',
                  padding: '32dp',
                  width: '380dp',
                  alignItems: 'center',
                  item: {
                    type: 'Container',
                    alignItems: 'center',
                    items: [
                      {
                        type: 'Text',
                        text: '🎉',
                        fontSize: '56dp',
                      },
                      {
                        type: 'Frame',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderColor: '#10B981',
                        borderWidth: '1dp',
                        borderRadius: '12dp',
                        paddingLeft: '18dp',
                        paddingRight: '18dp',
                        paddingTop: '6dp',
                        paddingBottom: '6dp',
                        marginTop: '12dp',
                        item: {
                          type: 'Text',
                          text: '✅ Pedido Confirmado',
                          color: '#34D399',
                          fontSize: '16dp',
                          fontWeight: 'bold',
                        },
                      },
                      {
                        type: 'Text',
                        text: finalOrderHeading,
                        color: '#FFFFFF',
                        fontSize: '24dp',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        paddingTop: '14dp',
                      },
                      {
                        type: 'Text',
                        text: '✨ Sincronizado no quadro de produção do Luisices',
                        color: '#C9C0B8',
                        fontSize: '14dp',
                        paddingTop: '10dp',
                        textAlign: 'center',
                      },
                    ],
                  },
                },
                // Painel Direito: Resumo Completo e Elegante dos Dados do Pedido
                {
                  type: 'Frame',
                  backgroundColor: 'rgba(35, 28, 30, 0.88)',
                  borderColor: 'rgba(235, 205, 205, 0.22)',
                  borderWidth: '1dp',
                  borderRadius: '24dp',
                  marginLeft: '40dp',
                  paddingLeft: '40dp',
                  paddingRight: '40dp',
                  paddingTop: '32dp',
                  paddingBottom: '32dp',
                  grow: 1,
                  maxWidth: '600dp',
                  item: {
                    type: 'Container',
                    items: [
                      {
                        type: 'Text',
                        text: `${cleanQuantity}x ${cleanProduct}`,
                        color: '#F4B7B9',
                        fontSize: '32dp',
                        fontWeight: 'bold',
                        maxLines: 2,
                      },
                      {
                        type: 'Text',
                        text: `👤 Cliente: ${cleanCustomer}`,
                        color: '#FFFFFF',
                        fontSize: '22dp',
                        paddingTop: '12dp',
                      },
                      ...(cleanDelivery
                        ? [
                            {
                              type: 'Text',
                              text: `📅 Entrega: ${cleanDelivery}`,
                              color: '#E8E0E3',
                              fontSize: '20dp',
                              paddingTop: '8dp',
                            },
                          ]
                        : []),
                      {
                        type: 'Text',
                        text: `💰 Total: ${cleanTotal}`,
                        color: '#34D399',
                        fontSize: '32dp',
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

  const success = {
    orderHeading: finalOrderHeading,
    orderNumber: cleanOrderNumber,
    customer: cleanCustomer,
    product: cleanProduct,
    quantity: cleanQuantity,
    totalPrice: cleanTotal,
    deliveryDate: cleanDelivery,
    envLabel,
  };

  const datasources = {
    payload: {
      ...success,
      success,
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
 * 4. Constrói o documento APL para Resolução de Ambiguidade de Produtos (Fuzzy Matching).
 */
function buildFuzzySuggestionsAplDirective({ spokenProduct = '', suggestions = [], envLabel = 'Teste' }) {
  const document = {
    type: 'APL',
    version: '1.6',
    theme: 'dark',
    import: [{ name: 'alexa-layouts', version: '1.4.0' }],
    styles: getAplButtonStyles(),
    onMount: suggestions.length > 0
      ? [
          {
            when: "${viewport.mode == 'tv' || viewport.mode == 'TV'}",
            type: 'SetFocus',
            componentId: 'btnSuggestion_0',
          },
        ]
      : undefined,
    mainTemplate: {
      parameters: ['payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#161214',
          items: [
            // Fundo Oficial Luisices (mesma imagem da tela de login) com Scrim Escuro
            buildDefaultBackgroundComponent(),
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
                  text: 'Deseja algum destes?',
                  color: '#E8E0E3',
                  fontSize: '12dp',
                  paddingBottom: '6dp',
                  textAlign: 'center',
                },
                {
                  type: 'Container',
                  items: suggestions.slice(0, 2).map((sug) => ({
                    type: 'TouchWrapper',
                    onPress: [{ type: 'SendEvent', arguments: ['selectProduct', sug.name] }],
                    item: {
                      type: 'Frame',
                      backgroundColor: 'rgba(35, 28, 30, 0.88)',
                      borderColor: 'rgba(235, 205, 205, 0.22)',
                      borderWidth: '1dp',
                      borderRadius: '12dp',
                      paddingLeft: '12dp',
                      paddingRight: '12dp',
                      paddingTop: '6dp',
                      paddingBottom: '6dp',
                      marginBottom: '4dp',
                      width: '260dp',
                      item: {
                        type: 'Container',
                        direction: 'row',
                        justifyContent: 'spaceBetween',
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
            // Layout Retangular para Echo Show e Fire TV
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
                  items: suggestions.map((sug, idx) => ({
                    type: 'TouchWrapper',
                    id: `btnSuggestion_${idx}`,
                    onPress: [{ type: 'SendEvent', arguments: ['selectProduct', sug.name] }],
                    item: {
                      type: 'Frame',
                      inheritParentState: true,
                      style: 'btnSuggestionCardStyle',
                      borderRadius: '20dp',
                      padding: '24dp',
                      width: '380dp',
                      marginLeft: idx > 0 ? '24dp' : '0dp',
                      item: {
                        type: 'Container',
                        items: [
                          {
                            type: 'Text',
                            text: sug.name,
                            color: '#FFFFFF',
                            fontSize: '22dp',
                            fontWeight: 'bold',
                          },
                          {
                            type: 'Text',
                            text: sug.unitPrice
                              ? `Preço Unitário: R$ ${sug.unitPrice.toFixed(2).replace('.', ',')} cada`
                              : 'Item cadastrado no catálogo',
                            color: '#34D399',
                            fontSize: '16dp',
                            paddingTop: '6dp',
                          },
                          {
                            type: 'Frame',
                            backgroundColor: '#7B4D50',
                            borderColor: 'rgba(244, 183, 185, 0.35)',
                            borderWidth: '1dp',
                            borderRadius: '12dp',
                            paddingLeft: '16dp',
                            paddingRight: '16dp',
                            paddingTop: '8dp',
                            paddingBottom: '8dp',
                            marginTop: '16dp',
                            alignSelf: 'start',
                            item: {
                              type: 'Text',
                              text: '🗣️ Selecionar este',
                              color: '#FFFFFF',
                              fontSize: '14dp',
                              fontWeight: 'bold',
                            },
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
 * 5. Constrói o documento APL de Vinculação de Perfil de Voz (LinkVoiceIntent).
 */
function buildVoicePairingAplDirective({ pairingCode = '000000', qrCodeUrl = null, envLabel = 'Teste' }) {
  const rawCode = String(pairingCode).replace(/\s+/g, '');
  const formattedCode =
    rawCode.length === 8
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
      parameters: ['payload'],
      items: [
        {
          type: 'Container',
          width: '100vw',
          height: '100vh',
          backgroundColor: '#161214',
          items: [
            // Fundo Oficial Luisices (mesma imagem da tela de login) com Scrim Escuro
            buildDefaultBackgroundComponent(),
            // Cabeçalho Oficial para telas retangulares (Echo Show 5/8/10/15, Fire TV)
            {
              type: 'AlexaHeader',
              when: WHEN_IS_RECTANGULAR,
              headerTitle: 'Luisices • Vinculação de Voz',
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
                  type: 'Text',
                  text: '🎙️ Código de Vinculação',
                  color: '#F4B7B9',
                  fontSize: '13dp',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  paddingBottom: '4dp',
                },
                {
                  type: 'Frame',
                  backgroundColor: 'rgba(35, 28, 30, 0.88)',
                  borderColor: 'rgba(235, 205, 205, 0.22)',
                  borderWidth: '1dp',
                  borderRadius: '16dp',
                  paddingLeft: '16dp',
                  paddingRight: '16dp',
                  paddingTop: '6dp',
                  paddingBottom: '6dp',
                  marginBottom: '6dp',
                  item: {
                    type: 'Text',
                    text: formattedCode,
                    color: '#FFFFFF',
                    fontSize: '32dp',
                    fontWeight: 'bold',
                    textAlign: 'center',
                  },
                },
                {
                  type: 'Text',
                  text: 'Acesse o aplicativo Luisices e digite este código no menu Alexa.',
                  color: '#E8E0E3',
                  fontSize: '11dp',
                  textAlign: 'center',
                  maxLines: 2,
                },
              ],
            },
            // Layout Retangular para Echo Show e Fire TV (Telas Grandes)
            {
              type: 'Container',
              when: WHEN_IS_RECTANGULAR,
              direction: 'row',
              grow: 1,
              paddingLeft: '48dp',
              paddingRight: '48dp',
              paddingBottom: '32dp',
              alignItems: 'center',
              justifyContent: 'center',
              items: [
                // Coluna Esquerda: Instruções e Código em Painel de Vidro
                {
                  type: 'Frame',
                  backgroundColor: 'rgba(35, 28, 30, 0.88)',
                  borderColor: 'rgba(235, 205, 205, 0.22)',
                  borderWidth: '1dp',
                  borderRadius: '24dp',
                  padding: '28dp',
                  grow: 1,
                  maxWidth: '560dp',
                  item: {
                    type: 'Container',
                    items: [
                      {
                        type: 'Text',
                        text: '🎙️ Vincule sua Voz ao Luisices',
                        color: '#FFFFFF',
                        fontSize: '32dp',
                        fontWeight: 'bold',
                        paddingBottom: '12dp',
                      },
                      {
                        type: 'Text',
                        text: '1. Abra o aplicativo Luisices no celular ou computador.',
                        color: '#E8E0E3',
                        fontSize: '18dp',
                        paddingBottom: '6dp',
                      },
                      {
                        type: 'Text',
                        text: '2. Vá em Configurações > Integrações > Alexa.',
                        color: '#E8E0E3',
                        fontSize: '18dp',
                        paddingBottom: '6dp',
                      },
                      {
                        type: 'Text',
                        text: '3. Digite o código exibido abaixo:',
                        color: '#E8E0E3',
                        fontSize: '18dp',
                        paddingBottom: '16dp',
                      },
                      {
                        type: 'Frame',
                        backgroundColor: '#1E1719',
                        borderColor: 'rgba(244, 183, 185, 0.35)',
                        borderWidth: '1dp',
                        borderRadius: '20dp',
                        paddingLeft: '32dp',
                        paddingRight: '32dp',
                        paddingTop: '16dp',
                        paddingBottom: '16dp',
                        alignSelf: 'start',
                        item: {
                          type: 'Text',
                          text: formattedCode,
                          color: '#FFFFFF',
                          fontSize: '48dp',
                          fontWeight: 'bold',
                          letterSpacing: '4dp',
                        },
                      },
                      {
                        type: 'Text',
                        text: '⏳ Este código expira em 5 minutos.',
                        color: '#C9C0B8',
                        fontSize: '14dp',
                        paddingTop: '12dp',
                      },
                    ],
                  },
                },
                // Coluna Direita: QR Code de Acesso Rápido em Painel de Vidro
                {
                  type: 'Frame',
                  backgroundColor: 'rgba(35, 28, 30, 0.88)',
                  borderColor: 'rgba(235, 205, 205, 0.22)',
                  borderWidth: '1dp',
                  borderRadius: '24dp',
                  padding: '28dp',
                  marginLeft: '36dp',
                  alignItems: 'center',
                  item: {
                    type: 'Container',
                    alignItems: 'center',
                    items: [
                      {
                        type: 'Text',
                        text: 'Ou aponte sua câmera:',
                        color: '#E8E0E3',
                        fontSize: '16dp',
                        paddingBottom: '12dp',
                      },
                      {
                        type: 'Frame',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16dp',
                        padding: '12dp',
                        paddingBottom: '4dp',
                        item: {
                          type: 'Image',
                          source: qrCodeUrl || DEFAULT_QR_PLACEHOLDER,
                          width: '200dp',
                          height: '200dp',
                          scale: 'best-fit',
                        },
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

  const pairing = {
    pairingCode: rawCode,
    formattedCode,
    qrCodeUrl: qrCodeUrl || DEFAULT_QR_PLACEHOLDER,
    envLabel,
  };

  const datasources = {
    payload: {
      ...pairing,
      pairing,
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
  getAplButtonStyles,
  getQuickDeliveryDateOptions,
  buildWelcomeAplDirective,
  buildOrderCardAplDirective,
  buildOrderSuccessAplDirective,
  buildFuzzySuggestionsAplDirective,
  buildVoicePairingAplDirective,
};
