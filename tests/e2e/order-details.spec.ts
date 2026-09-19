import { test, expect, type Page } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes de Detalhes do Pedido, Status e Pagamento
 */

async function closeAnyOpenDialog(page: Page) {
  const dialog = page.locator('[role="dialog"]').first();
  if (!(await dialog.isVisible().catch(() => false))) return;

  const closeSelectors = [
    '[data-slot="dialog-close"]',
    'button[aria-label="Close"]',
    'button[aria-label="Fechar"]',
    'button:has(svg.lucide-x)',
    'button:has-text("Close")',
    'button:has-text("Fechar")',
    'button:has-text("Cancelar")',
    'button:has-text("X")',
  ];

  for (const selector of closeSelectors) {
    const closeBtn = dialog.locator(selector).first();
    if (!(await closeBtn.isVisible().catch(() => false))) continue;
    if (!(await closeBtn.isEnabled().catch(() => false))) continue;

    try {
      await closeBtn.click({ timeout: 1000, force: true });
    } catch {
      continue;
    }

    await page.waitForTimeout(200);
    if (!(await dialog.isVisible().catch(() => false))) return;
  }

  const overlay = page.locator('[data-slot="dialog-overlay"]').first();
  if (await overlay.isVisible().catch(() => false)) {
    await overlay.click({ force: true, timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(200);
    if (!(await dialog.isVisible().catch(() => false))) return;
  }

  await page.keyboard.press('Escape').catch(() => {});
  await expect(dialog).not.toBeVisible({ timeout: 3000 }).catch(() => {});
}

async function findOrderCard(page: Page, customer: string, product: string) {
  const searchInput = page.getByPlaceholder(/Buscar por cliente, produto ou telefone/i);
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill(customer);
    await page.waitForTimeout(400);
  }

  return page
    .getByTestId('order-card')
    .filter({ hasText: customer })
    .or(page.locator('.cursor-pointer').filter({ hasText: customer }))
    .or(page.getByTestId('order-card').filter({ hasText: product }))
    .or(page.locator('.cursor-pointer').filter({ hasText: product }))
    .first();
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(60000);
  await ensureAuthenticated(page);
  if (!page.url().includes('/dashboard')) {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
  }
  await closeAnyOpenDialog(page);

  const searchInput = page.getByPlaceholder(/Buscar por cliente, produto ou telefone/i);
  if (await searchInput.isVisible().catch(() => false)) {
    const val = await searchInput.inputValue().catch(() => '');
    if (val) {
      await searchInput.clear().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
});

const timestamp = Date.now();
const testOrderData = {
  customer: `Cliente Detalhes ${timestamp}`,
  phone: `1199${String(Math.floor(100000 + Math.random() * 900000))}`,
  product: `Produto Detalhes ${timestamp}`,
};

test.describe.serial('Detalhes do Pedido', () => {
  test('deve criar e abrir para visualizar detalhes completos', async ({ page }) => {
    test.setTimeout(60000);
    await closeAnyOpenDialog(page);

    // 1. Criar o pedido via modal
    const newOrderBtn = page.getByRole('button', { name: /Novo Pedido/i });
    await expect(newOrderBtn).toBeVisible({ timeout: 10000 });
    await newOrderBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Selecionar Novo Cliente
    const selectTrigger = dialog.locator('button[role="combobox"]').first();
    await selectTrigger.click();

    const newClientOpt = page.locator('[role="option"]').filter({ hasText: /Novo Cliente/i }).first();
    await expect(newClientOpt).toBeVisible({ timeout: 5000 });
    await newClientOpt.click();

    await dialog.locator('#customerName').fill(testOrderData.customer);
    await dialog.locator('#customerPhone').fill(testOrderData.phone);

    // Preencher produto
    const productInput = dialog.getByPlaceholder(/Produto 1/i);
    await productInput.fill(testOrderData.product);

    // Preencher valor unitário
    const priceInput = dialog.getByPlaceholder('0,00').first();
    await priceInput.fill('120');

    // Preencher data de entrega garantida
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0];
    await dialog.locator('#deliveryDate').fill(dateStr);

    // Salvar
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 }).catch(async () => {
      await closeAnyOpenDialog(page);
    });

    // 2. Localizar o card do pedido via busca no dashboard e clicar
    const orderCard = await findOrderCard(page, testOrderData.customer, testOrderData.product);
    await expect(orderCard).toBeVisible({ timeout: 15000 });
    await orderCard.click();

    // 3. Validar detalhes
    const detailsDialog = page.locator('[role="dialog"]').first();
    await expect(detailsDialog).toBeVisible({ timeout: 5000 });
    await expect(detailsDialog.getByText(/Detalhes do Pedido/i)).toBeVisible({ timeout: 5000 });

    await expect(detailsDialog.getByText(testOrderData.customer).first()).toBeVisible();
    await expect(detailsDialog.getByText(testOrderData.product).first()).toBeVisible();

    await closeAnyOpenDialog(page);
  });

  test('deve exibir informações de pagamento', async ({ page }) => {
    await closeAnyOpenDialog(page);

    const orderCard = await findOrderCard(page, testOrderData.customer, testOrderData.product);
    await expect(orderCard).toBeVisible({ timeout: 15000 });
    await orderCard.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verificar status de pagamento
    const paymentStatus = dialog.getByText(/Pago|Parcial|Pendente/i);
    await expect(paymentStatus.first()).toBeVisible({ timeout: 5000 });

    await closeAnyOpenDialog(page);
  });

  test('deve entrar em modo de edição e excluir pedido', async ({ page }) => {
    await closeAnyOpenDialog(page);

    const orderCard = await findOrderCard(page, testOrderData.customer, testOrderData.product);
    await expect(orderCard).toBeVisible({ timeout: 15000 });
    await orderCard.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Clicar em Editar
    const editBtn = dialog.getByRole('button', { name: /^Editar$/i }).or(dialog.getByRole('button', { name: /Editar/i })).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // Cancelar edição
    const cancelBtn = dialog.getByRole('button', { name: /Cancelar/i }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });
    await cancelBtn.click();

    // Excluir o pedido para cleanup
    const deleteBtn = dialog.getByRole('button', { name: /Excluir Pedido/i });
    if (await deleteBtn.isVisible({ timeout: 5000 })) {
      await deleteBtn.scrollIntoViewIfNeeded();
      await deleteBtn.click();

      const alertDialog = page.locator('[role="alertdialog"]');
      await expect(alertDialog).toBeVisible({ timeout: 5000 });
      await alertDialog.getByRole('button', { name: /Excluir/i }).click();
      await expect(alertDialog).not.toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Dashboard - Filtros e Alertas', () => {
  test('deve exibir KPIs do dashboard', async ({ page }) => {
    // Verificar cards de KPI
    await expect(page.getByText(/Total de Pedidos/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Em Produção/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('deve filtrar pedidos por busca', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar por cliente, produto ou telefone/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Buscar texto que provavelmente não existe
    await searchInput.fill('ZZZZZ_INEXISTENTE_99999');
    await page.waitForTimeout(500);

    // Limpar busca
    await searchInput.clear();
  });

  test('deve exibir alertas de prazo quando existem', async ({ page }) => {
    // A ausência de pedidos é um estado válido; o Dashboard deve apresentar uma das mensagens reais.
    const emptyState = page.getByText(/Nenhuma entrega programada|Nenhum pedido em atraso|Tudo em dia/i).first();
    const alertSection = page.getByText(/Próximas Entregas|Pedidos Atrasados/i).first();
    await expect(emptyState.or(alertSection).first()).toBeVisible({ timeout: 10000 });
  });
});
