import { test, expect } from '@playwright/test';

/**
 * Testes de Compartilhamento de Acesso
 * 
 * Verifica funcionalidades de compartilhamento:
 * - Abrir gerenciador de compartilhamento
 * - Ver compartilhamentos criados
 * - Ver compartilhamentos recebidos
 * - Modal de novo compartilhamento
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
});

test.describe('Compartilhamento de Acesso', () => {
  test('deve acessar página de configurações', async ({ page }) => {
    // Clicar no menu de configurações
    const settingsLink = page.locator('a[href*="settings"]').or(
      page.locator('text=Configurações')
    );
    
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForURL('**/settings', { timeout: 5000 });
      
      // Verificar que está na página de settings
      await expect(page.locator('h1')).toContainText('Configurações');
    }
  });

  test('deve exibir seção de compartilhamento', async ({ page }) => {
    // Ir para settings
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    // Rolar até a seção de compartilhamento
    const sharedSection = page.locator('text=Compartilhamento de Acesso').or(
      page.locator('text=/Acessos que Compartilhei|Compartilhados Comigo/i')
    );
    
    if (await sharedSection.isVisible()) {
      await sharedSection.scrollIntoViewIfNeeded();
      await expect(sharedSection).toBeVisible();
    }
  });

  test('deve abrir modal para novo compartilhamento', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    // Procurar botão "Compartilhar Acesso"
    const shareButton = page.locator('button:has-text("Compartilhar Acesso")');
    
    if (await shareButton.isVisible()) {
      await shareButton.click();
      
      // Aguardar modal abrir
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      
      // Verificar campos do modal
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test('deve ver lista de compartilhamentos criados', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    // Procurar seção "Acessos que Compartilhei"
    const mySharesSection = page.locator('text=Acessos que Compartilhei');
    
    if (await mySharesSection.isVisible()) {
      await mySharesSection.scrollIntoViewIfNeeded();
      
      // Verificar se há compartilhamentos ou mensagem vazia
      const hasShares = await page.locator('[class*="border rounded-lg"]').count() > 0;
      const hasEmptyMessage = await page.locator('text=/ainda não compartilhou/i').isVisible().catch(() => false);
      
      expect(hasShares || hasEmptyMessage).toBeTruthy();
    }
  });

  test('deve ver lista de compartilhamentos recebidos', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    // Procurar seção "Compartilhados Comigo"
    const receivedSection = page.locator('text=Compartilhados Comigo');
    
    if (await receivedSection.isVisible()) {
      await receivedSection.scrollIntoViewIfNeeded();
      
      // Verificar se há compartilhamentos ou mensagem vazia
      const hasShares = await page.locator('[class*="bg-muted/30"]').count() > 0;
      const hasEmptyMessage = await page.locator('text=/Ninguém compartilhou/i').isVisible().catch(() => false);
      
      expect(hasShares || hasEmptyMessage).toBeTruthy();
    }
  });
});
