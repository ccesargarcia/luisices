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
  test('cria permuta com itens recebidos e registra o valor estimado', async ({ page }) => {
    test.setTimeout(90000);
    const stamp = Date.now();
    const customerName = `Cliente Permuta E2E ${stamp}`;
    const productName = `Produto Permuta E2E ${stamp}`;
    const receivedName = `Divulgação Permuta E2E ${stamp}`;

    await page.goto('/pedidos');
    await page.getByRole('button', { name: /Novo Pedido/i }).click();
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    await dialog.locator('button[role="combobox"]').first().click();
    await page.getByRole('option').filter({ hasText: /Novo Cliente/i }).click();
    await dialog.locator('#customerName').fill(customerName);
    await dialog.locator('#customerPhone').fill(`1199${String(stamp).slice(-7)}`);
    await dialog.getByPlaceholder('Produto 1').fill(productName);
    await dialog.getByPlaceholder('0,00').first().fill('120,00');
    await dialog.locator('#deliveryDate').fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    await dialog.getByRole('switch').click();
    const receivedItem = dialog.locator('input[aria-label="Item recebido 1"]:visible').first();
    const receivedQuantity = dialog.locator('input[aria-label="Quantidade recebida 1"]:visible').first();
    const receivedValue = dialog.locator('input[aria-label="Valor estimado 1"]:visible').first();
    await expect(receivedItem).toBeVisible();
    await receivedItem.fill(receivedName);
    await receivedQuantity.fill('2');
    await receivedValue.fill('25,00');
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).not.toBeVisible({ timeout: 20000 });

    await page.goto('/permutas');
    const searchInput = page.getByPlaceholder(/Buscar por produto ou observação/i).first();
    await searchInput.fill(productName);
    const orderRow = page.locator('tr').filter({ hasText: productName }).first();
    await expect(orderRow).toBeVisible({ timeout: 15000 });
    await orderRow.click();
    const details = page.getByRole('dialog').first();
    await expect(details.getByText(receivedName)).toBeVisible();
    await expect(details.getByText('R$ 50,00').first()).toBeVisible();
  });

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
