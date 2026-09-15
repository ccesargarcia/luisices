import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes E2E da Agenda Semanal
 * Cobre carregamento do calendário, navegação de semanas e filtros de status
 */

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);
});

test.describe('Agenda Semanal', () => {
  test('deve carregar agenda semanal com controles de navegação', async ({ page }) => {
    await page.goto('/agenda');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar container principal e título
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10000 });

    const heading = page.getByRole('heading', { name: /Agenda Semanal/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // 2. Validar controles de semana (anterior, próxima)
    const prevWeekBtn = page.getByRole('button', { name: /Semana anterior/i }).first();
    const nextWeekBtn = page.getByRole('button', { name: /Próxima semana/i }).first();
    await expect(prevWeekBtn).toBeVisible({ timeout: 5000 });
    await expect(nextWeekBtn).toBeVisible({ timeout: 5000 });

    // 3. Testar navegação de semana: avançar e voltar
    await nextWeekBtn.click();
    await page.waitForTimeout(300);

    // Botão "Hoje" deve aparecer quando não estamos na semana atual
    const todayBtn = page.getByRole('button', { name: /Hoje/i }).first();
    await expect(todayBtn).toBeVisible({ timeout: 5000 });

    // Clicar em "Hoje" para retornar
    await todayBtn.click();
    await page.waitForTimeout(300);
  });

  test('deve exibir filtros de status e resumo operacional', async ({ page }) => {
    await page.goto('/agenda');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar barra de resumo
    await expect(page.getByText(/entrega/i).first()).toBeVisible({ timeout: 5000 });

    // 2. Validar botão de filtro "Todos"
    const allFilterBtn = page.getByRole('button', { name: /Todos/i }).first();
    await expect(allFilterBtn).toBeVisible({ timeout: 5000 });

    // 3. Clicar no filtro
    await allFilterBtn.click();
    await page.waitForTimeout(300);
  });
});
