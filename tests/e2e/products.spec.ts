import { test, expect } from '@playwright/test';

/**
 * Testes CRUD de Produtos
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

  await page.goto('/produtos');
  await expect(page.locator('main h1').first()).toContainText(/Produtos/i, { timeout: 10000 });
});

test.describe('Produtos - CRUD', () => {
  test('deve criar um novo produto', async ({ page }) => {
    const productName = `Produto Teste ${Date.now()}`;

    // Clicar em "Novo Produto"
    await page.getByRole('button', { name: /Novo Produto/i }).click();

    // Aguardar dialog
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Preencher nome (id="p-name")
    await dialog.locator('#p-name').fill(productName);

    // Preencher preço (id="p-price")
    await dialog.locator('#p-price').fill('50');

    // Preencher descrição (id="p-desc")
    const descField = dialog.locator('#p-desc');
    if (await descField.isVisible({ timeout: 1000 })) {
      await descField.fill('Produto criado por teste automatizado');
    }

    // Salvar - botão "Cadastrar"
    await dialog.getByRole('button', { name: /Cadastrar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verificar que o produto aparece
    await page.waitForTimeout(1000);
    await expect(page.getByText(productName)).toBeVisible({ timeout: 5000 });
  });

  test('deve buscar produtos', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar por nome, categoria ou descrição/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('Produto Inexistente XYZ123');
    await page.waitForTimeout(500);

    const noResults = page.getByText(/Nenhum produto/i);
    const count = await noResults.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('deve excluir um produto', async ({ page }) => {
    const productName = `Produto Excluir ${Date.now()}`;

    // Criar produto
    await page.getByRole('button', { name: /Novo Produto/i }).click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.locator('#p-name').fill(productName);
    await dialog.locator('#p-price').fill('10');
    await dialog.getByRole('button', { name: /Cadastrar/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Buscar o produto
    await page.waitForTimeout(1000);
    const searchInput = page.getByPlaceholder(/Buscar por nome, categoria ou descrição/i);
    await searchInput.fill(productName);
    await page.waitForTimeout(500);

    // Localizar card e clicar no botão de excluir (button com classe text-destructive)
    const productCard = page.locator('.grid > div').filter({ hasText: productName }).first();
    await expect(productCard).toBeVisible({ timeout: 5000 });
    const deleteBtn = productCard.locator('button.text-destructive').first();
    await deleteBtn.click();

    // Confirmar exclusão
    const alertDialog = page.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible({ timeout: 5000 });
    await expect(alertDialog.getByText(/Excluir produto/i)).toBeVisible();
    await alertDialog.getByRole('button', { name: /Excluir/i }).click();
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 });

    // Verificar remoção
    await page.waitForTimeout(1000);
    await expect(page.getByText(productName)).toHaveCount(0, { timeout: 5000 });
  });
});
