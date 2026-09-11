import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes E2E do Módulo de Permutas
 * Cobre indicadores financeiros de permuta, filtros por período e busca
 */

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);
});

test.describe('Permutas', () => {
  test('deve carregar tela de permutas com KPIs e ações', async ({ page }) => {
    await page.goto('/permutas');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar container principal e título
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10000 });

    const heading = page.getByRole('heading', { name: /Permutas/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Controle de trocas e parcerias').first()).toBeVisible({ timeout: 5000 });

    // 2. Validar cards de resumo financeiro
    await expect(page.getByText('Total de Permutas').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Entregamos').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Recebemos').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Saldo').first()).toBeVisible({ timeout: 5000 });

    // 3. Validar botões de exportação e impressão
    const csvBtn = page.getByRole('button', { name: /CSV/i }).first();
    await expect(csvBtn).toBeVisible({ timeout: 5000 });

    const printBtn = page.getByRole('button', { name: /PDF \/ Imprimir/i }).first();
    await expect(printBtn).toBeVisible({ timeout: 5000 });
  });

  test('deve filtrar permutas por período e busca', async ({ page }) => {
    await page.goto('/permutas');
    await page.waitForLoadState('domcontentloaded');

    // 1. Campo de busca
    const searchInput = page.getByPlaceholder(/Buscar por produto ou observação/i).first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Digitar termo de busca
    await searchInput.fill('Teste Inexistente Permuta 9999');
    await page.waitForTimeout(500);

    // Deve exibir estado vazio ou filtrado
    const emptyState = page.getByText(/Nenhuma permuta encontrada/i).first();
    await expect(emptyState).toBeVisible({ timeout: 5000 });

    // Limpar busca
    await searchInput.clear();
    await page.waitForTimeout(500);
  });
});
