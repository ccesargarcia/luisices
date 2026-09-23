import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes E2E de Usuários e Permissões
 * Cobre listagem de usuários, abertura do modal de novo usuário e matriz de permissões
 */

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);
});

test.describe('Gerenciamento de Usuários', () => {
  test('deve carregar tela de usuários com cards de resumo', async ({ page }) => {
    await page.goto('/usuarios');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar container principal e cabeçalho
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 15000 });

    const heading = page.getByRole('heading', { name: /Usuários/i }).first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // 2. Validar cards de resumo
    await expect(page.getByText('Total de usuários').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Ativos').first()).toBeVisible({ timeout: 15000 });

    // 3. Validar botões de ação
    const newUserBtn = page.getByRole('button', { name: /Novo usuário/i }).first();
    await expect(newUserBtn).toBeVisible({ timeout: 15000 });

    const inviteBtn = page.getByRole('button', { name: /Enviar convite/i }).first();
    await expect(inviteBtn).toBeVisible({ timeout: 15000 });
  });

  test('deve abrir modal de novo usuário e validar matriz de permissões', async ({ page }) => {
    await page.goto('/usuarios');
    await page.waitForLoadState('domcontentloaded');

    // 1. Abrir modal
    const newUserBtn = page.getByRole('button', { name: /Novo usuário/i }).first();
    await expect(newUserBtn).toBeVisible({ timeout: 15000 });
    await newUserBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 15000 });

    // 2. Validar campos de entrada
    await expect(dialog.locator('#user-name, #uf-name')).toBeVisible({ timeout: 15000 });
    await expect(dialog.locator('#user-email, #uf-email')).toBeVisible({ timeout: 15000 });
    await expect(dialog.locator('#user-password, #uf-pass')).toBeVisible({ timeout: 15000 });

    // 3. Validar seções de permissões
    await expect(dialog.getByText(/Permissões (de acesso|granulares)/i).first()).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText('Dashboard').first()).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText('Pedidos').first()).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText('Clientes').first()).toBeVisible({ timeout: 15000 });

    // 4. Cancelar / Fechar modal
    const cancelBtn = dialog.getByRole('button', { name: /Cancelar/i }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 15000 });
    await cancelBtn.click();

    await expect(dialog).not.toBeVisible({ timeout: 15000 });
  });
});
