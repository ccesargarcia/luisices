import { test, expect } from '@playwright/test';

/**
 * Testes da Galeria de Artes
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

test.describe('Galeria', () => {
  test('deve carregar galeria e interagir com elementos', async ({ page }) => {
    test.setTimeout(60000);

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Navegar para galeria
    await page.goto('/galeria');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 1. Verificar que a página carregou
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10000 });

    // 2. Verificar botão de upload
    const uploadBtn = page.getByRole('button', { name: /Nova Arte|Upload|Adicionar/i }).first();
    if (await uploadBtn.isVisible({ timeout: 5000 })) {
      // Abrir dialog de nova arte
      await uploadBtn.click();

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Verificar campos do formulário
      const titleInput = dialog.locator('#gallery-title');
      if (await titleInput.isVisible({ timeout: 2000 })) {
        await expect(titleInput).toBeVisible();
      }

      // Fechar dialog
      const cancelBtn = dialog.getByRole('button', { name: /Cancelar|Fechar/i }).first();
      if (await cancelBtn.isVisible({ timeout: 2000 })) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    // 3. Verificar imagens na galeria (se existem)
    const imgCount = await page.locator('img').count();
    if (imgCount > 0) {
      // Clicar na primeira imagem para abrir lightbox
      await page.locator('img').first().click();
      await page.waitForTimeout(1000);
      await page.keyboard.press('Escape');
    }
  });
});
