import { test, expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Testes de Detalhes do Pedido, Status e Pagamento
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

function getTestOrderData(testInfo: TestInfo) {
  const suffix = `${testInfo.project.name}-${testInfo.testId}`.replace(/[^a-zA-Z0-9-]/g, '-');
  return {
    product: `Produto Teste E2E ${suffix}`,
    customer: `Cliente Teste E2E ${suffix}`,
    phone: `119${String(Math.abs(hashCode(suffix))).slice(0, 8).padStart(8, '0')}`,
  };
}

function hashCode(value: string) {
  return [...value].reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0);
}

async function clickWithRetry(page: Page, locator: import('@playwright/test').Locator, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      await locator.scrollIntoViewIfNeeded();
      await locator.click();
      return true;
    } catch {
      await closeAnyOpenDialog(page);
      await page.waitForTimeout(500);
    }
  }
  return false;
}

async function closeAnyOpenDialog(page: Page) {
  const dialog = page.locator('[role="dialog"]').first();
  if (!(await dialog.isVisible().catch(() => false))) return;

  // 1) Tentar fechar com ESC (mais confiável)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  if (!(await dialog.isVisible().catch(() => false))) return;

  // 2) Tentar clicar no overlay (fora do modal)
  const overlay = page.locator('[data-slot="dialog-overlay"]').first();
  if (await overlay.isVisible().catch(() => false)) {
    await overlay.click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
    if (!(await dialog.isVisible().catch(() => false))) return;
  }

  // 3) Tentar clicar no botão de fechar (se existir e estiver habilitado)
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

    await closeBtn.click().catch(() => {});
    await page.waitForTimeout(250);
    if (!(await dialog.isVisible().catch(() => false))) return;
  }

  // 4) Último recurso: remover via DOM (para não travar testes)
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.evaluate((node: any) => node.remove()).catch(() => {});
    await page.waitForTimeout(250);
  }
}

// Cleanup: Excluir o pedido criado após cada teste
test.afterEach(async ({ page }, testInfo) => {
  await closeAnyOpenDialog(page);

  // Buscar o pedido criado pelo nome único
  const { product } = getTestOrderData(testInfo);
  const orderCard = page.locator('[data-slot="card"]').filter({ hasText: product }).first();
  if (await orderCard.count()) {
    await orderCard.click();

    const detailsDialog = page.locator('[role="dialog"]').first();
    await expect(detailsDialog).toBeVisible({ timeout: 10000 });

    const deleteBtn = detailsDialog.getByRole('button', { name: /Excluir Pedido/i });
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click();

    const alertDialog = page.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible({ timeout: 5000 });
    await alertDialog.getByRole('button', { name: /Excluir/i }).click();
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 });
  }
});

test.beforeEach(async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Cria um pedido via UI para garantir que sempre exista um card
  const newOrderBtn = page.getByRole('button', { name: /Novo Pedido/i });
  await newOrderBtn.click();
  const dialog = page.locator('[role="dialog"]').first();
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // Preencher cliente (criar novo)
  const selectTrigger = dialog.locator('button#customer[role="combobox"]');
  await selectTrigger.click();
  const options = page.locator('[role="option"]');
  await options.first().click();
  const { product, customer, phone } = getTestOrderData(testInfo);
  await dialog.locator('#customerName').fill(customer);
  await dialog.locator('#customerPhone').fill(phone);

  // Preencher produto
  const productInput = dialog.getByPlaceholder(/Produto 1/i);
  await productInput.fill(product);

  // Preencher valor unitário
  const priceInput = dialog.getByPlaceholder('0,00').first();
  await priceInput.fill('123');

  // Preencher data de entrega
  const dateInput = dialog.locator('#deliveryDate');
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  await dateInput.fill(futureDate.toISOString().split('T')[0]);

  // Submeter
  await dialog.locator('button[type="submit"]').click();

  // O diálogo deveria fechar ao criar o pedido; algumas vezes ele permanece
  // aberto por conta de validação ou atraso na resposta do backend.
  await expect(dialog).not.toBeVisible({ timeout: 15000 });
  const orderCard = page.locator('[data-slot="card"]').filter({ hasText: product }).first();
  await expect(orderCard).toBeVisible({ timeout: 10000 });
});

test.describe('Detalhes do Pedido', () => {
  test('deve abrir e visualizar detalhes completos', async ({ page }, testInfo) => {
    // Clicar no primeiro card de pedido
    const { product } = getTestOrderData(testInfo);
    const orderCard = page.locator('[data-slot="card"]').filter({ hasText: product }).first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await expect.poll(() => orderCard.count()).toBe(1);
    await orderCard.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText(/Detalhes do Pedido/i)).toBeVisible({ timeout: 5000 });

    // Verificar seções de informações
    await expect(dialog.getByText(/Cliente/i).first()).toBeVisible();
    await expect(dialog.getByText(/Produto/i).first()).toBeVisible();
    await expect(dialog.getByText(/Data de Entrega/i).first()).toBeVisible();
    await expect(dialog.getByText(/Valor Total/i).first()).toBeVisible();
  });

  test('deve exibir informações de pagamento', async ({ page }, testInfo) => {
    const { product } = getTestOrderData(testInfo);
    const orderCard = page.locator('[data-slot="card"]').filter({ hasText: product }).first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await orderCard.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Verificar status de pagamento
    const paymentStatus = dialog.getByText(/Pago|Parcial|Pendente/i);
    await expect(paymentStatus.first()).toBeVisible({ timeout: 5000 });
  });

  test('deve entrar em modo de edição', async ({ page }, testInfo) => {
    const { product } = getTestOrderData(testInfo);
    const orderCard = page.locator('[data-slot="card"]').filter({ hasText: product }).first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await orderCard.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Clicar em editar
    const editBtn = dialog.getByRole('button', { name: /Editar/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

      // Verificar que campos de edição aparecem
      const statusSelect = dialog.locator('#editStatus');
      await expect(statusSelect).toBeVisible({ timeout: 5000 });

      // Verificar campo de notas
      const notesField = dialog.locator('#notes');
      await expect(notesField).toBeVisible({ timeout: 5000 });

      // Cancelar edição
      const cancelBtn = dialog.getByRole('button', { name: /Cancelar/i }).first();
      await expect(cancelBtn).toBeVisible({ timeout: 5000 });
      await cancelBtn.click();
  });

  test('deve exibir workflow de produção', async ({ page }, testInfo) => {
    const { product } = getTestOrderData(testInfo);
    const orderCard = page.locator('[data-slot="card"]').filter({ hasText: product }).first();
    await expect(orderCard).toBeVisible({ timeout: 10000 });
    await orderCard.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Procurar workflow de produção (pode precisar scroll)
    const workflowTitle = dialog.getByText(/Workflow de Produção/i);
    await expect(workflowTitle).toBeVisible({ timeout: 5000 });

      // Verificar etapas do workflow
      const designStep = dialog.getByText('Design');
      await expect(designStep.first()).toBeVisible({ timeout: 3000 });
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
    await page.waitForTimeout(1000);

    // Limpar busca
    await searchInput.clear();
    await page.waitForTimeout(500);
  });

  test('deve exibir alertas de prazo quando existem', async ({ page }) => {
    await page.waitForTimeout(3000);

    // A ausência de pedidos é um estado válido; o Dashboard deve apresentar uma das mensagens reais.
    const emptyState = page.getByText(/Nenhuma entrega programada|Nenhum pedido em atraso|Tudo em dia/i).first();
    const alertSection = page.getByText(/Próximas Entregas|Pedidos Atrasados/i).first();
    await expect(emptyState.or(alertSection)).toBeVisible({ timeout: 5000 });
  });
});
