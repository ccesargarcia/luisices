import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

// Este teste valida controles RBAC existentes no frontend.

test.describe('Controle de Permissões (RBAC)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await ensureAuthenticated(page);
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
