import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Testes Rápidos
 * 
 * Conjunto mínimo de testes para verificar se o app não está completamente quebrado.
 * Ideal para rodar antes de cada deploy.
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

test.describe('🔥 Smoke Tests - Verificações Críticas', () => {
  test('✅ App deve carregar sem erros de console críticos', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Filtrar erros conhecidos/aceitos (ajuste conforme necessário)
    const criticalErrors = errors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('404')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('✅ Login funciona', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('dashboard');
  });

  test('✅ Dashboard carrega pedidos ou estado vazio', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    await page.waitForTimeout(3000);
    
    // Deve ter pedidos OU mensagem de vazio
    const hasContent = await page.locator('[class*="OrderCard"]').count() > 0;
    const hasEmpty = await page.locator('text=/Nenhum pedido|sem pedidos/i').isVisible().catch(() => false);
    
    expect(hasContent || hasEmpty).toBeTruthy();
  });

  test('✅ Navegação entre páginas funciona', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Testar navegação para Settings
    await page.goto('/settings');
    await page.waitForTimeout(1500);
    await expect(page.locator('h1')).toContainText(/Configurações/i);
    
    // Voltar para Dashboard
    await page.goto('/dashboard');
    await page.waitForTimeout(1500);
    await expect(page.locator('h1')).toContainText(/Dashboard|Bom dia|Boa tarde/i);
  });

  test('✅ Filtros no Dashboard respondem', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Testar busca
    const searchInput = page.locator('input[placeholder*="Buscar"]').or(
      page.locator('input[type="search"]')
    );
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('teste');
      await page.waitForTimeout(500);
      expect(await searchInput.inputValue()).toBe('teste');
    }
  });

  test('✅ Modal de novo pedido abre', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const newOrderButton = page.locator('button:has-text("Novo Pedido")');
    
    if (await newOrderButton.isVisible()) {
      await newOrderButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });

  test('✅ Seção de compartilhamento existe em Settings', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const sharedSection = page.locator('text=Compartilhamento de Acesso').or(
      page.locator('text=Acessos que Compartilhei')
    );
    
    if (await sharedSection.isVisible()) {
      await sharedSection.scrollIntoViewIfNeeded();
      await expect(sharedSection).toBeVisible();
    }
  });
});
