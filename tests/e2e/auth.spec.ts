import { test, expect } from '@playwright/test';
import { getTestCredentials } from './utils/auth.util';

/**
 * Testes de Autenticação
 *
 * Verifica se o sistema de login, logout e proteção de rotas funcionam.
 */

const TEST_USER = getTestCredentials();

// Garante que os testes de autenticação iniciem sem sessão pré-armazenada
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Autenticação', () => {
  test('deve exibir página de login', async ({ page }) => {
    await page.goto('/');

    // Verifica se está na página de login
    await expect(page.getByRole('heading', { name: /Bem-vindo|Login/i })).toBeVisible();

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
    await page.waitForURL('**/dashboard', { timeout: 20000 });

    // Verificar se o container principal do dashboard está visível
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="email"]', 'usuario@invalido.com');
    await page.fill('input[type="password"]', 'senhaerrada');

    await page.click('button[type="submit"]');

    // Aguardar mensagem de erro (toast, alert, etc)
    await expect(
      page.locator('[role="alert"]').or(page.locator('.sonner')).or(page.getByText(/inválid|erro|incorret/i)).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('deve redirecionar para login ao acessar rota protegida sem autenticação', async ({ page }) => {
    await page.goto('/dashboard');

    // Usuário sem sessão deve ser enviado de volta para a raiz (login)
    await page.waitForURL((url) => !url.pathname.includes('/dashboard'), { timeout: 15000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('deve fazer logout com sucesso pela barra superior', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Fazer login
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 20000 });

    // 2. Abrir menu de perfil no header
    const profileBtn = page.locator('header button.rounded-full').last();
    await expect(profileBtn).toBeVisible({ timeout: 10000 });
    await profileBtn.click();

    // 3. Clicar em Sair
    const logoutItem = page.getByRole('menuitem', { name: /Sair/i });
    await expect(logoutItem).toBeVisible({ timeout: 5000 });
    await logoutItem.click();

    // 4. Deve redirecionar para login
    await page.waitForURL((url) => !url.pathname.includes('/dashboard'), { timeout: 15000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });
});

