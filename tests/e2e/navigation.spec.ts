import { test, expect } from '@playwright/test';

/**
 * Testes de Navegação
 *
 * Verifica se todas as páginas principais carregam corretamente
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

test.describe('Navegação entre Páginas', () => {
  const pages = [
    { name: 'Dashboard', path: '/dashboard', heading: /Dashboard|Bom dia|Boa tarde|Boa noite/i },
    { name: 'Clientes', path: '/clientes', heading: /Clientes/i },
    { name: 'Produtos', path: '/produtos', heading: /Produtos/i },
    { name: 'Orçamentos', path: '/orcamentos', heading: /Orçamentos/i },
    { name: 'Galeria', path: '/galeria', heading: /Galeria/i },
  ];

  for (const { name, path, heading } of pages) {
    test(`deve carregar página ${name}`, async ({ page }) => {
      await page.goto(path);
      
      // Esperar o h1 da página aparecer ao invés de networkidle
      // (Firebase mantém conexões abertas, networkidle pode nunca acontecer)
      const pageHeading = page.locator('main h1').first();
      await expect(pageHeading).toContainText(heading, { timeout: 10000 });

      // Verificar se não há erros visíveis
      const errorText = await page.locator('text=/erro|error/i').count();
      expect(errorText).toBe(0);
    });
  }

  test('deve navegar usando menu lateral', async ({ page }) => {
    // Procurar link de Clientes no menu
    const customersLink = page.locator('a[href*="clientes"]').first();
    await expect(customersLink).toBeVisible({ timeout: 5000 });
    
    await customersLink.click();
    await page.waitForURL('**/clientes', { timeout: 5000 });
    
    // Esperar o h1 da página de clientes
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 10000 });
  });

  test('deve voltar ao dashboard usando logo/home', async ({ page }) => {
    // Ir para outra página primeiro
    await page.goto('/clientes');
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 10000 });

    // Clicar no link do Dashboard no menu de navegação
    const homeButton = page.locator('a[href="/"]').first();
    await expect(homeButton).toBeVisible({ timeout: 5000 });
    
    await homeButton.click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    
    // Verificar que voltou ao dashboard
    await expect(page.locator('main h1').first()).toContainText(/Dashboard|Bom dia|Boa tarde|Boa noite/i, { timeout: 10000 });
  });
});
