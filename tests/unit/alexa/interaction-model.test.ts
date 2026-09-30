import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const { prepareSkillPackage } = require('../../../alexa/scripts/prepare-skill-package.cjs');

describe('Alexa: Validação Estrutural e Semântica do Interaction Model (pt-BR)', () => {
  const modelPath = path.resolve(__dirname, '../../../alexa/skill-package/interactionModels/custom/pt-BR.json');
  const rawModel = fs.readFileSync(modelPath, 'utf8');
  const model = JSON.parse(rawModel);
  const languageModel = model.interactionModel.languageModel;
  const intents = languageModel.intents;

  it('1. Estrutura mínima e campos obrigatórios do interaction model estão corretos', () => {
    expect(model.interactionModel).toBeDefined();
    expect(languageModel).toBeDefined();
    expect(languageModel.invocationName).toBe('papelaria de testes');
    expect(Array.isArray(intents)).toBe(true);
    expect(intents.length).toBeGreaterThan(10);
  });

  it('2. Todo slot citado em amostras com {slot} deve estar formalmente declarado na intent', () => {
    const undeclared: Array<{ intent: string; slot: string; sample: string }> = [];

    for (const intent of intents) {
      const declaredSlots = new Set((intent.slots || []).map((s: any) => s.name));
      for (const sample of (intent.samples || [])) {
        const matches = sample.match(/\{([^}]+)\}/g) || [];
        for (const match of matches) {
          const slotName = match.replace(/[{}]/g, '');
          if (!declaredSlots.has(slotName)) {
            undeclared.push({ intent: intent.name, slot: slotName, sample });
          }
        }
      }
    }

    expect(undeclared).toEqual([]);
  });

  it('3. Não deve haver amostras exatamente duplicadas na mesma intent ou entre intents diferentes', () => {
    const sampleMap = new Map<string, string>();
    const duplicates: Array<{ sample: string; intent1: string; intent2: string }> = [];

    for (const intent of intents) {
      for (const sample of (intent.samples || [])) {
        const norm = sample.trim().toLowerCase();
        if (sampleMap.has(norm)) {
          duplicates.push({ sample: norm, intent1: sampleMap.get(norm)!, intent2: intent.name });
        } else {
          sampleMap.set(norm, intent.name);
        }
      }
    }

    expect(duplicates).toEqual([]);
  });

  it('4. Nenhuma amostra de intent deve conter palavras de invocação ("papelaria de testes", "luisices") ou "alexa"', () => {
    const forbidden: Array<{ intent: string; sample: string }> = [];

    for (const intent of intents) {
      for (const sample of (intent.samples || [])) {
        const lower = sample.toLowerCase();
        if (lower.includes('alexa') || lower.includes('papelaria de testes') || lower.includes('luisices')) {
          forbidden.push({ intent: intent.name, sample });
        }
      }
    }

    expect(forbidden).toEqual([]);
  });

  it('5. Diretriz Alexa: amostra {customer} isolada deve residir em intent dedicada (ProvideCustomerOnlyIntent)', () => {
    const provideCustomer = intents.find((i: any) => i.name === 'ProvideCustomerIntent');
    expect(provideCustomer).toBeDefined();
    // ProvideCustomerIntent NÃO deve conter a amostra isolada {customer}
    expect(provideCustomer.samples).not.toContain('{customer}');

    const provideCustomerOnly = intents.find((i: any) => i.name === 'ProvideCustomerOnlyIntent');
    expect(provideCustomerOnly).toBeDefined();
    // ProvideCustomerOnlyIntent deve conter exclusivamente a amostra {customer}
    expect(provideCustomerOnly.samples).toEqual(['{customer}']);
    expect(provideCustomerOnly.slots).toEqual([
      { name: 'customer', type: 'AMAZON.FirstName' },
    ]);
  });

  it('6. Cobertura estática de frases longas em CreateOrderIntent', () => {
    const createOrder = intents.find((i: any) => i.name === 'CreateOrderIntent');
    expect(createOrder).toBeDefined();

    // Frase completa com preço unitário e entrega
    expect(createOrder.samples).toContain('criar pedido de {quantity} {product} para {customer} a {unitPrice} reais cada com entrega {deliveryDate}');
    // Frase com preço total e entrega
    expect(createOrder.samples).toContain('criar pedido de {quantity} {product} para {customer} total de {total} reais com entrega {deliveryDate}');
    // Frase com preço ambíguo e entrega
    expect(createOrder.samples).toContain('criar pedido de {product} para {customer} no valor de {ambiguousPrice} reais e entrega {deliveryDate}');
  });

  it('7. Amostras de correção com negação em ProvideDeliveryDateIntent não colidem com AMAZON.NoIntent', () => {
    const deliveryIntent = intents.find((i: any) => i.name === 'ProvideDeliveryDateIntent');
    expect(deliveryIntent).toBeDefined();
    expect(deliveryIntent.samples).toContain('não {deliveryDate}');
    expect(deliveryIntent.samples).toContain('não dia {deliveryDate}');

    const noIntent = intents.find((i: any) => i.name === 'AMAZON.NoIntent');
    expect(noIntent).toBeDefined();
    // AMAZON.NoIntent possui apenas negações puras sem slots
    for (const sample of noIntent.samples) {
      expect(sample).not.toContain('{deliveryDate}');
    }
  });

  it('8. prepareSkillPackage para DEV conserva endpoint Cloudflare, certificado Wildcard e invocação correta', () => {
    const tmpDir = path.resolve(__dirname, '../../../alexa/build/test-validate-model');
    try {
      const res = prepareSkillPackage({
        env: 'dev',
        outputDir: tmpDir,
      });

      expect(res.endpoint).toBe('https://api.dev.luisices.com.br/alexaWebhook');
      expect(res.invocation).toBe('papelaria de testes');

      const manifest = JSON.parse(fs.readFileSync(res.manifestPath, 'utf8'));
      expect(manifest.manifest.apis.custom.endpoint.sslCertificateType).toBe('Wildcard');
      expect(manifest.manifest.apis.custom.endpoint.uri).toBe('https://api.dev.luisices.com.br/alexaWebhook');

      const modelDev = JSON.parse(fs.readFileSync(res.interactionModelPath, 'utf8'));
      expect(modelDev.interactionModel.languageModel.invocationName).toBe('papelaria de testes');
      const devIntents = modelDev.interactionModel.languageModel.intents;
      expect(devIntents.some((i: any) => i.name === 'ProvideCustomerOnlyIntent')).toBe(true);
    } finally {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }
  });
});
