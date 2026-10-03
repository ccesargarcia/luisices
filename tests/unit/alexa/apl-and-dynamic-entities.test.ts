import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  supportsApl,
  buildOrderCardAplDirective,
  buildWelcomeAplDirective,
  buildOrderSuccessAplDirective,
  buildFuzzySuggestionsAplDirective,
  buildVoicePairingAplDirective,
} = require('../../../functions/alexa/apl');

const {
  buildDynamicEntitiesDirective,
  fetchCatalogProductsForDynamicEntities,
  generateAutomaticSynonyms,
  clearDynamicEntitiesCache,
} = require('../../../functions/alexa/dynamicEntities');

const {
  calculateSimilarity,
  findClosestProductSuggestions,
  buildSuggestionPrompt,
  normalizeForFuzzy,
} = require('../../../functions/alexa/fuzzySuggestions');

const {
  handleAlexaDialog,
  formatDatePtBr,
  formatCurrencyPtBr,
} = require('../../../functions/alexa/dialog');

const { processAlexaEnvelope } = require('../../../functions/alexa/index');
const { computeBindingKey } = require('../../../functions/alexa/repository');

describe('Alexa Advancements: Dynamic Entities, Fuzzy Suggestions & APL', () => {
  const amazonUserId = 'amzn1.ask.account.CAIO_USER';
  const personId = 'amzn1.ask.person.CAIO123';
  const hmacKey = 'test-secret-hmac-key-min-32-chars-long!';

  const baseConfig = {
    isEnabled: true,
    environment: 'test',
    timezone: 'America/Sao_Paulo',
    allowedSkillId: 'amzn1.ask.skill.luisices-test',
    draftTtlMinutes: 15,
    hmacKey,
  };

  const bindingKey = computeBindingKey(
    baseConfig.environment,
    baseConfig.allowedSkillId,
    amazonUserId,
    personId,
    baseConfig.hmacKey
  );

  const baseIdentity = {
    uid: 'uid-caiogarcia',
    displayName: 'Caio',
    personId,
    bindingKey,
    mode: 'voice_confirm',
    allowedEnvironments: ['dev', 'test', 'prod'],
  };

  beforeEach(() => {
    clearDynamicEntitiesCache();
  });

  function createMockDb(initialStore = {}) {
    const store = {
      alexaDrafts: {},
      alexaRequests: {},
      alexaIntegrations: {
        global: { isEnabled: true },
      },
      userProfiles: {
        'uid-caiogarcia': {
          active: true,
          role: 'admin',
          permissions: { 'orders.create': true },
        },
      },
      alexaPermissions: {
        'uid-caiogarcia': {
          enabled: true,
          mode: 'voice_confirm',
        },
      },
      alexaBindings: {
        [bindingKey]: {
          uid: 'uid-caiogarcia',
          personId,
          bindingKey,
          active: true,
          status: 'active',
          environment: 'test',
          mode: 'voice_confirm',
          allowedEnvironments: ['dev', 'test', 'prod'],
        },
      },
      integrationSettings: {
        alexa: { enabled: true },
      },
      products: {},
      storeProducts: {},
      ...initialStore,
    };

    const db = {
      store,
      doc: (path: string) => {
        const parts = path.split('/');
        return db.collection(parts[0]).doc(parts[1]);
      },
      collection: (colName: string) => ({
        doc: (docId) => ({
          get: async () => {
            const data = store[colName]?.[docId];
            return {
              exists: Boolean(data),
              id: docId,
              data: () => data || {},
            };
          },
          set: async (data, opts) => {
            if (!store[colName]) store[colName] = {};
            if (opts?.merge && store[colName][docId]) {
              store[colName][docId] = { ...store[colName][docId], ...data };
            } else {
              store[colName][docId] = { ...data };
            }
          },
          update: async (data) => {
            if (!store[colName]) store[colName] = {};
            if (store[colName][docId]) {
              store[colName][docId] = { ...store[colName][docId], ...data };
            }
          },
          delete: async () => {
            if (store[colName]) delete store[colName][docId];
          },
        }),
        where: (field, op, val) => ({
          limit: (n) => ({
            get: async () => {
              const docs = [];
              const colData = store[colName] || {};
              for (const [id, item] of Object.entries(colData)) {
                if (item[field] === val) {
                  docs.push({
                    id,
                    data: () => item,
                  });
                }
                if (docs.length >= n) break;
              }
              return {
                empty: docs.length === 0,
                forEach: (fn) => docs.forEach(fn),
                docs,
              };
            },
          }),
        }),
        limit: (n) => ({
          get: async () => {
            const docs = [];
            const colData = store[colName] || {};
            for (const [id, item] of Object.entries(colData)) {
              docs.push({
                id,
                data: () => item,
              });
              if (docs.length >= n) break;
            }
            return {
              empty: docs.length === 0,
              forEach: (fn) => docs.forEach(fn),
              docs,
            };
          },
        }),
      }),
      runTransaction: async (txFn) => {
        const tx = {
          get: async (ref) => ref.get(),
          set: (ref, data, opts) => ref.set(data, opts),
          update: (ref, data) => ref.update(data),
        };
        return await txFn(tx);
      },
    };

    return db;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Dynamic Entities (Sincronização Dinâmica do Catálogo)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Dynamic Entities', () => {
    it('gera sinônimos automáticos para variações comuns de artesanato', () => {
      const syn1 = generateAutomaticSynonyms('Caixa Milk Personalizada');
      expect(syn1).toContain('Caixa Milk');
      expect(syn1).toContain('Caixinha Milk Personalizada');

      const syn2 = generateAutomaticSynonyms('Caderno A5 de Luxo');
      expect(syn2).toContain('Caderno A5');
      expect(syn2).toContain('Caderninho A5 de Luxo');

      const syn3 = generateAutomaticSynonyms('Bloco de Notas 3D');
      expect(syn3).toContain('Bloco de Notas');
      expect(syn3).toContain('Bloquinho de Notas 3D');
    });

    it('constrói a diretiva Dialog.UpdateDynamicEntities no padrão da Alexa para slot PRODUCT_TYPE', () => {
      const products = [
        { id: 'prod-milk', name: 'Caixa Milk', unitPrice: 12.5, synonyms: ['Caixinha Milk', 'Milk'] },
        { id: 'prod-piramide', name: 'Caixa Pirâmide', unitPrice: 15.0, synonyms: ['Pirâmide'] },
      ];

      const directive = buildDynamicEntitiesDirective(products);

      expect(directive).not.toBeNull();
      expect(directive.type).toBe('Dialog.UpdateDynamicEntities');
      expect(directive.updateBehavior).toBe('REPLACE');
      expect(directive.types).toHaveLength(1);
      expect(directive.types[0].name).toBe('PRODUCT_TYPE');

      const values = directive.types[0].values;
      expect(values).toHaveLength(2);
      expect(values[0].id).toBe('prod-milk');
      expect(values[0].name.value).toBe('Caixa Milk');
      expect(values[0].name.synonyms).toContain('Caixinha Milk');
      expect(values[0].name.synonyms).toContain('Milk');
    });

    it('retorna null se a lista de produtos for vazia', () => {
      expect(buildDynamicEntitiesDirective([])).toBeNull();
      expect(buildDynamicEntitiesDirective(null)).toBeNull();
    });

    it('busca produtos ativos de storeProducts e user products no Firestore', async () => {
      const mockDb = createMockDb({
        storeProducts: {
          'store-1': { name: 'Caixa Bala', price: 8.5, active: true },
          'store-inactive': { name: 'Item Inativo', price: 10, active: false },
        },
        products: {
          'user-1': { userId: 'uid-caiogarcia', name: 'Topo de Bolo Casamento', unitPrice: 35.0 },
        },
      });

      const prods = await fetchCatalogProductsForDynamicEntities(mockDb, 'uid-caiogarcia');
      expect(prods.length).toBeGreaterThanOrEqual(2);

      const names = prods.map((p) => p.name);
      expect(names).toContain('Caixa Bala');
      expect(names).toContain('Topo de Bolo Casamento');
      expect(names).not.toContain('Item Inativo');
    });

    it('injeta a diretiva de Dynamic Entities na resposta do LaunchRequest', async () => {
      const mockDb = createMockDb({
        storeProducts: {
          'store-1': { name: 'Caixa Milk', price: 12.0, active: true },
        },
      });

      const envelope = {
        session: { sessionId: 'sess-dyn-launch' },
        request: { type: 'LaunchRequest', requestId: 'amzn1.echo-api.request.dyn-1' },
      };

      const res = await handleAlexaDialog({
        envelope,
        identity: baseIdentity,
        config: baseConfig,
        db: mockDb,
      });

      expect(res.directives).toBeDefined();
      const dynDir = res.directives.find((d: any) => d.type === 'Dialog.UpdateDynamicEntities');
      expect(dynDir).toBeDefined();
      expect(dynDir.types[0].name).toBe('PRODUCT_TYPE');
      expect(dynDir.types[0].values.some((v: any) => v.name.value === 'Caixa Milk')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Intelligent Fuzzy Suggestions (Fallback com Sugestões Próximas)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Fallback Inteligente com Sugestões Próximas', () => {
    it('normaliza strings para comparação fonética e fuzzy', () => {
      expect(normalizeForFuzzy('Caixa de Luxo!')).toBe('caixa de luxo');
      expect(normalizeForFuzzy('  Álbum   com Ímã  ')).toBe('album com ima');
    });

    it('calcula pontuação de similaridade composta precisa', () => {
      // Idênticos
      expect(calculateSimilarity('Caixa Milk', 'caixa milk')).toBe(1.0);

      // Substring / variação
      const subScore = calculateSimilarity('caixa milk', 'caixa milk personalizada');
      expect(subScore).toBeGreaterThan(0.7);

      // Fonética / Levenshtein próximo
      const typoScore = calculateSimilarity('caixa sushy', 'caixa sushi');
      expect(typoScore).toBeGreaterThan(0.8);

      // Totalmente diferente
      const diffScore = calculateSimilarity('topo de bolo', 'copo personalizado');
      expect(diffScore).toBeLessThan(0.4);
    });

    it('encontra as melhores sugestões de produtos próximos no catálogo', () => {
      const catalog = [
        { id: 'p1', name: 'Caixa Pirâmide', unitPrice: 15.0 },
        { id: 'p2', name: 'Caixa Milk', unitPrice: 12.0 },
        { id: 'p3', name: 'Caderno Brochura A5', unitPrice: 25.0 },
        { id: 'p4', name: 'Adesivo Vinil 5x5', unitPrice: 2.0 },
      ];

      // Usuário dita "caixa sushi"
      const suggestions = findClosestProductSuggestions('caixa sushi', catalog, 2, 0.35);

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      // As caixas devem pontuar melhor que o caderno ou adesivo
      expect(suggestions[0].name.startsWith('Caixa')).toBe(true);
    });

    it('formata o prompt em português natural para 1 e 2 sugestões', () => {
      const prompt1 = buildSuggestionPrompt('caixa sushi', [{ name: 'Caixa Pirâmide' }]);
      expect(prompt1).toBe('Não encontrei caixa sushi no catálogo. Você quis dizer Caixa Pirâmide?');

      const prompt2 = buildSuggestionPrompt('caixa sushi', [
        { name: 'Caixa Pirâmide' },
        { name: 'Caixa Milk' },
      ]);
      expect(prompt2).toBe('Não encontrei caixa sushi no catálogo. Você quis dizer Caixa Pirâmide ou Caixa Milk?');

      expect(buildSuggestionPrompt('caixa sushi', [])).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Alexa Presentation Language (APL) para Echo Show e Dispositivos com Tela
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Alexa Presentation Language (APL)', () => {
    it('detecta corretamente dispositivo com suporte a APL', () => {
      const echoDotEnvelope = {
        context: {
          System: {
            device: {
              supportedInterfaces: {
                AudioPlayer: {},
              },
            },
          },
        },
      };

      const echoShowEnvelope = {
        context: {
          System: {
            device: {
              supportedInterfaces: {
                'Alexa.Presentation.APL': {
                  runtime: { maxVersion: '1.6' },
                },
              },
            },
          },
        },
      };

      expect(supportsApl(echoDotEnvelope)).toBe(false);
      expect(supportsApl(echoShowEnvelope)).toBe(true);
      expect(supportsApl(null)).toBe(false);
      expect(supportsApl({})).toBe(false);
    });

    it('gera documento APL de Boas-Vindas válido com ações rápidas', () => {
      const directive = buildWelcomeAplDirective({ userName: 'Caio', envLabel: 'teste' });

      expect(directive.type).toBe('Alexa.Presentation.APL.RenderDocument');
      expect(directive.token).toBe('luisicesWelcomeToken');
      expect(directive.document.version).toBe('1.6');
      expect(directive.document.theme).toBe('dark');
      expect(directive.datasources.payload.welcome.userName).toBe('Caio');
      expect(directive.datasources.payload.welcome.envLabel).toBe('teste');
    });

    it('gera documento APL de Cartão de Pedido com dados completos e badge de status', () => {
      const directive = buildOrderCardAplDirective({
        customer: 'Juliana',
        product: 'Caixa Milk de Luxo',
        quantity: 15,
        deliveryDate: '25 de outubro de 2026',
        totalPrice: 'R$ 180,00',
        statusLabel: 'Aguardando Confirmação',
        envLabel: 'teste',
        imageUrl: 'https://cdn.luisices.com.br/custom-milk.png',
      });

      expect(directive.type).toBe('Alexa.Presentation.APL.RenderDocument');
      expect(directive.token).toBe('luisicesOrderToken');
      expect(directive.document.version).toBe('1.6');

      const orderData = directive.datasources.payload.order;
      expect(orderData.customer).toBe('Juliana');
      expect(orderData.product).toBe('Caixa Milk de Luxo');
      expect(orderData.quantity).toBe(15);
      expect(orderData.deliveryDate).toBe('25 de outubro de 2026');
      expect(orderData.totalPrice).toBe('R$ 180,00');
      expect(orderData.statusLabel).toBe('Aguardando Confirmação');
      expect(orderData.imageUrl).toBe('https://cdn.luisices.com.br/custom-milk.png');
    });

    it('usa imagem de fallback quando nenhuma imageUrl é informada', () => {
      const directive = buildOrderCardAplDirective({
        customer: 'Pedro',
        product: 'Topo de Bolo',
        quantity: 1,
        deliveryDate: '30 de novembro de 2026',
        totalPrice: 'R$ 30,00',
      });

      expect(directive.datasources.payload.order.imageUrl).toContain('alexa-large-icon.png');
    });

    it('anexa diretiva APL no LaunchRequest quando dispositivo possui tela (Echo Show)', async () => {
      const mockDb = createMockDb();
      const echoShowEnvelope = {
        session: { sessionId: 'sess-apl-screen' },
        request: { type: 'LaunchRequest', requestId: 'amzn1.echo-api.request.apl-1' },
        context: {
          System: {
            device: {
              supportedInterfaces: {
                'Alexa.Presentation.APL': {},
              },
            },
          },
        },
      };

      const res = await handleAlexaDialog({
        envelope: echoShowEnvelope,
        identity: baseIdentity,
        config: baseConfig,
        db: mockDb,
      });

      expect(res.directives).toBeDefined();
      const aplDir = res.directives.find((d: any) => d.type === 'Alexa.Presentation.APL.RenderDocument');
      expect(aplDir).toBeDefined();
      expect(aplDir.token).toBe('luisicesWelcomeToken');
    });

    it('NÃO anexa diretiva APL no LaunchRequest quando dispositivo é apenas áudio (Echo Dot)', async () => {
      const mockDb = createMockDb();
      const echoDotEnvelope = {
        session: { sessionId: 'sess-audio-only' },
        request: { type: 'LaunchRequest', requestId: 'amzn1.echo-api.request.audio-1' },
        context: {
          System: {
            device: {
              supportedInterfaces: {
                AudioPlayer: {},
              },
            },
          },
        },
      };

      const res = await handleAlexaDialog({
        envelope: echoDotEnvelope,
        identity: baseIdentity,
        config: baseConfig,
        db: mockDb,
      });

      if (res.directives) {
        const aplDir = res.directives.find((d: any) => d.type === 'Alexa.Presentation.APL.RenderDocument');
        expect(aplDir).toBeUndefined();
      }
    });

    it('anexa OrderCard APL no resumo de confirmação quando dispositivo possui tela', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-full-order-apl';
      const sessionId = 'sess-full-order-apl';

      const echoShowEnvelope = {
        session: { sessionId },
        request: {
          type: 'IntentRequest',
          requestId: 'amzn1.echo-api.request.order-apl-1',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Fernanda' },
              product: { value: 'Caixa Pirâmide' },
              quantity: { value: '10' },
              deliveryDate: { value: '2026-10-25' },
              total: { value: '150' },
            },
          },
        },
        context: {
          System: {
            device: {
              supportedInterfaces: {
                'Alexa.Presentation.APL': {},
              },
            },
          },
        },
      };

      const res = await handleAlexaDialog({
        envelope: echoShowEnvelope,
        identity: baseIdentity,
        config: baseConfig,
        db: mockDb,
      });

      expect(res.directives).toBeDefined();
      const aplDir = res.directives.find((d: any) => d.type === 'Alexa.Presentation.APL.RenderDocument');
      expect(aplDir).toBeDefined();
      expect(aplDir.token).toContain('luisicesOrderToken');
      expect(aplDir.datasources.payload.order.customer).toBe('Fernanda');
      expect(aplDir.datasources.payload.order.product).toBe('Caixa Pirâmide');
      expect(aplDir.datasources.payload.order.quantity).toBe(10);
      expect(aplDir.datasources.payload.order.statusLabel).toBe('Aguardando Confirmação');
    });

    it('anexa OrderCard APL intermediário ao coletar campos parciais em dispositivo com tela', async () => {
      const mockDb = createMockDb();
      const echoShowEnvelope = {
        session: { sessionId: 'sess-partial-collect-apl' },
        request: {
          type: 'IntentRequest',
          requestId: 'amzn1.echo-api.request.partial-1',
          intent: {
            name: 'CreateOrderIntent',
            slots: {
              customer: { value: 'Fernanda' },
              product: { value: 'Caixa Pirâmide' },
            },
          },
        },
        context: {
          System: {
            device: {
              supportedInterfaces: {
                'Alexa.Presentation.APL': {},
              },
            },
          },
        },
      };

      const res = await handleAlexaDialog({
        envelope: echoShowEnvelope,
        identity: baseIdentity,
        config: baseConfig,
        db: mockDb,
      });

      expect(res.directives).toBeDefined();
      const aplDir = res.directives.find((d: any) => d.type === 'Alexa.Presentation.APL.RenderDocument');
      expect(aplDir).toBeDefined();
      expect(aplDir.datasources.payload.order.customer).toBe('Fernanda');
      expect(aplDir.datasources.payload.order.product).toBe('Caixa Pirâmide');
      expect(aplDir.datasources.payload.order.statusLabel).toBe('Preenchendo Pedido');
      expect(aplDir.datasources.payload.order.showActions).toBe(false);
    });

    it('gera documento APL de Sucesso de Pedido sanitizando prefixo # e exibindo dados completos', () => {
      const directiveWithHash = buildOrderSuccessAplDirective({
        orderNumber: '#2026-0042',
        customer: 'Mariana',
        product: 'Caixa Milk',
        quantity: 5,
        totalPrice: '17 reais e 50 centavos',
        deliveryDate: '25 de outubro de 2026',
        envLabel: 'teste',
      });

      expect(directiveWithHash.type).toBe('Alexa.Presentation.APL.RenderDocument');
      expect(directiveWithHash.token).toBe('luisicesSuccessToken');
      expect(directiveWithHash.datasources.payload.success.orderNumber).toBe('2026-0042');
      expect(directiveWithHash.datasources.payload.success.orderHeading).toBe('Pedido #2026-0042 Registrado!');
      expect(directiveWithHash.datasources.payload.success.customer).toBe('Mariana');
      expect(directiveWithHash.datasources.payload.success.totalPrice).toBe('17 reais e 50 centavos');
      expect(directiveWithHash.datasources.payload.success.deliveryDate).toBe('25 de outubro de 2026');

      const directiveWithoutHash = buildOrderSuccessAplDirective({
        orderNumber: '1042',
        customer: 'Carlos',
      });
      expect(directiveWithoutHash.datasources.payload.success.orderNumber).toBe('1042');
      expect(directiveWithoutHash.datasources.payload.success.orderHeading).toBe('Pedido #1042 Registrado!');

      const directiveFallback = buildOrderSuccessAplDirective({
        orderNumber: '',
      });
      expect(directiveFallback.datasources.payload.success.orderNumber).toBe('');
      expect(directiveFallback.datasources.payload.success.orderHeading).toBe('Pedido Confirmado!');
    });

    it('suporta tela circular do Echo Spot mantendo o logo do Luisices no topo e ações circulares', () => {
      const welcomeDir = buildWelcomeAplDirective({ userName: 'Caio', envLabel: 'teste' });
      const orderDir = buildOrderCardAplDirective({
        customer: 'Mariana',
        product: 'Caixa Milk',
        quantity: 5,
        totalPrice: 'R$ 60,00',
        envLabel: 'teste',
      });

      // Verifica presença de layout condicional circular robusto (Echo Spot: ROUND, round ou pixelWidth <= 480)
      const welcomeItems = welcomeDir.document.mainTemplate.items[0].items;
      const roundWelcomeContainer = welcomeItems.find((item: any) => item.when && item.when.includes('viewport.shape == \'ROUND\''));
      expect(roundWelcomeContainer).toBeDefined();

      const orderItems = orderDir.document.mainTemplate.items[0].items;
      const roundOrderContainer = orderItems.find((item: any) => item.when && item.when.includes('viewport.shape == \'ROUND\''));
      expect(roundOrderContainer).toBeDefined();
    });

    it('gera documento APL de Vinculação de Voz com código legível a distância e QR Code', () => {
      const directive = buildVoicePairingAplDirective({
        pairingCode: '749201',
        envLabel: 'teste',
      });

      expect(directive.type).toBe('Alexa.Presentation.APL.RenderDocument');
      expect(directive.token).toBe('luisicesPairingToken');
      expect(directive.datasources.payload.pairing.formattedCode).toBe('749 201');
      expect(directive.datasources.payload.pairing.pairingCode).toBe('749201');
    });

    it('processa evento de toque na tela APL (Alexa.Presentation.APL.UserEvent) para confirmação de pedido', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-touch-confirm';
      const sessionId = 'sess-touch-confirm';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId,
        uid: baseIdentity.uid,
        bindingKey: baseIdentity.bindingKey,
        personId: baseIdentity.personId,
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Mariana',
        product: 'Caixa Milk',
        quantity: 5,
        deliveryDate: '2026-10-25',
        price: 60,
        pricingMode: 'total',
        revision: 1,
        createdAt: { toMillis: () => Date.now() },
        expiresAt: { toDate: () => new Date(Date.now() + 600000) },
      };

      // Simula usuário tocando no botão [ Confirmar ] na tela do Echo Show
      const userEventEnvelope = {
        session: {
          sessionId,
          application: { applicationId: baseConfig.allowedSkillId },
          user: { userId: amazonUserId },
          attributes: { draftId, revision: 1, personId: baseIdentity.personId },
        },
        request: {
          type: 'Alexa.Presentation.APL.UserEvent',
          requestId: 'amzn1.echo-api.request.touch-confirm-1',
          arguments: ['confirmOrder', draftId, 1],
        },
        context: {
          System: {
            application: { applicationId: baseConfig.allowedSkillId },
            user: { userId: amazonUserId },
            person: { personId: baseIdentity.personId },
            device: { supportedInterfaces: { 'Alexa.Presentation.APL': {} } },
          },
        },
      };

      const mockAuthService = {
        getUser: async (uid: string) => ({ uid, disabled: false }),
      };

      const response = await processAlexaEnvelope(userEventEnvelope, {
        db: mockDb,
        config: baseConfig,
        authService: mockAuthService,
      });

      expect(response.response.outputSpeech.text).toContain('Pedido criado');
      expect(response.response.shouldEndSession).toBe(true);
    });

    it('rejeita evento de toque APL com draftId ou revisão desatualizada (P1 Segurança)', async () => {
      const mockDb = createMockDb();
      const draftId = 'draft-touch-stale';
      const sessionId = 'sess-touch-stale';

      mockDb.store.alexaDrafts[draftId] = {
        draftId,
        sessionId,
        uid: baseIdentity.uid,
        bindingKey: baseIdentity.bindingKey,
        personId: baseIdentity.personId,
        mode: 'voice_confirm',
        state: 'awaiting_confirmation',
        customer: 'Mariana',
        product: 'Caixa Milk',
        quantity: 5,
        deliveryDate: '2026-10-25',
        price: 60,
        pricingMode: 'total',
        revision: 2,
        createdAt: { toMillis: () => Date.now() },
        expiresAt: { toDate: () => new Date(Date.now() + 600000) },
      };

      // Simula toque com revisão 1 quando a tela atual já está na revisão 2
      const userEventEnvelope = {
        session: {
          sessionId,
          application: { applicationId: baseConfig.allowedSkillId },
          user: { userId: amazonUserId },
          attributes: { draftId, revision: 2, personId: baseIdentity.personId },
        },
        request: {
          type: 'Alexa.Presentation.APL.UserEvent',
          requestId: 'amzn1.echo-api.request.touch-stale-1',
          arguments: ['confirmOrder', draftId, 1],
        },
        context: {
          System: {
            application: { applicationId: baseConfig.allowedSkillId },
            user: { userId: amazonUserId },
            person: { personId: baseIdentity.personId },
            device: { supportedInterfaces: { 'Alexa.Presentation.APL': {} } },
          },
        },
      };

      const response = await processAlexaEnvelope(userEventEnvelope, {
        db: mockDb,
        config: baseConfig,
        authService: { getUser: async (uid: string) => ({ uid, disabled: false }) },
      });

      expect(response.response.outputSpeech.text).toContain('atualizado');
      expect(response.response.shouldEndSession).toBe(false);
    });

    it('REGRESSÃO: todas as 5 telas APL contêm o AlexaBackground oficial com scrim escuro e login-bg', () => {
      const directives = [
        buildWelcomeAplDirective({ userName: 'Caio', envLabel: 'teste' }),
        buildOrderCardAplDirective({
          customer: 'Mariana',
          product: 'Caixa Milk',
          quantity: 5,
          totalPrice: 'R$ 60,00',
        }),
        buildOrderSuccessAplDirective({
          orderNumber: '2026-0099',
          customer: 'Mariana',
          product: 'Caixa Milk',
          quantity: 5,
          totalPrice: 'R$ 60,00',
        }),
        buildFuzzySuggestionsAplDirective({
          spokenTerm: 'caixinha',
          suggestions: [{ id: 'p1', name: 'Caixa Milk', unitPrice: 12 }],
        }),
        buildVoicePairingAplDirective({
          pairingCode: '123456',
        }),
      ];

      for (const dir of directives) {
        expect(dir.document).toBeDefined();
        const mainItems = dir.document.mainTemplate.items;
        expect(Array.isArray(mainItems)).toBe(true);

        // Encontra o componente de fundo AlexaBackground no topo dos itens
        const bgComponent = mainItems[0].items.find((item: any) => item.type === 'AlexaBackground');
        expect(bgComponent).toBeDefined();
        expect(bgComponent.backgroundImageSource).toContain('login-bg-800.png');
        expect(bgComponent.backgroundColor).toBe('#161214');
        expect(bgComponent.colorOverlay).toBe(true);
      }
    });

    it('REGRESSÃO SCHEMA APL: nenhum componente Container possui propriedade spacing inválida', () => {
      const directives = [
        buildWelcomeAplDirective({ userName: 'Caio', envLabel: 'teste' }),
        buildOrderCardAplDirective({
          customer: 'Mariana',
          product: 'Caixa Milk',
          quantity: 5,
          totalPrice: 'R$ 60,00',
        }),
        buildOrderSuccessAplDirective({
          orderNumber: '2026-0099',
          customer: 'Mariana',
          product: 'Caixa Milk',
          quantity: 5,
          totalPrice: 'R$ 60,00',
        }),
        buildFuzzySuggestionsAplDirective({
          spokenTerm: 'caixinha',
          suggestions: [{ id: 'p1', name: 'Caixa Milk', unitPrice: 12 }],
        }),
        buildVoicePairingAplDirective({
          pairingCode: '123456',
        }),
      ];

      function assertNoContainerSpacing(node: any, path: string = 'root') {
        if (!node || typeof node !== 'object') return;

        if (node.type === 'Container') {
          expect(
            node.spacing,
            `Componente Container em ${path} possui a propriedade inválida 'spacing' (incompatível com schema APL)`
          ).toBeUndefined();
        }

        if (Array.isArray(node.items)) {
          node.items.forEach((child: any, idx: number) => {
            assertNoContainerSpacing(child, `${path}.items[${idx}]`);
          });
        }
        if (node.item) {
          assertNoContainerSpacing(node.item, `${path}.item`);
        }
      }

      for (const dir of directives) {
        assertNoContainerSpacing(dir.document.mainTemplate);
      }
    });

    it('REGRESSÃO: painéis e cartões APL utilizam estilo vidro escuro com contraste legível', () => {
      const orderDir = buildOrderCardAplDirective({
        customer: 'Mariana',
        product: 'Caixa Milk',
        quantity: 5,
        totalPrice: 'R$ 60,00',
      });

      const jsonStr = JSON.stringify(orderDir.document);
      // Confirma que os cartões usam a cor translúcida com opacidade alta para contraste AAA
      expect(jsonStr).toContain('rgba(35, 28, 30, 0.88)');
      expect(jsonStr).toContain('rgba(235, 205, 205, 0.22)');
    });
  });
});
