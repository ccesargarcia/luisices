import { test, expect, type Page } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes CRUD de Pedidos
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
  const overlay = page.locator('[data-slot="dialog-overlay"]');
  await expect(overlay).not.toBeVisible({ timeout: 3000 }).catch(() => {});
}

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);
});

test.describe('Pedidos - CRUD', () => {
  test('importa pedido com 20 etiquetas, atualiza preço e etiqueta e mantém os dados após recarga', async ({ page }) => {
    test.setTimeout(90000);
    const timestamp = Date.now();
    const customerName = `Cliente Import E2E ${timestamp}`;
    const productName = `Produto Import E2E ${timestamp}`;
    const revisedTag = `Etiqueta Atualizada E2E ${timestamp}`;
    const tagNames = Array.from({ length: 20 }, (_, index) => `Etiqueta E2E ${String(index + 1).padStart(2, '0')}`);
    const deliveryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const csv = [
      'Cliente,Telefone,Produto,Quantidade,Preço,Entrega,Status,Status Pagamento,Valor Pago,Forma de pagamento,Tags',
      `"${customerName}","11999999999","${productName}",1,"100,00",${deliveryDate},"Em Produção","Parcial","30,50","Pix","${tagNames.join(';')}"`,
    ].join('\n');

    await page.getByRole('button', { name: /Importar Excel/i }).click();
    const importDialog = page.getByRole('dialog').filter({ hasText: 'Importar Pedidos via Excel' });
    await expect(importDialog).toBeVisible();
    await importDialog.locator('input[type="file"]').setInputFiles({
      name: `import-orders-${timestamp}.csv`,
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf8'),
    });

    await expect(importDialog.getByText('Total: 1')).toBeVisible({ timeout: 15000 });
    await expect(importDialog.getByText('Válidos: 1')).toBeVisible();
    await importDialog.getByRole('button', { name: 'Importar 1 pedido' }).click();
    await expect(importDialog.getByText('Importação Concluída!')).toBeVisible({ timeout: 30000 });
    await expect(importDialog.getByText(/1 de 1 pedido\(s\) foram cadastrados com sucesso/)).toBeVisible();
    await importDialog.getByRole('button', { name: 'Concluir' }).click();

    const search = page.getByPlaceholder('Buscar por cliente, produto ou telefone...');
    await expect(search).toBeVisible({ timeout: 15000 });
    await search.fill(customerName);
    const orderCard = page.locator('.cursor-pointer').filter({ hasText: customerName }).first();
    await expect(orderCard).toBeVisible({ timeout: 20000 });
    await orderCard.click();

    const detailsDialog = page.getByRole('dialog').first();
    await expect(detailsDialog.getByText('Detalhes do Pedido')).toBeVisible();
    await detailsDialog.getByRole('button', { name: 'Editar' }).click();
    const priceInput = detailsDialog.getByPlaceholder('0,00').first();
    await priceInput.fill('130,50');
    await expect(priceInput).toHaveValue('130,50');
    await expect(detailsDialog.getByText('Total: R$ 130,50')).toBeVisible();

    const tagInput = detailsDialog.getByRole('textbox', { name: 'Adicionar tag' });
    await tagInput.press('Backspace');
    await tagInput.fill(revisedTag);
    await tagInput.press('Enter');
    await detailsDialog.getByRole('button', { name: 'Salvar Alterações' }).click();

    await expect(detailsDialog.getByText(revisedTag)).toBeVisible({ timeout: 15000 });
    await expect(detailsDialog.getByText('Valor Total').locator('..')).toContainText(/130,50/);

    // A recarga comprova que preço e tag foram persistidos no Firestore.
    await page.reload();
    await expect(page.getByPlaceholder('Buscar por cliente, produto ou telefone...')).toBeVisible({ timeout: 20000 });
    await page.getByPlaceholder('Buscar por cliente, produto ou telefone...').fill(revisedTag);
    const persistedOrder = page.locator('.cursor-pointer').filter({ hasText: customerName }).first();
    await expect(persistedOrder).toBeVisible({ timeout: 20000 });
    await persistedOrder.click();

    const persistedDetails = page.getByRole('dialog').first();
    await expect(persistedDetails.getByText(revisedTag)).toBeVisible();
    await expect(persistedDetails.getByText('Valor Total').locator('..')).toContainText(/130,50/);
  });

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

    // Submeter e aguardar fechar
    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

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
    const customerPhone = `11988${String(Math.floor(100000 + Math.random() * 900000))}`;

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

    // Aguardar o diálogo fechar após salvar
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // Acessar a página de clientes e verificar que o cliente novo está listado
    await page.goto('/clientes');
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 15000 });

    const searchInput = page.getByPlaceholder(/Buscar por nome, telefone ou email/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill(customerName);

    const customerCard = page.locator('[data-slot="card"]').filter({ hasText: customerName }).first();
    await expect(customerCard).toBeVisible({ timeout: 15000 });

    // Cleanup: remover cliente criado
    try {
      const deleteBtn = customerCard.locator('button').filter({ has: page.locator('.text-destructive') }).first();
      if (await deleteBtn.isVisible({ timeout: 3000 })) {
        await deleteBtn.click({ timeout: 3000 });

        const alertDialog = page.locator('[role="alertdialog"]');
        if (await alertDialog.isVisible({ timeout: 3000 })) {
          const confirmBtn = alertDialog.getByRole('button', { name: /Excluir/i });
          if (await confirmBtn.isVisible({ timeout: 1000 })) {
            await confirmBtn.click();
            await alertDialog.waitFor({ state: 'hidden', timeout: 5000 });
          } else {
            // Cliente possui pedido ativo, fechar dialog pelo Cancelar
            await alertDialog.getByRole('button', { name: /Cancelar/i }).click();
            await alertDialog.waitFor({ state: 'hidden', timeout: 5000 });
          }
        }
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

  test('deve alternar entre abas de status na esteira de produção', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Abas de status
    const pendingTab = page.getByRole('tab', { name: /Pendentes/i });
    const inProgressTab = page.getByRole('tab', { name: /Em Produção/i });
    const completedTab = page.getByRole('tab', { name: /Concluídos/i });
    const allTab = page.getByRole('tab', { name: /Todos/i });

    await expect(allTab).toBeVisible({ timeout: 5000 });
    await expect(pendingTab).toBeVisible({ timeout: 5000 });

    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute('data-state', 'active');

    await inProgressTab.click();
    await expect(inProgressTab).toHaveAttribute('data-state', 'active');

    await completedTab.click();
    await expect(completedTab).toHaveAttribute('data-state', 'active');

    await allTab.click();
    await expect(allTab).toHaveAttribute('data-state', 'active');
  });

  test('deve alternar modo de exibição entre cards e tabela no dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const tableModeBtn = page.getByTitle('Visualização em Tabela');
    const gridModeBtn = page.getByTitle('Visualização em Cards');

    await expect(tableModeBtn).toBeVisible({ timeout: 5000 });
    await expect(gridModeBtn).toBeVisible({ timeout: 5000 });

    await tableModeBtn.click();
    await page.waitForTimeout(300);

    await gridModeBtn.click();
    await page.waitForTimeout(300);
  });
});

