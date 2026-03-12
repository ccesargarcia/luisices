import { test, expect } from '@playwright/test';

/**
 * Teste integrado: Ciclo de vida completo
 * 1. Criar cliente
 * 2. Criar pedido associado ao cliente
 * 3. Editar o pedido
 * 4. Remover o pedido
 * 5. Remover o cliente
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

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
  test('1 - Criar cliente', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

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
    if (await emailInput.isVisible({ timeout: 1000 })) {
      await emailInput.fill(testCustomer.email);
    }

    // Salvar
    await dialog.getByRole('button', { name: /Criar Cliente/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verificar que o cliente aparece
    await page.waitForTimeout(1000);
    await expect(page.getByText(testCustomer.name)).toBeVisible({ timeout: 5000 });
  });

  test('2 - Criar pedido associado ao cliente', async ({ page }) => {
    test.setTimeout(60000);
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Clicar em "Novo Pedido"
    const newOrderBtn = page.getByRole('button', { name: /Novo Pedido/i });
    await expect(newOrderBtn).toBeVisible({ timeout: 10000 });
    await newOrderBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Selecionar o cliente criado no dropdown
    const customerSelect = dialog.locator('#customer').first();
    // Radix Select: click trigger then select option
    const selectTrigger = dialog.locator('button[role="combobox"]').first();
    await selectTrigger.click();


    // Aguardar o dropdown abrir e selecionar o cliente pelo nome
    const option = page.getByRole('option', { name: new RegExp(testCustomer.name, 'i') });
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();

    // Preencher produto
    const productInput = dialog.getByPlaceholder(/Produto 1/i);
    await productInput.fill(testProduct.name);

    // Preencher quantidade
    const qtyInputs = dialog.locator('input[type="number"][min="1"]');
    await qtyInputs.first().fill(testProduct.quantity);

    // Preencher valor unitário
    const priceInput = dialog.getByPlaceholder('0,00').first();
    await priceInput.fill(testProduct.unitPrice);

    // Data de entrega - preencher se não estiver preenchido
    const dateInput = dialog.locator('#deliveryDate');
    const dateValue = await dateInput.inputValue();
    if (!dateValue) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      await dateInput.fill(futureDate.toISOString().split('T')[0]);
    }

    // Submeter - botão "Adicionar Pedido"
    const submitBtn = dialog.getByRole('button', { name: /Adicionar Pedido/i });
    await submitBtn.click();

    // Aguardar dialog fechar
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // Verificar que o pedido aparece no dashboard
    await page.waitForTimeout(1500);
    await expect(page.getByText(testCustomer.name).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(testProduct.name).first()).toBeVisible({ timeout: 5000 });
  });

  test('3 - Editar o pedido', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Aguardar cards carregarem
    await page.waitForTimeout(2000);

    // Localizar o card do pedido pelo nome do cliente e clicar nele
    // Os cards têm classe cursor-pointer e onClick
    const orderCard = page.locator('.cursor-pointer').filter({ hasText: testCustomer.name }).first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await orderCard.click();

    // Aguardar dialog de detalhes abrir
    const detailsDialog = page.locator('[role="dialog"]').first();
    await expect(detailsDialog).toBeVisible({ timeout: 10000 });
    await expect(detailsDialog.getByText(/Detalhes do Pedido/i)).toBeVisible({ timeout: 5000 });

    // Clicar em "Editar"
    const editBtn = detailsDialog.getByRole('button', { name: /^Editar$/i });
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // Aguardar modo de edição - título muda para "Editar Pedido"
    await expect(detailsDialog.getByText(/Editar Pedido/i)).toBeVisible({ timeout: 5000 });

    // Editar observação (campo notes via textarea)
    const notesField = detailsDialog.locator('#notes');
    await notesField.fill('Observação editada pelo teste automatizado');

    // Salvar alterações
    const saveBtn = detailsDialog.getByRole('button', { name: /Salvar Alterações/i });
    await saveBtn.click();

    // Aguardar sair do modo de edição (título volta para "Detalhes do Pedido")
    await expect(detailsDialog.getByText(/Detalhes do Pedido/i)).toBeVisible({ timeout: 10000 });

    // Fechar dialog
    const closeBtn = detailsDialog.getByRole('button', { name: /Fechar/i });
    await closeBtn.click();
    await expect(detailsDialog).not.toBeVisible({ timeout: 5000 });
  });

  test('4 - Remover o pedido', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Aguardar cards carregarem
    await page.waitForTimeout(2000);

    // Clicar no card do pedido
    const orderCard = page.locator('.cursor-pointer').filter({ hasText: testCustomer.name }).first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await orderCard.click();

    // Aguardar dialog de detalhes
    const detailsDialog = page.locator('[role="dialog"]').first();
    await expect(detailsDialog).toBeVisible({ timeout: 10000 });

    // Clicar em "Excluir Pedido" (scroll down se necessário)
    const deleteBtn = detailsDialog.getByRole('button', { name: /Excluir Pedido/i });
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click();

    // Confirmar exclusão no AlertDialog
    const alertDialog = page.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible({ timeout: 5000 });
    await expect(alertDialog.getByText(/Excluir pedido\?/i)).toBeVisible();

    // Clicar no botão "Excluir" de confirmação
    const confirmBtn = alertDialog.getByRole('button', { name: /Excluir/i });
    await confirmBtn.click();

    // Aguardar dialogs fecharem
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // Verificar que o pedido não aparece mais no dashboard
    // Buscar cards do pedido pelo nome do cliente (mais específico)
    await page.waitForTimeout(1000);
    const remainingCards = page.locator('.cursor-pointer').filter({ hasText: testCustomer.name });
    await expect(remainingCards).toHaveCount(0, { timeout: 10000 });
  });

  test('5 - Remover o cliente', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Ir para Clientes
    await page.goto('/clientes');
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 10000 });

    // Buscar o cliente pelo nome
    const searchInput = page.getByPlaceholder(/Buscar por nome, telefone ou email/i);
    await searchInput.fill(testCustomer.name);
    await page.waitForTimeout(500);

    // Localizar o card do cliente
    const customerCard = page.locator('.grid .hover\\:shadow-md').filter({ hasText: testCustomer.name }).first();
    await expect(customerCard).toBeVisible({ timeout: 5000 });

    // Clicar no botão de excluir (ícone de lixeira) dentro do card do cliente
    // O botão é um icon button com Trash2, variante ghost
    const deleteBtn = customerCard.locator('button').filter({ has: page.locator('.text-destructive') });
    await deleteBtn.click();

    // Confirmar exclusão
    const alertDialog = page.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible({ timeout: 5000 });
    await expect(alertDialog.getByText(/Confirmar exclusão/i)).toBeVisible();

    const confirmBtn = alertDialog.getByRole('button', { name: /Excluir/i });
    await confirmBtn.click();

    // Aguardar dialog fechar
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 });

    // Verificar que o cliente não aparece mais
    await page.waitForTimeout(1000);
    await expect(page.getByText(testCustomer.name)).toHaveCount(0, { timeout: 10000 });
  });
});
