import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Suíte de Testes E2E de Responsividade Mobile
 * Executa em viewport de smartphone (ex: Pixel 5 / 393x851)
 */

test.describe('Experiência Mobile e Responsividade', () => {
  test('deve renderizar a barra de navegação inferior (Bottom Bar) em telas móveis', async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Em mobile, a barra inferior deve estar visível
    const bottomNav = page.locator('nav.fixed.bottom-0').or(page.locator('nav:has(button[aria-label="Mais opções"])')).first();
    await expect(bottomNav).toBeVisible({ timeout: 10000 });

    // O botão "Mais" deve estar presente na navegação móvel
    const moreBtn = page.getByRole('button', { name: /Mais opções|Mais/i }).first();
    await expect(moreBtn).toBeVisible({ timeout: 5000 });

    // Clicar em Mais deve abrir o menu suspenso com outras opções
    await moreBtn.click();
    await expect(page.getByText(/Central de Ajuda/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('tela de login deve ser responsiva e sem overflow horizontal', async ({ browser }) => {
    const incognito = await browser.newContext({
      viewport: { width: 375, height: 667 },
      storageState: undefined,
    });
    const page = await incognito.newPage();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verificar se o card de login está visível
    const card = page.locator('form, [class*="Card"]').first();
    await expect(card).toBeVisible({ timeout: 10000 });

    // Verificar se a largura do documento não ultrapassa a viewport (sem scroll horizontal)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await incognito.close();
  });

  test('vitrine pública da loja deve ser fluida e adaptada para toque mobile', async ({ browser }) => {
    const incognito = await browser.newContext({
      viewport: { width: 390, height: 844 },
      storageState: undefined,
    });
    const page = await incognito.newPage();

    await page.goto('/loja');
    await page.waitForLoadState('domcontentloaded');

    // Validar que o campo de busca está visível e utilizável
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Sem overflow horizontal
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await incognito.close();
  });
});
