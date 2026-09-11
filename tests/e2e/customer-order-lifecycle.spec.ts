import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Teste integrado: Ciclo de vida completo
 * 1. Criar cliente
 * 2. Criar pedido associado ao cliente
 * 3. Editar o pedido
 * 4. Remover o pedido
 * 5. Remover o cliente
 */

const timestamp = Date.now();
const testCustomer = {
  name: `Lifecycle ${timestamp}`,
  phone: `11999${String(Math.floor(100000 + Math.random() * 900000))}`,
  email: `lifecycle${timestamp}@test.com`,
};

const testProduct = {
  name: `Produto Lifecycle ${timestamp}`,
  quantity: '2',
  unitPrice: '50',
};

test.describe.serial('Ciclo de vida: Cliente + Pedido', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page);
  });

  test('1 - Criar cliente', async ({ page }) => {
    // Ir para Clientes
    await page.goto('/clientes');
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 10000 });

    // Abrir diálogo de novo cliente
    await page.getByRole('button', { name: /Novo Cliente/i }).click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Preencher formulário
    await dialog.getByPlaceholder(/Nome completo/i).fill(testCustomer.name);
    await dialog.getByPlaceholder(/00000-0000/i).fill(testCustomer.phone);
    const emailInput = dialog.getByPlaceholder(/email@exemplo/i);
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill(testCustomer.email);

    // Salvar
    await dialog.getByRole('button', { name: /Criar Cliente/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    // Verificar que o cliente aparece
    const customerCard = page.getByText(testCustomer.name);
    await expect(customerCard).toBeVisible({ timeout: 10000 });
  });

  test('2 - Criar pedido associado ao cliente', async ({ page }) => {
    test.setTimeout(60000);
    // Ir para Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });

    // Abrir diálogo de novo pedido
    await page.getByRole('button', { name: /Novo Pedido/i }).click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Selecionar cliente no dropdown
    const selectTrigger = dialog.locator('button[role="combobox"]').first();
    await selectTrigger.click();

    // Encontrar e selecionar o cliente criado no passo 1
    const customerOption = page.locator('[role="option"]').filter({ hasText: testCustomer.name }).first();
    await expect(customerOption).toBeVisible({ timeout: 5000 });
    await customerOption.click();

    // Preencher produto
    const productInput = dialog.getByPlaceholder(/Produto 1/i);
    await productInput.fill(testProduct.name);

    // Preencher valor unitário
    const priceInput = dialog.getByPlaceholder('0,00').first();
    await priceInput.fill(testProduct.unitPrice);

    // Data de entrega - preencher se vazio
    const dateInput = dialog.locator('#deliveryDate');
    const dateValue = await dateInput.inputValue();
    if (!dateValue) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      await dateInput.fill(futureDate.toISOString().split('T')[0]);
    }

    // Submeter
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verificar que o pedido aparece no dashboard
    await expect(page.getByText(testCustomer.name).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(testProduct.name).first()).toBeVisible({ timeout: 10000 });
  });

  test('3 - Editar o pedido', async ({ page }) => {
    // Localizar o card do pedido pelo nome do cliente e clicar nele
    const orderCard = page.locator('.cursor-pointer').filter({ hasText: testCustomer.name }).first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await orderCard.click();

    // Aguardar dialog de detalhes abrir
    const detailsDialog = page.locator('[role="dialog"]').first();
    await expect(detailsDialog).toBeVisible({ timeout: 5000 });

    // Clicar em "Editar Pedido"
    const editBtn = detailsDialog.getByRole('button', { name: /Editar Pedido/i });
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // Alterar observações no formulário de edição
    const notesInput = detailsDialog.locator('textarea').first();
    if (await notesInput.isVisible({ timeout: 3000 })) {
      await notesInput.fill('Observação atualizada pelo teste E2E');
    }

    // Salvar edição
    const saveEditBtn = detailsDialog.getByRole('button', { name: /Salvar Alterações/i });
    if (await saveEditBtn.isVisible({ timeout: 3000 })) {
      await saveEditBtn.click();
    }

    // Fechar dialog
    const closeBtn = detailsDialog.locator('button[aria-label="Close"]').or(
      detailsDialog.getByRole('button', { name: /Fechar/i })
    ).first();
    if (await closeBtn.isVisible({ timeout: 3000 })) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(detailsDialog).not.toBeVisible({ timeout: 5000 });
  });

  test('4 - Remover o pedido', async ({ page }) => {
    // Clicar no card do pedido
    const orderCard = page.locator('.cursor-pointer').filter({ hasText: testCustomer.name }).first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await orderCard.click();

    // Aguardar dialog de detalhes
    const detailsDialog = page.locator('[role="dialog"]').first();
    await expect(detailsDialog).toBeVisible({ timeout: 5000 });

    // Clicar no botão de excluir pedido
    const deleteBtn = detailsDialog.getByRole('button', { name: /Excluir Pedido/i });
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click();

    // Confirmar exclusão no alert dialog
    const alertDialog = page.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible({ timeout: 5000 });
    await alertDialog.getByRole('button', { name: /Excluir/i }).click();

    // Aguardar diálogos fecharem
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 });
    await expect(detailsDialog).not.toBeVisible({ timeout: 10000 });

    // Verificar que o card sumiu do dashboard
    const remainingCards = page.locator('.cursor-pointer').filter({ hasText: testCustomer.name });
    await expect(remainingCards).toHaveCount(0, { timeout: 10000 });
  });

  test('5 - Remover o cliente', async ({ page }) => {
    // Ir para Clientes
    await page.goto('/clientes');
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 10000 });

    // Buscar o cliente pelo nome
    const searchInput = page.getByPlaceholder(/Buscar por nome, telefone ou email/i);
    await searchInput.fill(testCustomer.name);

    // Localizar o card do cliente
    const card = page.locator('[data-slot="card"]').filter({ hasText: testCustomer.name }).first();
    await expect(card).toBeVisible({ timeout: 10000 });

    // Clicar no botão de remover cliente
    const deleteBtn = card.getByRole('button', { name: new RegExp(`Remover ${testCustomer.name}`, 'i') });
    await deleteBtn.click();

    // Confirmar exclusão
    const alertDialog = page.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible({ timeout: 5000 });
    await alertDialog.getByRole('button', { name: /Excluir/i }).click();
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 });

    // Verificar que o cliente não aparece mais
    await expect(page.getByText(testCustomer.name)).toHaveCount(0, { timeout: 10000 });
  });
});
