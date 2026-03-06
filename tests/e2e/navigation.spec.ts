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
    { name: 'Dashboard', path: '/dashboard', heading: /Dashboard|Bom dia|Boa tarde/i },
    { name: 'Clientes', path: '/customers', heading: /Clientes/i },
    { name: 'Produtos', path: '/products', heading: /Produtos/i },
    { name: 'Orçamentos', path: '/quotes', heading: /Orçamentos/i },
    { name: 'Galeria', path: '/gallery', heading: /Galeria/i },
    { name: 'Configurações', path: '/settings', heading: /Configurações/i },
  ];

  for (const { name, path, heading } of pages) {
    test(`deve carregar página ${name}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(1500);

      // Verificar se a página carregou
      await expect(page.locator('h1')).toContainText(heading);

      // Verificar se não há erros visíveis
      const errorText = await page.locator('text=/erro|error/i').count();
      expect(errorText).toBe(0);
    });
  }

  test('deve navegar usando menu lateral', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Procurar link de Clientes no menu
    const customersLink = page.locator('a[href*="customers"]');

    if (await customersLink.isVisible()) {
      await customersLink.click();
      await page.waitForURL('**/customers', { timeout: 5000 });
      await expect(page.locator('h1')).toContainText(/Clientes/i);
    }
  });

  test('deve voltar ao dashboard usando logo/home', async ({ page }) => {
    // Ir para outra página
    await page.goto('/settings');
    await page.waitForTimeout(1000);

    // Clicar no logo ou botão home
    const homeButton = page.locator('a[href="/dashboard"]').or(
      page.locator('a[href="/"]')
    ).first();

    if (await homeButton.isVisible()) {
      await homeButton.click();
      await page.waitForURL('**/dashboard', { timeout: 5000 });
    }
  });
});
