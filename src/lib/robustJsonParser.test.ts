import { describe, it, expect } from 'vitest';
import { sanitizeLlmJson, extractKeysFromLlmText, parseLlmJson } from './robustJsonParser';

describe('robustJsonParser', () => {
  it('should parse valid JSON directly', () => {
    const raw = '{"title": "Meu Ateliê", "text": "Bem-vindo!"}';
    const parsed = parseLlmJson(raw, { title: '', text: '' });
    expect(parsed.title).toBe('Meu Ateliê');
    expect(parsed.text).toBe('Bem-vindo!');
  });

  it('should handle unescaped literal newlines inside string values (the position 206 error)', () => {
    const raw = `\`\`\`json
{
  "catalogAboutTitle": "Feito à Mão",
  "catalogAboutText": "Primeiro parágrafo da história.
  
Segundo parágrafo com quebra literal.
Terceiro parágrafo.",
  "catalogAboutPillar1Title": "Produção Artesanal"
}
\`\`\``;

    const parsed = parseLlmJson(raw, {
      catalogAboutTitle: '',
      catalogAboutText: '',
      catalogAboutPillar1Title: '',
    });

    expect(parsed.catalogAboutTitle).toBe('Feito à Mão');
    expect(parsed.catalogAboutText).toContain('Primeiro parágrafo da história.');
    expect(parsed.catalogAboutText).toContain('Segundo parágrafo com quebra literal.');
    expect(parsed.catalogAboutPillar1Title).toBe('Produção Artesanal');
  });

  it('should handle trailing commas before closing braces', () => {
    const raw = `{
      "title": "Mimos",
      "tags": ["artesanato", "papelaria",],
    }`;
    const parsed = parseLlmJson(raw, { title: '', tags: [] as string[] });
    expect(parsed.title).toBe('Mimos');
    expect(parsed.tags).toEqual(['artesanato', 'papelaria']);
  });

  it('should recover fields deterministically using regex if JSON is completely malformed or truncated', () => {
    const raw = `Olá, aqui estão os dados solicitados para a loja:
"catalogAboutTitle": "Ateliê Sonhos Reais",
"catalogAboutText": "História sem as chaves JSON válidas ao redor.",
"catalogAboutPillar1Title": "Qualidade Nobre"`;

    const parsed = parseLlmJson(raw, {
      catalogAboutTitle: 'Default Title',
      catalogAboutText: 'Default Text',
      catalogAboutPillar1Title: 'Default Pillar',
    });

    expect(parsed.catalogAboutTitle).toBe('Ateliê Sonhos Reais');
    expect(parsed.catalogAboutText).toBe('História sem as chaves JSON válidas ao redor.');
    expect(parsed.catalogAboutPillar1Title).toBe('Qualidade Nobre');
  });
});
