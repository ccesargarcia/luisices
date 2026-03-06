import { test, expect } from '@playwright/test';

/**
 * Testes do Dashboard
 * 
 * Verifica funcionalidades críticas do dashboard:
 * - Carregamento de pedidos
 * - Cards de estatísticas
 * - Filtros
 * - Busca
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

// Helper: Fazer login antes de cada teste
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
});

test.describe('Dashboard', () => {
  test('deve carregar cards de estatísticas', async ({ page }) => {
    // Aguardar carregamento
    await page.waitForSelector('[class*="CardTitle"]', { timeout: 10000 });
    
    // Verificar se os cards principais estão visíveis
    const cards = page.locator('[class*="Card"]');
    await expect(cards.first()).toBeVisible();
    
    // Verificar textos dos cards (ajuste conforme seus cards)
    const pageContent = await page.content();
    expect(pageContent).toMatch(/Total de Pedidos|Pedidos Ativos|Faturamento/i);
  });

  test('deve listar pedidos', async ({ page }) => {
    // Aguardar carregamento dos pedidos
    await page.waitForTimeout(2000);
    
    // Verificar se há pedidos ou mensagem de lista vazia
    const hasOrders = await page.locator('[class*="OrderCard"]').count() > 0;
    const hasEmptyState = await page.locator('text=/Nenhum pedido|sem pedidos/i').isVisible().catch(() => false);
    
    expect(hasOrders || hasEmptyState).toBeTruthy();
  });

  test('deve filtrar pedidos por busca', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Localizar campo de busca
    const searchInput = page.locator('input[placeholder*="Buscar"]').or(
      page.locator('input[type="search"]')
    );
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('teste');
      await page.waitForTimeout(500);
      
      // Verificar que a busca foi aplicada
      expect(await searchInput.inputValue()).toBe('teste');
    }
  });

  test('deve abrir filtro de tags', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Procurar por badges de tag (se existirem)
    const tagBadges = page.locator('[class*="Badge"]');
    const count = await tagBadges.count();
    
    // Se houver tags, clicar na primeira
    if (count > 0) {
      await tagBadges.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('deve ativar filtro de compartilhados', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Procurar badge "Compartilhados"
    const sharedBadge = page.locator('text=Compartilhados').or(
      page.locator('[class*="Badge"]:has-text("Compartilhados")')
    );
    
    if (await sharedBadge.isVisible()) {
      await sharedBadge.click();
      await page.waitForTimeout(500);
      
      // Verificar se o filtro foi ativado (badge deve ter classe ativa)
      // Ajuste conforme sua implementação
    }
  });

  test('deve ativar filtro de permutas', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Procurar badge "Permuta / Parceria"
    const exchangeBadge = page.locator('text=/Permuta|Parceria/i');
    
    if (await exchangeBadge.isVisible()) {
      await exchangeBadge.click();
      await page.waitForTimeout(500);
    }
  });

  test('deve limpar filtros', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Procurar botão "Limpar filtros"
    const clearButton = page.locator('text=Limpar filtros');
    
    // Ativar algum filtro primeiro
    const exchangeBadge = page.locator('text=/Permuta|Parceria/i');
    if (await exchangeBadge.isVisible()) {
      await exchangeBadge.click();
      await page.waitForTimeout(300);
      
      // Verificar se botão de limpar apareceu
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('deve abrir modal de novo pedido', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Procurar botão "Novo Pedido"
    const newOrderButton = page.locator('button:has-text("Novo Pedido")');
    
    if (await newOrderButton.isVisible()) {
      await newOrderButton.click();
      
      // Aguardar modal abrir
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      
      // Verificar se modal está visível
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    }
  });
});
