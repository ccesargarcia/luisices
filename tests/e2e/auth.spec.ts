import { test, expect } from '@playwright/test';

/**
 * Testes de Autenticação
 *
 * Verifica se o sistema de login/logout está funcionando
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

test.describe('Autenticação', () => {
  test('deve exibir página de login', async ({ page }) => {
    await page.goto('/');

    // Verifica se está na página de login
    await expect(page.locator('h1')).toContainText('Login');

    // Verifica se existem campos de login
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('deve fazer login com credenciais válidas', async ({ page }) => {
    await page.goto('/');

    // Preencher formulário
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Clicar no botão de login
    await page.click('button[type="submit"]');

    // Aguardar redirecionamento para dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verificar se está no dashboard
    await expect(page.locator('h1')).toContainText(/Dashboard|Bom dia|Boa tarde|Boa noite/);
  });

  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="email"]', 'usuario@invalido.com');
    await page.fill('input[type="password"]', 'senhaerrada');

    await page.click('button[type="submit"]');

    // Aguardar mensagem de erro (toast, alert, etc)
    // Ajuste o seletor conforme sua implementação
    await expect(page.locator('[role="alert"]').or(page.locator('.sonner'))).toBeVisible({ timeout: 5000 });
  });
});
