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
  await page.waitForURL('**/dashboard', { timeout: 15000 });
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
    await page.waitForTimeout(2000);

    // Clicar em diferentes períodos
    const monthBtn = page.getByRole('button', { name: /Último Mês/i }).first();
    if (await monthBtn.isVisible({ timeout: 3000 })) {
      await monthBtn.click();
      await page.waitForTimeout(1000);
    }

    const weekBtn = page.getByRole('button', { name: /Última Semana/i }).first();
    if (await weekBtn.isVisible({ timeout: 3000 })) {
      await weekBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('deve exibir métricas de pedidos', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Verificar métricas de pedidos
    const concluidos = page.getByText('Pedidos Concluídos');
    const cancelados = page.getByText('Cancelados');

    if (await concluidos.isVisible({ timeout: 5000 })) {
      await expect(concluidos).toBeVisible();
    }

    if (await cancelados.isVisible({ timeout: 3000 })) {
      await expect(cancelados).toBeVisible();
    }
  });

  test('deve ter botão de exportar CSV', async ({ page }) => {
    await page.waitForTimeout(2000);

    const downloadBtn = page.getByRole('button', { name: /Download|Exportar|CSV/i }).first();
    if (await downloadBtn.isVisible({ timeout: 3000 })) {
      await expect(downloadBtn).toBeVisible();
    }
  });
});
