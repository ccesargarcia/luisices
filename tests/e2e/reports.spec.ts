import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes da página de Relatórios
 */

test.beforeEach(async ({ page }) => {
  test.setTimeout(60000);
  await ensureAuthenticated(page);

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
    await expect(page.getByText(/concluído/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/cancelado/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('deve ter botão de exportar CSV', async ({ page }) => {
    const downloadBtn = page.getByRole('button', { name: /Download|Exportar|CSV/i }).first();
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });
  });
});
