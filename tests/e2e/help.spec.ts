import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes E2E da Central de Ajuda
 * Cobre busca de artigos, alternância de abas e FAQ
 */

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);
});

test.describe('Central de Ajuda', () => {
  test('deve carregar central de ajuda e buscar guias', async ({ page }) => {
    await page.goto('/ajuda');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar container principal e cabeçalho
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10000 });

    const heading = page.getByRole('heading', { name: /Central de Ajuda/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // 2. Validar campo de busca
    const searchInput = page
      .getByPlaceholder(/Buscar tópicos, dúvidas ou funcionalidades|O que você precisa aprender/i)
      .or(page.getByRole('textbox', { name: /Buscar tópicos/i }))
      .first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Buscar termo existente
    await searchInput.fill('Pedidos');
    await page.waitForTimeout(300);

    // Deve exibir guias relacionados
    await expect(page.getByText(/Pedidos/i).first()).toBeVisible({ timeout: 5000 });

    // 3. Limpar busca
    await searchInput.clear();
    await page.waitForTimeout(300);
  });

  test('deve alternar para aba de Perguntas Frequentes (FAQ)', async ({ page }) => {
    await page.goto('/ajuda');
    await page.waitForLoadState('domcontentloaded');

    // Clicar na aba de Perguntas Frequentes
    const faqTab = page.getByRole('tab', { name: /Perguntas Frequentes/i }).first();
    await expect(faqTab).toBeVisible({ timeout: 5000 });
    await faqTab.click();

    // Validar itens de perguntas
    await expect(page.getByText(/Como instalar/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('deve encontrar guia de Upload em Lote e FAQs recentes na busca', async ({ page }) => {
    await page.goto('/ajuda');
    await page.waitForLoadState('domcontentloaded');

    // 1. Buscar guia de Upload em Lote
    const searchInput = page
      .getByPlaceholder(/Buscar tópicos, dúvidas ou funcionalidades|O que você precisa aprender/i)
      .first();
    await searchInput.fill('Upload em Lote');
    await page.waitForTimeout(300);

    // Deve exibir o card do guia de upload em lote
    await expect(page.getByText(/Upload em Lote de Produtos/i).first()).toBeVisible({ timeout: 5000 });

    // 2. Ir para FAQ e checar pergunta sobre upload de fotos e Copiloto de IA
    const faqTab = page.getByRole('tab', { name: /Perguntas Frequentes/i }).first();
    await faqTab.click();

    await expect(
      page.getByText(/múltiplos produtos por foto|Copiloto de IA|planilha/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
