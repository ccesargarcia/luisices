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
    await expect(page.getByRole('heading', { name: /Luisices|Bem-vindo|Login/i })).toBeVisible();

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

  test('deve acessar tela de recuperação de senha e validar formulário', async ({ page }) => {
    await page.goto('/recuperar-senha');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar cabeçalho
    await expect(page.getByRole('heading', { name: /Recuperar Senha/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Digite seu e-mail para receber as instruções')).toBeVisible({ timeout: 5000 });

    // 2. Validar input de e-mail e botão de envio
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    const submitBtn = page.getByRole('button', { name: /Enviar E-mail/i });
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // 3. Validar link de retorno ao login
    const backBtn = page.getByRole('button', { name: /Voltar (para o|ao) login/i })
      .or(page.getByRole('link', { name: /Voltar (para o|ao) login/i }))
      .first();
    await expect(backBtn).toBeVisible({ timeout: 5000 });
  });

  test('deve acessar tela de registro e validar bloqueio sem convite', async ({ page }) => {
    await page.goto('/registrar');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar cabeçalho
    await expect(page.getByRole('heading', { name: /Criar Conta/i })).toBeVisible({ timeout: 5000 });

    // 2. Preencher dados de cadastro
    await page.locator('#name').fill('Usuário Teste');
    await page.locator('#email').fill('novo-teste@exemplo.com');
    await page.locator('#password').fill('Senha123456');
    await page.locator('#confirmPassword').fill('Senha123456');

    // 3. Tentar submeter sem convite válido
    const submitBtn = page.getByRole('button', { name: /Criar Conta/i });
    await submitBtn.click();

    // 4. Deve exibir alerta informando necessidade de convite
    const alert = page.getByText(/Este cadastro só pode ser acessado por um convite válido/i).first();
    await expect(alert).toBeVisible({ timeout: 10000 });
  });

  test('deve alternar a visibilidade da senha via botão Eye/EyeOff na tela de login', async ({ page }) => {
    await page.goto('/');

    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Clicar no botão de alternar senha (Ver senha)
    const toggleBtn = page.getByRole('button', { name: /Ver senha|Ocultar senha/i });
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    await toggleBtn.click();

    // Input deve se transformar em texto visível
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Clicar novamente para ocultar
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('deve navegar para o catálogo online público a partir da tela de login', async ({ page }) => {
    await page.goto('/');

    // Link para o catálogo público
    const catalogLink = page.getByRole('link', { name: /Acessar catálogo da lojinha/i });
    await expect(catalogLink).toBeVisible({ timeout: 5000 });
    await catalogLink.click();

    // Deve redirecionar para a rota do catálogo/loja
    await page.waitForURL(/\/(catalogo|loja)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(catalogo|loja)/);
  });
});


