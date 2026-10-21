import { test, expect, type Page } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Teste E2E: Edição de Valor Pago e Reconciliação com Regras de Segurança do Firestore
 *
 * Cenário Coberto:
 * 1. Criação de pedido com pagamento inicialmente Pendente (R$ 0,00).
 * 2. Abertura do modal de edição e alteração do "Valor Pago" para um valor parcial.
 * 3. Validação de sincronização automática do seletor para "Parcial".
 * 4. Salvamento com sucesso no Firestore SEM erro de permissão (Missing or insufficient permissions).
 * 5. Reabertura do modal, alteração do "Valor Pago" para o total (quitação).
 * 6. Validação de sincronização automática do seletor para "Pago".
 * 7. Salvamento e verificação do estado quitado no dashboard.
 * 8. Cleanup do pedido de teste.
 */

async function closeAnyOpenDialog(page: Page) {
  const dialog = page.locator('[role="dialog"]').first();
  if (!(await dialog.isVisible().catch(() => false))) {
    const overlay = page.locator('[data-slot="dialog-overlay"]').first();
    if (await overlay.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape').catch(() => {});
      await overlay.click({ force: true }).catch(() => {});
    }
    return;
  }

  const closeBtn = dialog.locator('[data-slot="dialog-close"], button[aria-label="Close"], button[aria-label="Fechar"], button:has(svg.lucide-x)').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ force: true, timeout: 1500 }).catch(() => {});
  } else {
    const footerBtn = dialog.getByRole('button', { name: /^Fechar$|^Cancelar$/i }).first();
    if (await footerBtn.isVisible().catch(() => false)) {
      await footerBtn.click({ force: true, timeout: 1500 }).catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  await page.waitForTimeout(150);
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape').catch(() => {});
  }

  await expect(dialog).not.toBeVisible({ timeout: 5000 }).catch(() => {});
}

async function findOrderCard(page: Page, customer: string, product: string) {
  const searchInput = page.getByPlaceholder(/Buscar por cliente, produto ou telefone/i);
  await expect(searchInput).toBeVisible({ timeout: 15000 });

  const allTab = page.getByRole('tab', { name: /Todos/i });
  if (await allTab.isVisible().catch(() => false)) {
    await allTab.click().catch(() => {});
  }

  const clearFilterBtn = page.getByRole('button', { name: /Limpar filtro/i });
  if (await clearFilterBtn.isVisible().catch(() => false)) {
    await clearFilterBtn.click().catch(() => {});
  }

  const orderCardLocator = page
    .getByTestId('order-card')
    .filter({ hasText: product })
    .or(page.getByTestId('order-card').filter({ hasText: customer }))
    .or(page.locator('.cursor-pointer').filter({ hasText: product }))
    .or(page.locator('.cursor-pointer').filter({ hasText: customer }))
    .first();

  if (await orderCardLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
    return orderCardLocator;
  }

  await searchInput.fill(product);
  await page.waitForTimeout(500);

  if (await orderCardLocator.isVisible({ timeout: 5000 }).catch(() => false)) {
    return orderCardLocator;
  }

  await searchInput.clear();
  await page.waitForTimeout(300);
  return page.getByTestId('order-card').first();
}

test.describe.serial('E2E: Edição de Valor Pago e Reconciliação Financeira', () => {
  const ts = Date.now();
  const testCustomer = `Cliente Pagamento ${ts}`;
  const testPhone = `1198${String(Math.floor(100000 + Math.random() * 900000))}`;
  const testProduct = `Convite Especial ${ts}`;
  const totalAmountStr = '100';

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await ensureAuthenticated(page);
    await closeAnyOpenDialog(page);
  });

  test('deve criar pedido pendente, editar valor pago para parcial e depois para quitado sem erro de permissão', async ({ page }) => {
    test.setTimeout(90000);

    // ==========================================
    // ETAPA 1: Criar Pedido Pendente (R$ 100,00)
    // ==========================================
    const newOrderBtn = page.getByRole('button', { name: /Novo Pedido/i });
    await expect(newOrderBtn).toBeVisible({ timeout: 10000 });
    await newOrderBtn.click();

    const newOrderDialog = page.locator('[role="dialog"]').filter({ hasText: /Novo Pedido|Adicionar Pedido/i }).first();
    await expect(newOrderDialog).toBeVisible({ timeout: 5000 });

    const selectTrigger = newOrderDialog.locator('button[role="combobox"]').first();
    await selectTrigger.click();
    const newClientOpt = page.locator('[role="option"]').filter({ hasText: /Novo Cliente/i }).first();
    await expect(newClientOpt).toBeVisible({ timeout: 5000 });
    await newClientOpt.click();

    await newOrderDialog.locator('#customerName').fill(testCustomer);
    await newOrderDialog.locator('#customerPhone').fill(testPhone);

    const productInput = newOrderDialog.getByPlaceholder(/Produto 1/i);
    await productInput.fill(testProduct);

    const priceInput = newOrderDialog.getByPlaceholder('0,00').first();
    await priceInput.fill(totalAmountStr);

    const dateInput = newOrderDialog.locator('#deliveryDate');
    const dateValue = await dateInput.inputValue().catch(() => '');
    if (!dateValue) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      await dateInput.fill(futureDate.toISOString().split('T')[0]);
    }

    const submitBtn = newOrderDialog.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();
    await expect(newOrderDialog).not.toBeVisible({ timeout: 15000 });

    // ==========================================
    // ETAPA 2: Abrir Detalhes do Pedido
    // ==========================================
    const orderCard = await findOrderCard(page, testCustomer, testProduct);
    await expect(orderCard).toBeVisible({ timeout: 15000 });
    await orderCard.scrollIntoViewIfNeeded();
    await orderCard.click({ force: true, timeout: 10000 });

    const detailsDialog = page.locator('[role="dialog"]').filter({ hasText: /Detalhes do Pedido/i }).first();
    await expect(detailsDialog).toBeVisible({ timeout: 10000 });

    // Validar status inicial: Pendente
    await expect(detailsDialog.getByText(/Pendente/i).first()).toBeVisible({ timeout: 5000 });

    // ==========================================
    // ETAPA 3: Editar Valor Pago para R$ 40,00 (Parcial)
    // ==========================================
    const editBtn = detailsDialog.getByRole('button', { name: /^Editar$/i }).or(detailsDialog.getByRole('button', { name: /Editar/i })).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    const paidInput = detailsDialog.locator('#paidAmount');
    await expect(paidInput).toBeVisible({ timeout: 5000 });
    await paidInput.fill('40,00');

    // Validação da sincronização em tempo real na tela
    const paymentStatusTrigger = detailsDialog.locator('#paymentStatus');
    await expect(paymentStatusTrigger).toContainText(/Parcial/i);

    // Salvar Alterações
    const saveBtn = detailsDialog.getByRole('button', { name: /Salvar Alterações/i });
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();

    // Verificação de Ausência de Erro de Permissão
    const toastError = page.locator('[data-sonner-toast][data-type="error"], [role="alert"]').filter({
      hasText: /permission|permissão|insufficient/i,
    });
    await expect(toastError).toHaveCount(0);

    // Modal volta para modo de leitura com dados parciais
    await expect(detailsDialog.getByText(/Detalhes do Pedido/i)).toBeVisible({ timeout: 10000 });
    await expect(detailsDialog.getByText(/Parcial/i).first()).toBeVisible({ timeout: 5000 });
    await expect(detailsDialog.getByText(/R\$\s*40,00/i).first()).toBeVisible({ timeout: 5000 });
    await expect(detailsDialog.getByText(/R\$\s*60,00/i).first()).toBeVisible({ timeout: 5000 });

    // ==========================================
    // ETAPA 4: Editar Novamente para R$ 100,00 (Quitar)
    // ==========================================
    await editBtn.click();
    await expect(paidInput).toBeVisible({ timeout: 5000 });
    await paidInput.fill('100,00');

    // Status deve auto-sincronizar para Pago
    await expect(paymentStatusTrigger).toContainText(/Pago/i);

    await saveBtn.click();

    // Confirmação de ausência de erro de permissão
    await expect(toastError).toHaveCount(0);

    // Modal exibe status Pago e R$ 100,00
    await expect(detailsDialog.getByText(/Detalhes do Pedido/i)).toBeVisible({ timeout: 10000 });
    await expect(detailsDialog.getByText(/Pago/i).first()).toBeVisible({ timeout: 5000 });
    await expect(detailsDialog.getByText(/R\$\s*100,00/i).first()).toBeVisible({ timeout: 5000 });

    // ==========================================
    // ETAPA 5: Cleanup (Excluir pedido de teste)
    // ==========================================
    const deleteBtn = detailsDialog.getByRole('button', { name: /Excluir Pedido/i });
    if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteBtn.scrollIntoViewIfNeeded();
      await deleteBtn.click();

      const alertDialog = page.locator('[role="alertdialog"]');
      await expect(alertDialog).toBeVisible({ timeout: 5000 });
      await alertDialog.getByRole('button', { name: /Excluir/i }).click();
      await expect(alertDialog).not.toBeVisible({ timeout: 10000 });
    }
  });
});
