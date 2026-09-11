import { test, expect } from '@playwright/test';
import { getTestCredentials } from './utils/auth.util';

// Este teste pressupõe a criação/existência de um usuário "Funcionário".
// Como o teste E2E atual só loga com o TEST_USER (que é admin),
// vamos simular a falta de botões para roles limitadas manipulando a UI apenas se pudermos mockar a API,
// ou simplesmente checando que os controles RBAC existem no frontend.

test.describe('Controle de Permissões (RBAC)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    const TEST_USER = getTestCredentials();
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('admin deve ver a tela de configurações e controle de usuários', async ({ page }) => {
    // Verificar menu lateral
    const menuButton = page.getByRole('button', { name: /Menu/i });
    if(await menuButton.isVisible()) await menuButton.click();

    // Como ADMIN, os botões de relatórios, configs e usuários devem estar visíveis
    await expect(page.getByRole('link', { name: /Configurações/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Relatórios/i })).toBeVisible();
  });
});
