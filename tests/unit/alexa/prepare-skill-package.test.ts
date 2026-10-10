import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const { prepareSkillPackage, DEFAULTS } = require('../../../alexa/scripts/prepare-skill-package.cjs');

describe('Alexa: Preparação Multi-Ambiente do Pacote da Skill (DEV vs PROD)', () => {
  const testOutputDir = path.resolve(__dirname, '../../../alexa/build/test-skill-package');

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('deve preparar o pacote com parâmetros padrão de desenvolvimento (DEV)', () => {
    const res = prepareSkillPackage({
      env: 'dev',
      outputDir: testOutputDir,
    });

    expect(res.env).toBe('dev');
    expect(res.endpoint).toBe('https://api.dev.luisices.com.br/alexaWebhook');
    expect(res.invocation).toBe('ateliê de testes');
    expect(res.skillName).toBe('Ateliê de Testes');
    expect(res.privacyPolicyUrl).toBe('https://dev.luisices.com.br');

    const manifest = JSON.parse(fs.readFileSync(res.manifestPath, 'utf8'));
    expect(manifest.manifest.apis.custom.endpoint.uri).toBe('https://api.dev.luisices.com.br/alexaWebhook');
    expect(manifest.manifest.apis.custom.endpoint.sslCertificateType).toBe('Wildcard');
    expect(manifest.manifest.publishingInformation.locales['pt-BR'].name).toBe('Ateliê de Testes');
    expect(manifest.manifest.publishingInformation.locales['pt-BR'].examplePhrases).toContain('Alexa, abrir ateliê de testes');
    expect(manifest.manifest.privacyAndCompliance.locales['pt-BR'].privacyPolicyUrl).toBe('https://dev.luisices.com.br');

    const interactionModel = JSON.parse(fs.readFileSync(res.interactionModelPath, 'utf8'));
    expect(interactionModel.interactionModel.languageModel.invocationName).toBe('ateliê de testes');
  });

  it('deve preparar o pacote com parâmetros padrão de produção (PROD)', () => {
    const res = prepareSkillPackage({
      env: 'prod',
      outputDir: testOutputDir,
    });

    expect(res.env).toBe('prod');
    expect(res.endpoint).toBe('https://us-central1-papelaria-dashboard.cloudfunctions.net/alexaWebhook');
    expect(res.invocation).toBe('ateliê');
    expect(res.skillName).toBe('Luisices Ateliê');
    expect(res.privacyPolicyUrl).toBe('https://luisices.com.br');

    const manifest = JSON.parse(fs.readFileSync(res.manifestPath, 'utf8'));
    expect(manifest.manifest.apis.custom.endpoint.uri).toBe('https://us-central1-papelaria-dashboard.cloudfunctions.net/alexaWebhook');
    expect(manifest.manifest.publishingInformation.locales['pt-BR'].name).toBe('Luisices Ateliê');
    expect(manifest.manifest.publishingInformation.locales['pt-BR'].examplePhrases).toContain('Alexa, abrir ateliê');
    expect(manifest.manifest.privacyAndCompliance.locales['pt-BR'].privacyPolicyUrl).toBe('https://luisices.com.br');

    const interactionModel = JSON.parse(fs.readFileSync(res.interactionModelPath, 'utf8'));
    expect(interactionModel.interactionModel.languageModel.invocationName).toBe('ateliê');
  });

  it('deve respeitar overrides de endpoint, nome e invocação customizados', () => {
    const res = prepareSkillPackage({
      env: 'prod',
      endpoint: 'https://custom-prod-endpoint.com/webhook',
      invocation: 'caderno de pedidos',
      skillName: 'Caderno de Pedidos Luisices',
      outputDir: testOutputDir,
    });

    expect(res.endpoint).toBe('https://custom-prod-endpoint.com/webhook');
    expect(res.invocation).toBe('caderno de pedidos');
    expect(res.skillName).toBe('Caderno de Pedidos Luisices');

    const manifest = JSON.parse(fs.readFileSync(res.manifestPath, 'utf8'));
    expect(manifest.manifest.apis.custom.endpoint.uri).toBe('https://custom-prod-endpoint.com/webhook');
    expect(manifest.manifest.publishingInformation.locales['pt-BR'].name).toBe('Caderno de Pedidos Luisices');
    expect(manifest.manifest.publishingInformation.locales['pt-BR'].examplePhrases).toContain('Alexa, abrir caderno de pedidos');

    const interactionModel = JSON.parse(fs.readFileSync(res.interactionModelPath, 'utf8'));
    expect(interactionModel.interactionModel.languageModel.invocationName).toBe('caderno de pedidos');
  });

  it('deve lançar erro se o ambiente fornecido for inválido', () => {
    expect(() => {
      prepareSkillPackage({
        env: 'staging',
        outputDir: testOutputDir,
      });
    }).toThrow(/Ambiente inválido/);
  });
});
