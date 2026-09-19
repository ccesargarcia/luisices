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
    { name: 'Precificação', path: '/precificacao' },
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
    const customersLink = page.locator('a[href*="clientes"]').first();
    await expect(customersLink).toBeVisible({ timeout: 5000 });

    await customersLink.click();
    await page.waitForURL('**/clientes', { timeout: 5000 });

    // Esperar o h1 da página de clientes
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 10000 });
  });

  test('deve voltar ao dashboard usando logo/home', async ({ page }) => {
    // Ir para outra página primeiro
    await page.goto('/clientes');
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 10000 });

    // Clicar no link do Dashboard no menu de navegação
    const homeButton = page.locator('a[href="/"]').first();
    await expect(homeButton).toBeVisible({ timeout: 5000 });

    await homeButton.click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });

    // Verificar que voltou ao dashboard
    await expect(page.locator('main h1').first()).toContainText(/Dashboard|Bom dia|Boa tarde|Boa noite/i, { timeout: 10000 });
  });
});
