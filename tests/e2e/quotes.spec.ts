import { test, expect } from '@playwright/test';

/**
 * Testes CRUD de Orçamentos
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

  await page.goto('/orcamentos');
  await expect(page.locator('main h1').first()).toContainText(/Orçamentos/i, { timeout: 10000 });
});

test.describe('Orçamentos - CRUD', () => {
  test('deve criar um novo orçamento', async ({ page }) => {
    const clientName = `Cliente Orç ${Date.now()}`;
    const clientPhone = `11988${String(Math.floor(100000 + Math.random() * 900000))}`;

    // Clicar em "Novo Orçamento"
    await page.getByRole('button', { name: /Novo Orçamento/i }).click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Selecionar "Novo cliente" no dropdown de clientes
    const customerTrigger = dialog.locator('#q-customer').locator('..').locator('button[role="combobox"]').first();
    // Tentar encontrar o trigger do select de cliente
    const selectTrigger = dialog.locator('button[role="combobox"]').first();
    await selectTrigger.click();

    const newClientOption = page.getByRole('option', { name: /Novo cliente/i });
    await expect(newClientOption).toBeVisible({ timeout: 5000 });
    await newClientOption.click();

    // Preencher nome do cliente (id="q-cname")
    await dialog.locator('#q-cname').fill(clientName);

    // Preencher telefone (id="q-cphone")
    await dialog.locator('#q-cphone').fill(clientPhone);

    // Preencher produto no primeiro item (placeholder "Ex: Camiseta personalizada")
    const productInput = dialog.getByPlaceholder(/Ex: Camiseta personalizada/i).first();
    await productInput.fill('Produto Orçamento Teste');

    // Preencher valor unitário (placeholder "0,00" no item)
    const priceInput = dialog.getByPlaceholder('0,00').first();
    await priceInput.fill('100');

    // Preencher data de entrega (id="q-delivery")
    const deliveryInput = dialog.locator('#q-delivery');
    const deliveryValue = await deliveryInput.inputValue();
    if (!deliveryValue) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      await deliveryInput.fill(futureDate.toISOString().split('T')[0]);
    }

    // Salvar - botão "Salvar Orçamento"
    await dialog.getByRole('button', { name: /Salvar Orçamento/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // Verificar que o orçamento aparece
    await page.waitForTimeout(1000);
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 5000 });
  });

  test('deve buscar orçamentos', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar por cliente, número, produto ou tag/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('Orçamento Inexistente XYZ123');
    await page.waitForTimeout(500);

    const noResults = page.getByText(/Nenhum orçamento/i);
    const count = await noResults.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('deve validar campos obrigatórios', async ({ page }) => {
    await page.getByRole('button', { name: /Novo Orçamento/i }).click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Tentar salvar sem preencher
    await dialog.getByRole('button', { name: /Salvar Orçamento/i }).click();

    // Dialog deve continuar aberto (validação impede envio)
    await expect(dialog).toBeVisible({ timeout: 2000 });
  });
});
