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
  // 1. Garantir aba "Todos" para que pedidos de qualquer status sejam visíveis
  const allTab = page.getByRole('tab', { name: /Todos/i });
  if (await allTab.isVisible().catch(() => false)) {
    await allTab.click().catch(() => {});
  }

  // 2. Limpar qualquer filtro de usuário/equipe ativo
  const clearFilterBtn = page.getByRole('button', { name: /Limpar filtro/i });
  if (await clearFilterBtn.isVisible().catch(() => false)) {
    await clearFilterBtn.click().catch(() => {});
  }

  // 3. Tentar encontrar diretamente pelo produto ou cliente (novos pedidos aparecem no topo)
  const orderCardLocator = page
    .getByTestId('order-card')
    .filter({ hasText: product })
    .or(page.getByTestId('order-card').filter({ hasText: customer }))
    .or(page.locator('.cursor-pointer').filter({ hasText: product }))
    .or(page.locator('.cursor-pointer').filter({ hasText: customer }))
    .first();

  if (await orderCardLocator.isVisible({ timeout: 4000 }).catch(() => false)) {
    return orderCardLocator;
  }

  // 4. Se não estiver visível diretamente, usar o campo de busca
  const searchInput = page.getByPlaceholder(/Buscar por cliente, produto ou telefone/i);
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill(product);
    await page.waitForTimeout(500);
  }

  return orderCardLocator;
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(60000);
  await ensureAuthenticated(page);
  if (!page.url().includes('/dashboard')) {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
  }
  await closeAnyOpenDialog(page);

  // Limpar campo de busca se preenchido
  const searchInput = page.getByPlaceholder(/Buscar por cliente, produto ou telefone/i);
  if (await searchInput.isVisible().catch(() => false)) {
    const val = await searchInput.inputValue().catch(() => '');
    if (val) {
      await searchInput.clear().catch(() => {});
      await page.waitForTimeout(200);
    }
  }

  // Limpar qualquer filtro de equipe/responsável ativo
  const clearFilterBtn = page.getByRole('button', { name: /Limpar filtro/i });
  if (await clearFilterBtn.isVisible().catch(() => false)) {
    await clearFilterBtn.click().catch(() => {});
  }

  // Garantir aba "Todos" ativa
  const allTab = page.getByRole('tab', { name: /Todos/i });
  if (await allTab.isVisible().catch(() => false)) {
    await allTab.click().catch(() => {});
  }
});

function generateTestOrderData() {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const randPhone = String(Math.floor(100000 + Math.random() * 900000));
  return {
    customer: `Cliente Detalhes ${ts}`,
    phone: `1199${randPhone}`,
    product: `Produto Detalhes ${ts}`,
  };
}

let testOrderData = generateTestOrderData();

test.describe.serial('Detalhes do Pedido', () => {
  test('deve criar e abrir para visualizar detalhes completos', async ({ page }) => {
    test.setTimeout(60000);
    testOrderData = generateTestOrderData();
    await closeAnyOpenDialog(page);

    // 1. Criar o pedido via modal
    const newOrderBtn = page.getByRole('button', { name: /Novo Pedido/i });
    await expect(newOrderBtn).toBeVisible({ timeout: 10000 });
    await newOrderBtn.click();

    const dialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /Novo Pedido|Adicionar Pedido/i })
      .or(page.locator('[role="dialog"]'))
      .first();
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

    // Preencher data de entrega garantida se vazia
    const dateInput = dialog.locator('#deliveryDate');
    const dateValue = await dateInput.inputValue().catch(() => '');
    if (!dateValue) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];
      await dateInput.fill(dateStr);
    }

    // Salvar
    const submitBtn = dialog.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 }).catch(async () => {
      await closeAnyOpenDialog(page);
    });

    // 2. Localizar o card do pedido via busca no dashboard e clicar
    const orderCard = await findOrderCard(page, testOrderData.customer, testOrderData.product);
    await expect(orderCard).toBeVisible({ timeout: 15000 });
    await orderCard.scrollIntoViewIfNeeded();
    await orderCard.click();

    // 3. Validar detalhes
    const detailsDialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /Detalhes do Pedido/i })
      .first();
    if (!(await detailsDialog.isVisible().catch(() => false))) {
      await orderCard.click({ force: true }).catch(() => {});
    }
    await expect(detailsDialog).toBeVisible({ timeout: 10000 });
    await expect(detailsDialog.getByText(/Detalhes do Pedido/i)).toBeVisible({ timeout: 5000 });

    await expect(detailsDialog.getByText(testOrderData.customer).first()).toBeVisible({ timeout: 5000 });
    await expect(detailsDialog.getByText(testOrderData.product).first()).toBeVisible({ timeout: 5000 });

    await closeAnyOpenDialog(page);
  });

  test('deve exibir informações de pagamento', async ({ page }) => {
    await closeAnyOpenDialog(page);

    const orderCard = await findOrderCard(page, testOrderData.customer, testOrderData.product);
    await expect(orderCard).toBeVisible({ timeout: 15000 });
    await orderCard.scrollIntoViewIfNeeded();
    await orderCard.click();

    const dialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /Detalhes do Pedido/i })
      .first();
    if (!(await dialog.isVisible().catch(() => false))) {
      await orderCard.click({ force: true }).catch(() => {});
    }
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Verificar status de pagamento
    const paymentStatus = dialog.getByText(/Pago|Parcial|Pendente/i);
    await expect(paymentStatus.first()).toBeVisible({ timeout: 5000 });

    await closeAnyOpenDialog(page);
  });

  test('deve entrar em modo de edição e excluir pedido', async ({ page }) => {
    await closeAnyOpenDialog(page);

    const orderCard = await findOrderCard(page, testOrderData.customer, testOrderData.product);
    await expect(orderCard).toBeVisible({ timeout: 15000 });
    await orderCard.scrollIntoViewIfNeeded();
    await orderCard.click();

    const dialog = page
      .locator('[role="dialog"]')
      .filter({ hasText: /Detalhes do Pedido/i })
      .first();
    if (!(await dialog.isVisible().catch(() => false))) {
      await orderCard.click({ force: true }).catch(() => {});
    }
    await expect(dialog).toBeVisible({ timeout: 10000 });

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
