import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

test.describe('Fluxos Críticos de Negócio', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await ensureAuthenticated(page);
  });

  test('deve bloquear a criação de pedidos para clientes inadimplentes', async ({ page }) => {
    test.setTimeout(60000);
    const timestamp = Date.now();
    const customerName = `Cliente Bloqueio ${timestamp}`;
    const customerPhone = `11988${String(Math.floor(100000 + Math.random() * 900000))}`;

    // 1. Criar um cliente com status Inadimplente na página de clientes
    await page.goto('/clientes');
    const newCustomerBtn = page.getByRole('button', { name: /Novo Cliente/i });
    await expect(newCustomerBtn).toBeVisible({ timeout: 10000 });
    await newCustomerBtn.click();

    const customerDialog = page.locator('[role="dialog"]').first();
    await expect(customerDialog).toBeVisible({ timeout: 5000 });

    await customerDialog.getByPlaceholder('Nome completo').fill(customerName);
    await customerDialog.getByPlaceholder('(00) 00000-0000').fill(customerPhone);

    // Selecionar o status de inadimplente via SelectTrigger id="customer-form-status"
    const statusSelect = customerDialog.locator('#customer-form-status');
    await expect(statusSelect).toBeVisible({ timeout: 5000 });
    await statusSelect.click();

    const defaulterOption = page.getByRole('option', { name: /Inadimplente/i });
    await expect(defaulterOption).toBeVisible({ timeout: 5000 });
    await defaulterOption.click();

    // Salvar cliente
    const saveCustomerBtn = customerDialog.locator('[data-testid="save-customer-button"]').or(
      customerDialog.locator('button[type="submit"]')
    ).first();
    await saveCustomerBtn.click();
    await expect(customerDialog).not.toBeVisible({ timeout: 15000 });

    // 2. Tentar criar um pedido para esse cliente no Dashboard
    await page.goto('/dashboard');
    const newOrderBtn = page.getByRole('button', { name: /Novo Pedido/i });
    await expect(newOrderBtn).toBeVisible({ timeout: 10000 });
    await newOrderBtn.click();

    const orderDialog = page.locator('[role="dialog"]').first();
    await expect(orderDialog).toBeVisible({ timeout: 5000 });

    // Abrir seleção de cliente
    const clientSelect = orderDialog.locator('#customer').or(
      orderDialog.locator('button[role="combobox"]').first()
    ).first();
    await clientSelect.click();

    // Selecionar o cliente inadimplente recém-criado
    const clientOption = page.getByRole('option', { name: new RegExp(customerName, 'i') }).first();
    await expect(clientOption).toBeVisible({ timeout: 5000 });
    await clientOption.click();

    // 3. Validar que o alerta visual de cliente inadimplente é exibido
    const defaulterAlert = orderDialog.locator('[data-slot="alert"]').or(orderDialog.getByText('Este cliente está marcado como')).first();
    await expect(defaulterAlert).toBeVisible({ timeout: 5000 });

    // 4. Validar que o botão de confirmação está bloqueado (disabled)
    const submitBtn = orderDialog.getByRole('button', { name: /Adicionar Pedido/i });
    await expect(submitBtn).toBeDisabled();

    // 5. Fechar modal de pedido
    await orderDialog.getByRole('button', { name: /Cancelar/i }).click();
    await expect(orderDialog).not.toBeVisible({ timeout: 5000 });

    // 6. Cleanup: remover o cliente criado para manter o banco limpo
    await page.goto('/clientes');
    const searchInput = page.getByPlaceholder(/Buscar por nome, telefone ou email/i);
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill(customerName);
      const customerCard = page.locator('[data-slot="card"]').filter({ hasText: customerName }).first();
      if (await customerCard.isVisible({ timeout: 5000 })) {
        const deleteBtn = customerCard.locator('button').filter({ has: page.locator('.text-destructive') }).first();
        if (await deleteBtn.isVisible({ timeout: 3000 })) {
          await deleteBtn.click();
          const confirmDialog = page.locator('[role="alertdialog"]');
          if (await confirmDialog.isVisible({ timeout: 3000 })) {
            await confirmDialog.getByRole('button', { name: /Excluir/i }).click();
            await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });

  test('deve aprovar orçamento e converter em pedido de produção com sucesso', async ({ page }) => {
    test.setTimeout(90000);
    const timestamp = Date.now();
    const clientName = `Cliente Conv ${timestamp}`;
    const clientPhone = `11977${String(Math.floor(100000 + Math.random() * 900000))}`;
    const productName = `Banner Promoção ${timestamp}`;

    // 1. Criar novo orçamento
    await page.goto('/orcamentos');
    const newQuoteBtn = page.getByRole('button', { name: /Novo Orçamento/i });
    await expect(newQuoteBtn).toBeVisible({ timeout: 10000 });
    await newQuoteBtn.click();

    const quoteDialog = page.locator('[role="dialog"]').first();
    await expect(quoteDialog).toBeVisible({ timeout: 5000 });

    // Selecionar "Novo cliente"
    const clientSelect = quoteDialog.locator('button[role="combobox"]').first();
    await clientSelect.click();
    const newClientOpt = page.getByRole('option', { name: /Novo cliente/i });
    await expect(newClientOpt).toBeVisible({ timeout: 5000 });
    await newClientOpt.click();

    await quoteDialog.locator('#q-cname').fill(clientName);
    await quoteDialog.locator('#q-cphone').fill(clientPhone);

    // Preencher produto e valor
    const productInput = quoteDialog.getByPlaceholder(/Ex: Camiseta personalizada/i).first();
    await productInput.fill(productName);

    const priceInput = quoteDialog.getByPlaceholder('0,00').first();
    await priceInput.fill('150');
    await quoteDialog.locator('input[type="number"]').nth(0).fill('2');
    await quoteDialog.locator('input[type="number"]').nth(2).fill('10');
    await expect(quoteDialog.getByText('R$ 270,00')).toBeVisible();

    // Data de entrega
    const deliveryInput = quoteDialog.locator('#q-delivery');
    if (!(await deliveryInput.inputValue())) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      await deliveryInput.fill(futureDate.toISOString().split('T')[0]);
    }

    // Salvar orçamento
    await quoteDialog.getByRole('button', { name: /Salvar Orçamento/i }).click();
    await expect(quoteDialog).not.toBeVisible({ timeout: 15000 });

    // 2. Localizar o card do orçamento criado e abrir os detalhes
    const searchQuote = page.getByPlaceholder(/Buscar por cliente/i);
    await expect(searchQuote).toBeVisible({ timeout: 10000 });
    await searchQuote.fill(clientName);

    const quoteCard = page.locator('.cursor-pointer').filter({ hasText: clientName }).first();
    await expect(quoteCard).toBeVisible({ timeout: 10000 });
    await quoteCard.click();

    // 3. No modal de detalhes, clicar em "Aprovar e Gerar Pedido"
    const detailsDialog = page.locator('[role="dialog"]').first();
    await expect(detailsDialog).toBeVisible({ timeout: 5000 });

    const approveBtn = detailsDialog.getByRole('button', { name: /Aprovar e Gerar Pedido/i });
    await expect(approveBtn).toBeVisible({ timeout: 5000 });
    await approveBtn.click();

    // 4. Validar notificação de sucesso e/ou que o status mudou para aprovado
    await expect(
      page.getByText(/criado com sucesso/i).or(detailsDialog.getByText('Aprovado', { exact: true })).first()
    ).toBeVisible({ timeout: 15000 });

    // A aprovação pode fechar ou remontar o diálogo ao atualizar o orçamento.
    // Aguarda esse fechamento antes de tentar sair, evitando clicar em um botão já removido.
    const dialogClosedAfterApproval = await expect(detailsDialog)
      .toBeHidden({ timeout: 3000 })
      .then(() => true, () => false);
    if (!dialogClosedAfterApproval) {
      await page.keyboard.press('Escape');
      await expect(detailsDialog).toBeHidden({ timeout: 5000 });
    }

    // 5. Cleanup: Ir ao dashboard e apagar o pedido gerado
    await page.goto('/dashboard');
    const orderSearch = page.getByPlaceholder(/Buscar por cliente, produto ou telefone/i);
    if (await orderSearch.isVisible({ timeout: 10000 })) {
      await orderSearch.fill(clientName);
      const generatedCard = page.locator('.cursor-pointer').filter({ hasText: clientName }).first();
      if (await generatedCard.isVisible({ timeout: 5000 })) {
        await generatedCard.click();
        const orderDetails = page.locator('[role="dialog"]').first();
        if (await orderDetails.isVisible({ timeout: 5000 })) {
          await expect(orderDetails.getByText('R$ 270,00')).toBeVisible();
          await expect(orderDetails.getByText(new RegExp(`${productName} \\(2x\\)`))).toBeVisible();
          await expect(orderDetails.getByText(/Total: 2 unidades/i)).toBeVisible();
          const deleteOrderBtn = orderDetails.getByRole('button', { name: /Excluir Pedido/i });
          if (await deleteOrderBtn.isVisible({ timeout: 3000 })) {
            await deleteOrderBtn.click();
            const alertDlg = page.locator('[role="alertdialog"]');
            if (await alertDlg.isVisible({ timeout: 3000 })) {
              await alertDlg.getByRole('button', { name: /Excluir/i }).click();
              await expect(alertDlg).not.toBeVisible({ timeout: 10000 });
            }
          }
        }
      }
    }
  });

  test('deve recusar orçamento atualizado em outra sessão e orientar revisão', async ({ page }) => {
    test.setTimeout(90000);
    const timestamp = Date.now();
    const clientName = `Cliente Snapshot ${timestamp}`;
    const clientPhone = `11966${String(Math.floor(100000 + Math.random() * 900000))}`;

    await page.goto('/orcamentos');
    await page.getByRole('button', { name: /Novo Orçamento/i }).click();
    const form = page.locator('[role="dialog"]').first();
    await expect(form).toBeVisible();
    await form.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: /Novo cliente/i }).click();
    await form.locator('#q-cname').fill(clientName);
    await form.locator('#q-cphone').fill(clientPhone);
    await form.getByPlaceholder(/Ex: Camiseta personalizada/i).first().fill(`Produto ${timestamp}`);
    await form.getByPlaceholder('0,00').first().fill('100');
    const deliveryInput = form.locator('#q-delivery');
    if (!(await deliveryInput.inputValue())) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      await deliveryInput.fill(futureDate.toISOString().split('T')[0]);
    }
    await form.getByRole('button', { name: /Salvar Orçamento/i }).click();
    await expect(form).not.toBeVisible({ timeout: 15000 });

    const search = page.getByPlaceholder(/Buscar por cliente/i);
    await search.fill(clientName);
    await page.locator('.cursor-pointer').filter({ hasText: clientName }).first().click();
    const details = page.locator('[role="dialog"]').first();
    await expect(details).toBeVisible();

    // Freeze the first session's quote listener while keeping callable requests online.
    let blockedQuoteListeners = 0;
    await page.context().route(/google\.firestore\.v1\.Firestore\/Listen\/channel/, async (route) => {
      blockedQuoteListeners += 1;
      await route.abort();
    });
    await page.context().setOffline(true);
    await page.context().setOffline(false);
    await expect.poll(() => blockedQuoteListeners, { timeout: 10000 }).toBeGreaterThan(0);

    // Edit the same quote in a second authenticated browser session. The first tab retains
    // its loaded snapshot, so its next approval must be rejected by the live backend.
    const browser = page.context().browser();
    if (!browser) throw new Error('Browser indisponível para abrir a segunda sessão autenticada.');
    const editorContext = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
    try {
      const editorPage = await editorContext.newPage();
      await ensureAuthenticated(editorPage);
      await editorPage.goto('/orcamentos');
      const editorSearch = editorPage.getByPlaceholder(/Buscar por cliente/i);
      await editorSearch.fill(clientName);
      await editorPage.locator('.cursor-pointer').filter({ hasText: clientName }).first().click();
      const editorDetails = editorPage.locator('[role="dialog"]').first();
      await expect(editorDetails).toBeVisible();
      await editorDetails.getByRole('button', { name: /^Editar$/i }).click();
      const editForm = editorPage.getByRole('dialog').filter({ hasText: 'Editar Orçamento' });
      await expect(editForm).toBeVisible();
      await editForm.getByPlaceholder('0,00').first().fill('125');
      await editForm.getByRole('button', { name: /Salvar Orçamento/i }).click();
      await expect(editForm).not.toBeVisible({ timeout: 15000 });

      await expect(details.getByText('R$ 100,00')).toBeVisible();
      await details.getByRole('button', { name: /Aprovar e Gerar Pedido/i }).click();
      await expect(page.getByText(/O orçamento foi alterado\. Atualize os dados e revise a proposta/i))
        .toBeVisible({ timeout: 10000 });
      await expect(details.getByRole('button', { name: /Aprovar e Gerar Pedido/i })).toBeEnabled();
    } finally {
      await editorContext.close();
    }
  });
});
