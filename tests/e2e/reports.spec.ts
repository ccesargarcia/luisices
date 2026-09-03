import { test, expect } from '@playwright/test';

/**
 * Testes da página de Relatórios
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

test.beforeEach(async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });

  await page.goto('/relatorios');
  await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
});

test.describe('Relatórios', () => {
  test('deve exibir KPIs de receita', async ({ page }) => {
    // Verificar que os cards de KPI existem
    await expect(page.getByText('Receita Total')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Ticket Médio')).toBeVisible();
  });

  test('deve alterar período dos relatórios', async ({ page }) => {
    // Clicar em diferentes períodos
    const monthBtn = page.getByRole('button', { name: 'Mês', exact: true });
    await expect(monthBtn).toBeVisible({ timeout: 5000 });
    await monthBtn.click();

    const weekBtn = page.getByRole('button', { name: 'Semana', exact: true });
    await expect(weekBtn).toBeVisible({ timeout: 5000 });
    await weekBtn.click();
  });

  test('deve exibir métricas de pedidos', async ({ page }) => {
    // Verificar métricas de pedidos
    await expect(page.getByText(/concluídos/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/cancelados/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('deve ter botão de exportar CSV', async ({ page }) => {
    const downloadBtn = page.getByRole('button', { name: /Download|Exportar|CSV/i }).first();
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });
  });
});
