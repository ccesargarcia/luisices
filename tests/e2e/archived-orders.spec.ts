import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes E2E para a página de Pedidos Arquivados (/pedidos-arquivados)
 */

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);
});

test.describe('Pedidos Arquivados', () => {
  test('deve carregar a página de pedidos arquivados com métricas e controles', async ({ page }) => {
    await page.goto('/pedidos-arquivados');
    await page.waitForLoadState('domcontentloaded');

    // 1. Título e cabeçalho
    const heading = page.getByRole('heading', { name: /Pedidos Arquivados/i });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 2. Links rápidos no cabeçalho
    const backToDashboard = page.getByRole('link', { name: /Voltar ao Dashboard/i });
    await expect(backToDashboard).toBeVisible({ timeout: 5000 });

    const configArchiving = page.getByRole('link', { name: /Configurar Arquivamento/i });
    await expect(configArchiving).toBeVisible({ timeout: 5000 });

    // 3. Cards de métricas
    await expect(page.getByText('Total Arquivados').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Faturamento Arquivado').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Recebido').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pendente a Receber').first()).toBeVisible({ timeout: 10000 });

    // 4. Input de busca
    const searchInput = page.getByPlaceholder(/Buscar por cliente, pedido #, produto, telefone ou tags/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // 5. Botão de Exportar Excel
    const exportBtn = page.getByRole('button', { name: /Exportar Excel/i });
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  });

  test('deve alternar modo de visualização entre cards e tabela', async ({ page }) => {
    await page.goto('/pedidos-arquivados');
    await page.waitForLoadState('domcontentloaded');

    const tableToggleBtn = page.getByTitle('Visualização em Tabela');
    const gridToggleBtn = page.getByTitle('Visualização em Cards');

    await expect(tableToggleBtn).toBeVisible({ timeout: 5000 });
    await expect(gridToggleBtn).toBeVisible({ timeout: 5000 });

    // Alternar para modo tabela
    await tableToggleBtn.click();
    await page.waitForTimeout(300);

    // Alternar de volta para modo cards
    await gridToggleBtn.click();
    await page.waitForTimeout(300);
  });

  test('deve expandir e interagir com o painel de filtros avançados', async ({ page }) => {
    await page.goto('/pedidos-arquivados');
    await page.waitForLoadState('domcontentloaded');

    // Botão de expandir filtros
    const filtersBtn = page.getByRole('button', { name: /Filtros de Data & Pagamento/i });
    await expect(filtersBtn).toBeVisible({ timeout: 5000 });
    await filtersBtn.click();

    // Validar controles de filtros
    await expect(page.getByText('Filtrar pelo campo de data')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Período pré-definido')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Intervalo de datas')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Pagamento e Ordenação')).toBeVisible({ timeout: 5000 });

    // Fechar filtros avançados
    await filtersBtn.click();
  });

  test('deve filtrar por busca de texto e exibir estado vazio para item inexistente', async ({ page }) => {
    await page.goto('/pedidos-arquivados');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByPlaceholder(/Buscar por cliente, pedido #, produto, telefone ou tags/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Digitar string aleatória que não existe
    await searchInput.fill('XYZ_PEDIDO_INEXISTENTE_99999');
    await page.waitForTimeout(400);

    // Deve exibir empty state ou badge de filtro ativo
    const emptyState = page.getByText(/Nenhum pedido arquivado encontrado/i);
    await expect(emptyState).toBeVisible({ timeout: 5000 });

    // Limpar busca pelo botão de limpar
    const clearFilterBtn = page.getByRole('button', { name: /Limpar todos os filtros/i });
    if (await clearFilterBtn.isVisible()) {
      await clearFilterBtn.click();
      await expect(searchInput).toHaveValue('');
    }
  });

  test('deve navegar de volta ao Dashboard via link de cabeçalho', async ({ page }) => {
    await page.goto('/pedidos-arquivados');
    await page.waitForLoadState('domcontentloaded');

    const backLink = page.getByRole('link', { name: /Voltar ao Dashboard/i });
    await expect(backLink).toBeVisible({ timeout: 5000 });
    await backLink.click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});
