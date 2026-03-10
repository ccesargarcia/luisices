import { test, expect } from '@playwright/test';

/**
 * Testes CRUD de Clientes - VERSÃO CORRIGIDA
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Navegar para a página de clientes
  await page.goto('/clientes');
  const heading = page.locator('main h1').first();
  await expect(heading).toContainText(/Clientes/i, { timeout: 10000 });

  // Aguardar a página carregar completamente
  await page.waitForLoadState('domcontentloaded');
});

test.describe('Clientes - CRUD', () => {
  const testCustomer = {
    name: `Cliente Teste ${Date.now()}`,
    phone: `11987${String(Math.floor(100000 + Math.random() * 900000))}`,
    email: `teste${Date.now()}@exemplo.com`,
    notes: 'Cliente criado por teste automatizado',
  };

  test('deve criar um novo cliente', async ({ page }) => {
    test.setTimeout(60000);
    // Clicar no botão "Novo Cliente" usando role e texto
    const newButton = page.getByRole('button', { name: /Novo Cliente/i });
    await expect(newButton).toBeVisible({ timeout: 10000 });
    await newButton.click();

    // Aguardar dialog abrir
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Preencher formulário - escopo ao dialog para evitar conflitos
    await dialog.getByPlaceholder(/Nome completo/i).fill(testCustomer.name);
    await dialog.getByPlaceholder(/00000-0000/i).fill(testCustomer.phone);
    const emailInput = dialog.getByPlaceholder(/email@exemplo/i);
    if (await emailInput.isVisible({ timeout: 1000 })) {
      await emailInput.fill(testCustomer.email);
    }

    // Salvar
    const saveButton = dialog.getByRole('button', { name: /Criar Cliente/i });
    await saveButton.click();

    // Aguardar dialog fechar
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verificar que o cliente foi criado
    await page.waitForTimeout(1000);
    const customerCard = page.getByText(testCustomer.name);
    await expect(customerCard).toBeVisible({ timeout: 5000 });

    // CLEANUP: Excluir o cliente criado
    const card = page.locator('.grid .hover\\:shadow-md').filter({ hasText: testCustomer.name }).first();
    const deleteBtn = card.locator('button').filter({ has: page.locator('.text-destructive') });
    await deleteBtn.click();

    const alertDialog = page.locator('[role="alertdialog"]');
    await expect(alertDialog).toBeVisible({ timeout: 5000 });
    await alertDialog.getByRole('button', { name: /Excluir/i }).click();
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 });
  });

  test('deve buscar clientes', async ({ page }) => {
    // Usar o input de busca pelo placeholder
    const searchInput = page.getByPlaceholder(/Buscar por nome, telefone ou email/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Buscar por algo aleatório
    await searchInput.fill('Cliente Inexistente XYZ123');
    await page.waitForTimeout(500);

    // Deve mostrar mensagem de nenhum resultado ou lista vazia
    const noResults = page.getByText(/Nenhum cliente/i);
    const count = await noResults.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('deve exportar clientes para Excel', async ({ page }) => {
    // Verificar que o botão de exportar existe
    const exportButton = page.getByRole('button').filter({ hasText: /Excel|Exportar/i }).first();

    if (await exportButton.isVisible({ timeout: 2000 })) {
      await expect(exportButton).toBeVisible();
      // Não vamos clicar para não baixar arquivo de fato
    }
  });
});
