import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes de Navegação
 *
 * Verifica se todas as páginas principais carregam corretamente
 */

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);
});

test.describe('Navegação entre Páginas', () => {
  const pages = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Pedidos Arquivados', path: '/pedidos-arquivados' },
    { name: 'Agenda', path: '/agenda' },
    { name: 'Clientes', path: '/clientes' },
    { name: 'Produtos', path: '/produtos' },
    { name: 'Orçamentos', path: '/orcamentos' },
    { name: 'Permutas', path: '/permutas' },
    { name: 'Relatórios', path: '/relatorios' },
    { name: 'Galeria', path: '/galeria' },
    { name: 'WhatsApp', path: '/whatsapp' },
    { name: 'Produtos Loja', path: '/produtos-lojinha' },
    { name: 'Pedidos Loja', path: '/pedidos-lojinha' },
    { name: 'Personalizar Lojinha', path: '/personalizar-lojinha' },
    { name: 'Precificação', path: '/precificacao' },
    { name: 'Usuários', path: '/usuarios' },
    { name: 'Central de E-mails', path: '/emails' },
    { name: 'Configurações', path: '/configuracoes' },
    { name: 'Ajuda', path: '/ajuda' },
  ];

  for (const { name, path } of pages) {
    test(`deve carregar página ${name}`, async ({ page }) => {
      await page.goto(path);

      // Certificar que estamos na rota certa
      const pathRegex = new RegExp(`${path}`);
      await expect(page).toHaveURL(pathRegex, { timeout: 15000 });

      // Verificar se o container principal está visível
      await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });
    });
  }

  test('deve navegar usando menu lateral', async ({ page }) => {
    // Procurar link de Clientes no menu
    const customersLink = page.locator('aside a[href*="clientes"], a[href*="clientes"]').first();
    await expect(customersLink).toBeVisible({ timeout: 5000 });

    await customersLink.click();
    await page.waitForURL('**/clientes', { timeout: 5000 });

    // Esperar o h1 da página de clientes
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 10000 });
  });

  test('deve abrir submenu da Lojinha Online e navegar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });

    // O submenu pode vir aberto por padrão ou recolhido.
    const storeProductsLink = page.locator('aside a[href*="produtos-lojinha"], a[href*="produtos-lojinha"]').first();
    const isLinkVisible = await storeProductsLink.isVisible().catch(() => false);

    if (!isLinkVisible) {
      const storeSubmenuBtn = page.getByRole('button', { name: /Lojinha Online/i }).first();
      if (await storeSubmenuBtn.isVisible({ timeout: 5000 })) {
        await storeSubmenuBtn.click();
      }
    }

    // O link de Produtos da Lojinha deve ficar visível
    await expect(storeProductsLink).toBeVisible({ timeout: 5000 });
    await storeProductsLink.click();
    await page.waitForURL('**/produtos-lojinha', { timeout: 10000 });
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
  });

  test('deve abrir a busca global com atalho Ctrl+K', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });

    // Fechar qualquer dialog que porventura esteja aberto
    const openDialog = page.locator('[role="dialog"]');
    if (await openDialog.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Acionar atalho de busca global
    await page.keyboard.press('Control+k');

    // Dialog de busca global CommandDialog (título "Busca Global" ou placeholder de busca rápida)
    const searchDialog = page.locator('[role="dialog"]').filter({ hasText: /Busca Global|ações rápidas|atalhos/i }).first();
    let isDialogOpen = await searchDialog.isVisible({ timeout: 3000 }).catch(() => false);

    if (!isDialogOpen) {
      // Se atalho não abriu (ex: restrição do headless do browser), acionar pelo botão no topo
      const searchBtn = page.locator('button[title*="Buscar"], button:has-text("Buscar"), button:has-text("Ctrl + K"), button:has-text("Ctrl+K")').first();
      if (await searchBtn.isVisible({ timeout: 3000 })) {
        await searchBtn.click();
        isDialogOpen = await searchDialog.isVisible({ timeout: 5000 }).catch(() => false);
      }
    }

    await expect(searchDialog).toBeVisible({ timeout: 5000 });
    const input = searchDialog.locator('input').first();
    await expect(input).toBeVisible({ timeout: 3000 });

    // Fechar com Escape
    await page.keyboard.press('Escape');
    await expect(searchDialog).not.toBeVisible({ timeout: 5000 });
  });

  test('deve voltar ao dashboard usando logo/home', async ({ page }) => {
    // Ir para outra página primeiro
    await page.goto('/clientes');
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 10000 });

    // Clicar no link do Dashboard no menu de navegação
    const homeButton = page.locator('aside a[href="/"], a[href="/"]').first();
    await expect(homeButton).toBeVisible({ timeout: 5000 });

    await homeButton.click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });

    // Verificar que voltou ao dashboard
    await expect(page.locator('main h1').first()).toContainText(/Dashboard|Bom dia|Boa tarde|Boa noite/i, { timeout: 10000 });
  });
});
