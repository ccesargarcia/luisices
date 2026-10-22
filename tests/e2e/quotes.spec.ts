import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes CRUD de Orçamentos
 */

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);

  await page.goto('/orcamentos');
  await expect(page.locator('main h1').first()).toContainText(/Orçamentos/i, { timeout: 10000 });
});

test.describe('Orçamentos - CRUD', () => {
  test('fluxo completo de cálculo: item com quantidade, desconto e total persistidos', async ({ page }) => {
    test.setTimeout(90000);
    const clientName = `Cliente Cálculo ${Date.now()}`;
    const clientPhone = `11977${String(Math.floor(100000 + Math.random() * 900000))}`;
    await page.getByRole('button', { name: /Novo Orçamento/i }).click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    await dialog.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: /Novo cliente/i }).click();
    await dialog.locator('#q-cname').fill(clientName);
    await dialog.locator('#q-cphone').fill(clientPhone);
    await dialog.getByPlaceholder(/Ex: Camiseta personalizada/i).first().fill('Produto calculado');
    await dialog.locator('input[type="number"]').nth(0).fill('2');
    await dialog.getByPlaceholder('0,00').first().fill('150');

    const discountField = dialog.locator('input[type="number"]').nth(2);
    await discountField.fill('10');
    await expect(dialog.getByText('-R$ 30,00')).toBeVisible();
    await expect(dialog.getByText('R$ 270,00')).toBeVisible();

    const deliveryInput = dialog.locator('#q-delivery');
    if (!(await deliveryInput.inputValue())) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      await deliveryInput.fill(futureDate.toISOString().split('T')[0]);
    }
    await dialog.getByRole('button', { name: /Salvar Orçamento/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 10000 });

    const search = page.getByTestId('search-quotes-input');
    await search.fill(clientName);
    const card = page.getByTestId('quote-card').filter({ hasText: clientName }).first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    const details = page.locator('[role="dialog"]').first();
    await expect(details.getByText('R$ 270,00')).toBeVisible();
    const pdfDownload = page.waitForEvent('download');
    await details.getByRole('button', { name: /Exportar PDF/i }).click();
    expect((await pdfDownload).suggestedFilename()).toMatch(/^orcamento-.*\.pdf$/);
    await details.getByRole('button', { name: /^Excluir$/i }).click();
    const alert = page.locator('[role="alertdialog"]');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: /Excluir/i }).click();
    await expect(alert).not.toBeVisible();
  });

  test('bloqueia desconto fixo acima do subtotal antes de salvar', async ({ page }) => {
    await page.getByRole('button', { name: /Novo Orçamento/i }).click();
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: /Novo cliente/i }).click();
    await dialog.locator('#q-cname').fill('Cliente desconto inválido');
    await dialog.locator('#q-cphone').fill('11999912345');
    await dialog.getByPlaceholder(/Ex: Camiseta personalizada/i).first().fill('Produto');
    await dialog.getByPlaceholder('0,00').first().fill('100');
    await dialog.getByText('Desconto (opcional)').locator('..').locator('button[role="combobox"]').click();
    await page.getByRole('option', { name: 'R$' }).click();
    await dialog.locator('input[type="number"]').nth(2).fill('150');
    await dialog.getByRole('button', { name: /Salvar Orçamento/i }).click();
    await expect(dialog).toBeVisible();
    await expect(page.getByText(/desconto não pode ser maior que o subtotal/i)).toBeVisible();
  });

  test('recalcula e persiste o total ao editar itens e desconto', async ({ page }) => {
    test.setTimeout(90000);
    const clientName = `Cliente Edição ${Date.now()}`;
    const clientPhone = `11966${String(Math.floor(100000 + Math.random() * 900000))}`;

    await page.getByRole('button', { name: /Novo Orçamento/i }).click();
    let dialog = page.locator('[role="dialog"]').first();
    await dialog.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: /Novo cliente/i }).click();
    await dialog.locator('#q-cname').fill(clientName);
    await dialog.locator('#q-cphone').fill(clientPhone);
    await dialog.getByPlaceholder(/Ex: Camiseta personalizada/i).first().fill('Produto editável');
    await dialog.getByPlaceholder('0,00').first().fill('100');

    const deliveryInput = dialog.locator('#q-delivery');
    if (!(await deliveryInput.inputValue())) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      await deliveryInput.fill(futureDate.toISOString().split('T')[0]);
    }
    await dialog.getByRole('button', { name: /Salvar Orçamento/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    const search = page.getByTestId('search-quotes-input');
    await search.fill(clientName);
    let card = page.getByTestId('quote-card').filter({ hasText: clientName }).first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    dialog = page.locator('[role="dialog"]').first();
    await dialog.getByRole('button', { name: /Editar/i }).click();

    dialog = page.locator('[role="dialog"]').first();
    await expect(dialog.getByText('Editar Orçamento')).toBeVisible();
    await dialog.getByPlaceholder('0,00').first().fill('125');
    await dialog.locator('input[type="number"]').nth(2).fill('10');
    await expect(dialog.getByText('R$ 112,50')).toBeVisible();
    await dialog.getByRole('button', { name: /Salvar Orçamento/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // Reload before checking so this asserts server persistence instead of relying on listener timing.
    // Reabrir explicitamente a rota evita que uma renovação de sessão durante o reload
    // deixe o teste no dashboard e garante uma leitura nova do orçamento persistido.
    await page.goto('/orcamentos');
    await expect(page.locator('main h1').first()).toContainText(/Orçamentos/i, { timeout: 15000 });
    await page.getByTestId('search-quotes-input').fill(clientName);
    card = page.getByTestId('quote-card').filter({ hasText: clientName }).first();
    await expect(card).toContainText('R$ 112,50', { timeout: 15000 });
    await card.click();
    dialog = page.locator('[role="dialog"]').first();
    await expect(dialog.getByText('R$ 112,50')).toBeVisible();
    await dialog.getByRole('button', { name: /^Excluir$/i }).click();
    const alert = page.locator('[role="alertdialog"]');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: /Excluir/i }).click();
    await expect(alert).not.toBeVisible();
  });

  test('limita a interface aos 10 itens aceitos pelo backend', async ({ page }) => {
    await page.getByRole('button', { name: /Novo Orçamento/i }).click();
    const dialog = page.locator('[role="dialog"]').first();
    const addItem = dialog.getByRole('button', { name: /Adicionar item/i });
    for (let i = 0; i < 9; i += 1) await addItem.click();
    await expect(dialog.getByPlaceholder(/Ex: Camiseta personalizada/i)).toHaveCount(10);
    await addItem.click();
    await expect(page.getByText(/máximo 10 itens/i)).toBeVisible();
    await expect(dialog.getByPlaceholder(/Ex: Camiseta personalizada/i)).toHaveCount(10);
  });

  test('deve criar um novo orçamento', async ({ page }) => {
    test.setTimeout(90000);
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

    // CLEANUP: Excluir o orçamento criado
    // Clicar no orçamento para abrir detalhes
    const quoteCard = page.locator('.cursor-pointer, [role="button"]').filter({ hasText: clientName }).first();
    await quoteCard.click();

    const detailsDialog = page.locator('[role="dialog"]').first();
    await expect(detailsDialog).toBeVisible({ timeout: 5000 });

    // Clicar em "Excluir" no footer do dialog
    const deleteBtn = detailsDialog.getByRole('button', { name: /^Excluir$/i });
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click();

    // Confirmar exclusão
    const alertDialog = page.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible({ timeout: 5000 });
    await alertDialog.getByRole('button', { name: /Excluir/i }).click();
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 });

  });

  test('deve buscar orçamentos', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar por cliente, número, produto ou tag/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('Orçamento Inexistente XYZ123');
    await page.waitForTimeout(500);

    const noResults = page.getByText(/Nenhum orçamento/i);
    await expect(noResults).toBeVisible({ timeout: 5000 });
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
