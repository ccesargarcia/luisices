import { test, expect, type Page } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes CRUD de Pedidos
 */

async function closeAnyOpenDialog(page: Page) {
  const dialog = page.locator('[role="dialog"]').first();
  if (!(await dialog.isVisible().catch(() => false))) return;

  const closeSelectors = [
    '[data-slot="dialog-close"]',
    'button[aria-label="Close"]',
    'button:has-text("Fechar")',
    'button:has-text("Cancelar")',
    'button:has-text("X")',
  ];

  for (const selector of closeSelectors) {
    const closeBtn = dialog.locator(selector).first();
    if (!(await closeBtn.isVisible().catch(() => false))) continue;
    if (!(await closeBtn.isEnabled().catch(() => false))) continue;

    try {
      await closeBtn.click({ timeout: 1000 });
    } catch {
      continue;
    }

    await page.waitForTimeout(250);
    if (!(await dialog.isVisible().catch(() => false))) return;
  }

  const overlay = page.locator('[data-slot="dialog-overlay"]').first();
  if (await overlay.isVisible().catch(() => false)) {
    await overlay.click({ force: true });
  }

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible({ timeout: 10000 }).catch(() => {});
}

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);
});

test.describe('Pedidos - CRUD', () => {
  test('deve criar novo pedido pelo dashboard', async ({ page }) => {
    test.setTimeout(60000);
    const timestamp = Date.now();
    const customerName = `Cliente Auto ${timestamp}`;
    const customerPhone = `11988${String(Math.floor(100000 + Math.random() * 900000))}`;
    const productName = `Produto Teste Pedido ${timestamp}`;

    // Clicar em "Novo Pedido"
    const newOrderBtn = page.getByRole('button', { name: /Novo Pedido/i });
    await expect(newOrderBtn).toBeVisible({ timeout: 10000 });
    await newOrderBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Selecionar "Novo Cliente" explicitamente para não herdar restrições de clientes inadimplentes
    const selectTrigger = dialog.locator('button[role="combobox"]').first();
    await selectTrigger.click();

    const newClientOpt = page.locator('[role="option"]').filter({ hasText: /Novo Cliente/i }).first();
    await expect(newClientOpt).toBeVisible({ timeout: 5000 });
    await newClientOpt.click();

    await dialog.locator('#customerName').fill(customerName);
    await dialog.locator('#customerPhone').fill(customerPhone);

    // Preencher produto
    const productInput = dialog.getByPlaceholder(/Produto 1/i);
    await productInput.fill(productName);

    // Preencher valor unitário
    const priceInput = dialog.getByPlaceholder('0,00').first();
    await priceInput.fill('80');

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

    // Se o diálogo não fechar automaticamente, feche-o manualmente
    await closeAnyOpenDialog(page);

    // CLEANUP: Localizar o pedido recém-criado e excluir
    const orderCard = page.locator('.cursor-pointer').filter({ hasText: productName }).first();
    if (await orderCard.isVisible({ timeout: 10000 })) {
      await orderCard.click();

      const detailsDialog = page.locator('[role="dialog"]').first();
      await expect(detailsDialog).toBeVisible({ timeout: 10000 });

      const deleteBtn = detailsDialog.getByRole('button', { name: /Excluir Pedido/i });
      if (await deleteBtn.isVisible({ timeout: 5000 })) {
        await deleteBtn.scrollIntoViewIfNeeded();
        await deleteBtn.click();

        const alertDialog = page.locator('[role="alertdialog"]');
        await expect(alertDialog).toBeVisible({ timeout: 5000 });
        await alertDialog.getByRole('button', { name: /Excluir/i }).click();
        await expect(alertDialog).not.toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('deve criar pedido com cliente novo e refletir na tela de clientes', async ({ page }) => {
    test.setTimeout(60000);

    const customerName = `Cliente Teste ${Date.now()}`;
    const customerPhone = `119${String(Math.floor(100000 + Math.random() * 900000))}`;

    // Criar pedido com cliente novo
    const newOrderBtn = page.getByRole('button', { name: /Novo Pedido/i });
    await expect(newOrderBtn).toBeVisible({ timeout: 10000 });
    await newOrderBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const selectTrigger = dialog.locator('button[role="combobox"]').first();
    await selectTrigger.click();

    // Selecionar opção "Novo Cliente"
    const optionNew = page.locator('[role="option"]').filter({ hasText: /Novo Cliente/i }).first();
    await expect(optionNew).toBeVisible({ timeout: 5000 });
    await optionNew.click();

    await dialog.locator('#customerName').fill(customerName);
    await dialog.locator('#customerPhone').fill(customerPhone);

    // Preencher produto básico
    const productInput = dialog.getByPlaceholder(/Produto 1/i);
    await productInput.fill('Produto Teste Cliente Novo');

    const priceInput = dialog.getByPlaceholder('0,00').first();
    await priceInput.fill('35');

    // Preencher data de entrega caso esteja vazia
    const dateInput = dialog.locator('#deliveryDate');
    const dateValue = await dateInput.inputValue();
    if (!dateValue) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      await dateInput.fill(futureDate.toISOString().split('T')[0]);
    }

    await dialog.locator('button[type="submit"]').click();

    // Fechar qualquer diálogo que permaneça aberto
    await closeAnyOpenDialog(page);

    // Acessar a página de clientes e verificar que o cliente novo está listado
    await page.goto('/clientes');

    const searchInput = page.getByPlaceholder(/Buscar por nome, telefone ou email/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill(customerName);

    const customerCard = page.locator('[data-slot="card"]').filter({ hasText: customerName }).first();
    await expect(customerCard).toBeVisible({ timeout: 10000 });

    // Cleanup: remover cliente criado
    try {
      const deleteBtn = customerCard.locator('button').filter({ has: page.locator('.text-destructive') }).first();
      if (await deleteBtn.isVisible({ timeout: 5000 })) {
        await deleteBtn.click({ timeout: 5000 });

        const alertDialog = page.locator('[role="alertdialog"]');
        await alertDialog.waitFor({ state: 'visible', timeout: 5000 });
        await alertDialog.getByRole('button', { name: /Excluir/i }).click({ timeout: 5000 });
        await alertDialog.waitFor({ state: 'hidden', timeout: 10000 });
      }
    } catch (cleanupErr) {
      console.warn('Não foi possível excluir o cliente de teste automaticamente:', cleanupErr);
    }
  });

  test('deve buscar pedidos no dashboard', async ({ page }) => {
    // Campo de busca do dashboard
    const searchInput = page.getByPlaceholder(/Buscar por cliente, produto ou telefone/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('Pedido Inexistente XYZ123');

    // Nenhum resultado esperado
    const noResults = page.getByText('Nenhum pedido encontrado', { exact: true });
    await expect(noResults).toBeVisible({ timeout: 5000 });
  });

  test('deve abrir detalhes de um pedido', async ({ page }) => {
    await closeAnyOpenDialog(page);

    let orderCard = page.getByTestId('order-card').first();
    const count = await orderCard.count();

    // Se não houver pedido no dashboard, cria um rapidamente para que o teste seja auto-suficiente
    if (count === 0) {
      const newOrderBtn = page.getByRole('button', { name: /Novo Pedido/i });
      await expect(newOrderBtn).toBeVisible({ timeout: 5000 });
      await newOrderBtn.click();

      const dlg = page.locator('[role="dialog"]').first();
      await expect(dlg).toBeVisible({ timeout: 5000 });
      await dlg.locator('button[role="combobox"]').first().click();
      await page.locator('[role="option"]').filter({ hasText: /Novo Cliente/i }).first().click();

      await dlg.locator('#customerName').fill(`Cliente Auto ${Date.now()}`);
      await dlg.locator('#customerPhone').fill('11999887766');
      await dlg.getByPlaceholder(/Produto 1/i).fill('Produto Auto Detalhe');
      await dlg.getByPlaceholder('0,00').first().fill('50');

      const dateInput = dlg.locator('#deliveryDate');
      if (!await dateInput.inputValue()) {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        await dateInput.fill(d.toISOString().split('T')[0]);
      }
      await dlg.locator('button[type="submit"]').click();
      await closeAnyOpenDialog(page);
    }

    orderCard = page.getByTestId('order-card').first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await orderCard.scrollIntoViewIfNeeded();
    await orderCard.click();

    // Verificar que o dialog de detalhes abriu
    const detailsDialog = page.locator('[role="dialog"]').first();
    await expect(detailsDialog).toBeVisible({ timeout: 5000 });
    await expect(detailsDialog.getByText(/Detalhes do Pedido/i)).toBeVisible({ timeout: 5000 });
  });

  test('deve navegar para agenda semanal', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page.locator('main h1').first()).toContainText(/Agenda/i, { timeout: 10000 });

    // Verificar botões de navegação de semana
    const nextBtn = page.getByRole('button', { name: 'Próxima semana' });
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await nextBtn.click();

    const prevBtn = page.getByRole('button', { name: 'Semana anterior' });
    await expect(prevBtn).toBeVisible({ timeout: 5000 });
    await prevBtn.click();
  });
});
