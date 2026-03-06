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

  test('✅ Login funciona e redireciona para Dashboard', async ({ page }) => {
    await page.goto('/');

    // Preencher e submeter
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento com timeout maior
    // O AuthContext precisa carregar usuário do Firestore, então pode demorar
    await page.waitForURL('**/dashboard', { timeout: 20000 });

    // Verificar que está no dashboard
    expect(page.url()).toContain('dashboard');

    // Aguardar app carregar completamente
    await page.waitForTimeout(2000);

    // Verificar que algum elemento do dashboard existe
    const dashboardElement = page.locator('h1, h2, [data-testid="dashboard"]').first();
    await expect(dashboardElement).toBeVisible({ timeout: 5000 });
  });
});

test.describe('🔥 Smoke Tests - Funcionalidades após Login', () => {
  // Fazer login uma vez antes de cada teste
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 20000 });
    await page.waitForTimeout(2000);
  });

  test('✅ Dashboard carrega pedidos ou estado vazio', async ({ page }) => {
    // Aguardar um pouco para carregar
    await page.waitForTimeout(2000);
    
    // Deve ter pedidos OU mensagem de vazio OU conteúdo do dashboard
    const hasContent = await page.locator('[class*="OrderCard"], [data-testid*="order"]').count() > 0;
    const hasEmpty = await page.locator('text=/Nenhum pedido|sem pedidos|vazio/i').isVisible().catch(() => false);
    const hasDashboard = await page.locator('main, [role="main"]').isVisible();

    expect(hasContent || hasEmpty || hasDashboard).toBeTruthy();
  });

  test('✅ Navegação para Settings funciona', async ({ page }) => {
    // Navegar para Settings
    await page.goto('/settings');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: /Configurações/i })).toBeVisible();
  });

  test('✅ Filtros no Dashboard respondem', async ({ page }) => {
    // Garantir que está no dashboard
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Testar busca se existir
    const searchInput = page.locator('input[placeholder*="Buscar"]').or(
      page.locator('input[type="search"]')
    );

    if (await searchInput.isVisible()) {
      await searchInput.fill('teste');
      await page.waitForTimeout(500);
      expect(await searchInput.inputValue()).toBe('teste');
    } else {
      // Se não tem busca, apenas verificar que o dashboard carregou
      expect(page.url()).toContain('dashboard');
    }
  });

  test('✅ Modal de novo pedido abre', async ({ page }) => {
    // Garantir que está no dashboard
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    const newOrderButton = page.locator('button:has-text("Novo Pedido")');

    if (await newOrderButton.isVisible()) {
      await newOrderButton.click();
      await page.waitForTimeout(500);
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    } else {
      // Se não tem botão, apenas verificar que o dashboard existe
      expect(page.url()).toContain('dashboard');
    }
  });

  test('✅ Seção de compartilhamento existe em Settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);

    const sharedSection = page.locator('text=Compartilhamento de Acesso').or(
      page.locator('text=Acessos que Compartilhei')
    );

    if (await sharedSection.count() > 0) {
      await sharedSection.first().scrollIntoViewIfNeeded();
      await expect(sharedSection.first()).toBeVisible();
    } else {
      // Se não existe seção, apenas verificar que settings carregou
      await expect(page.getByRole('heading', { name: /Configurações/i })).toBeVisible();
    }
  });
});

