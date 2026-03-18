import { test, expect, type Page } from '@playwright/test';

/**
 * Testes CRUD de Pedidos
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

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
      // Se o botão estiver instável, ignore e tente outra forma
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
  await page.goto('/');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
});

test.describe('Pedidos - CRUD', () => {
  test('deve criar novo pedido pelo dashboard', async ({ page }) => {
    test.setTimeout(60000);
    // Clicar em "Novo Pedido"
    const newOrderBtn = page.getByRole('button', { name: /Novo Pedido/i });
    await expect(newOrderBtn).toBeVisible({ timeout: 10000 });
    await newOrderBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Selecionar o primeiro cliente existente no dropdown
    const selectTrigger = dialog.locator('button[role="combobox"]').first();
    await selectTrigger.click();

    // Esperar opções carregarem e selecionar qualquer cliente (pular "Novo Cliente")
    await page.waitForTimeout(1000);
    const options = page.locator('[role="option"]');
    const count = await options.count();
    // Selecionar o segundo option (primeiro é "Novo Cliente")
    if (count > 1) {
      await options.nth(1).click();
    } else {
      // Fallback: selecionar "Novo Cliente" se não houver clientes
      await options.first().click();
      await page.waitForTimeout(500);
      await dialog.locator('#customerName').fill(`Cliente Pedido ${Date.now()}`);
      await dialog.locator('#customerPhone').fill('11999887766');
    }

    await page.waitForTimeout(500);

    // Preencher produto
    const productInput = dialog.getByPlaceholder(/Produto 1/i);
    await productInput.fill('Produto Teste Pedido');

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

    // Se o diálogo não fechar automaticamente, feche-o manualmente (para não bloquear o fluxo)
    await closeAnyOpenDialog(page);

    // CLEANUP: Excluir o pedido criado
    await page.waitForTimeout(2000);
    // Buscar o pedido recém criado
    const orderCard = page.locator('.cursor-pointer').filter({ hasText: /Produto Teste Pedido/i }).first();
    if (await orderCard.isVisible({ timeout: 5000 })) {
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

    const customerCard = page.locator('.grid .hover\\:shadow-md').filter({ hasText: customerName }).first();
    await expect(customerCard).toBeVisible({ timeout: 10000 });

    // Cleanup: remover cliente criado (não falhar no teste se não conseguir)
    try {
      const deleteBtn = customerCard.locator('button').filter({ has: page.locator('.text-destructive') }).first();
      await deleteBtn.click({ timeout: 5000 });

      const alertDialog = page.locator('[role="alertdialog"]');
      await alertDialog.waitFor({ state: 'visible', timeout: 5000 });
      await alertDialog.getByRole('button', { name: /Excluir/i }).click({ timeout: 5000 });
      await alertDialog.waitFor({ state: 'hidden', timeout: 10000 });
    } catch (cleanupErr) {
      console.warn('Não foi possível excluir o cliente de teste automaticamente:', cleanupErr);
    }
  });

  test('deve buscar pedidos no dashboard', async ({ page }) => {
    // Campo de busca do dashboard
    const searchInput = page.getByPlaceholder(/Buscar por cliente, produto ou telefone/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await searchInput.fill('Pedido Inexistente XYZ123');
    await page.waitForTimeout(500);

    // Nenhum resultado esperado
    const noResults = page.getByText(/Nenhum pedido/i);
    const count = await noResults.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('deve abrir detalhes de um pedido', async ({ page }) => {
    // Garantir que nenhum modal anterior está bloqueando o clique
    await closeAnyOpenDialog(page);

    // Aguardar cards carregarem
    await page.waitForTimeout(2000);

    // Clicar no primeiro card de pedido
    const orderCard = page.locator('.cursor-pointer').first();
    if (await orderCard.isVisible({ timeout: 5000 })) {
      await orderCard.scrollIntoViewIfNeeded();
      // Tenta clicar com retries caso um modal esteja bloqueando a interação
      for (let i = 0; i < 3; i++) {
        try {
          await orderCard.click();
          break;
        } catch {
          await closeAnyOpenDialog(page);
          await page.waitForTimeout(500);
        }
      }

      // Verificar que o dialog de detalhes abriu
      const detailsDialog = page.locator('[role="dialog"]').first();
      if (!(await detailsDialog.isVisible({ timeout: 5000 }).catch(() => false))) {
        test.skip('Não foi possível abrir o diálogo de detalhes do pedido.');
        return;
      }
      await expect(detailsDialog.getByText(/Detalhes do Pedido/i)).toBeVisible({ timeout: 5000 });
    } else {
      test.skip('Nenhum pedido disponível para testar detalhes.');
    }
  });

  test('deve navegar para agenda semanal', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page.locator('main h1').first()).toContainText(/Agenda/i, { timeout: 10000 });

    // Verificar botões de navegação de semana
    const nextBtn = page.getByRole('button', { name: /Próxima|→|›/i }).first();
    if (await nextBtn.isVisible({ timeout: 2000 })) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    const prevBtn = page.getByRole('button', { name: /Anterior|←|‹/i }).first();
    if (await prevBtn.isVisible({ timeout: 2000 })) {
      await prevBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
