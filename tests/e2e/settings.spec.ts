import { test, expect } from '@playwright/test';

/**
 * Testes da página de Configurações
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

test.beforeEach(async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });

  await page.goto('/configuracoes');
  await expect(page.locator('main h1').first()).toContainText(/Configurações/i, { timeout: 10000 });
});

test.describe('Configurações', () => {
  test('deve exibir seções de configuração', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Informações do Negócio' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Aparência e identidade visual' })).toBeVisible();
  });

  test('deve preencher informações do negócio', async ({ page }) => {
    const businessName = page.locator('#businessName');
    await expect(businessName).toBeVisible({ timeout: 5000 });
    const originalName = await businessName.inputValue();

    await businessName.fill('Papelaria Teste E2E');
    const businessPhone = page.locator('#businessPhone');
    await expect(businessPhone).toBeVisible({ timeout: 5000 });
    await businessPhone.fill('(11) 98765-4321');
    const businessEmail = page.locator('#businessEmail');
    await expect(businessEmail).toBeVisible({ timeout: 5000 });
    await businessEmail.fill('teste@papelaria.com');

    const saveBtn = page.getByRole('button', { name: /Salvar Informações/i });
    await expect(saveBtn).toBeVisible({ timeout: 3000 });
    await saveBtn.click();
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });

    await businessName.fill(originalName || '');
    await saveBtn.click();
  });

  test('deve alterar tema claro/escuro', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Aparência e identidade visual' })).toBeVisible({ timeout: 5000 });
    const darkBtn = page.getByRole('button', { name: /Escuro/i });
    await expect(darkBtn).toBeVisible({ timeout: 5000 });
    await darkBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    const lightBtn = page.getByRole('button', { name: /Claro/i });
    await expect(lightBtn).toBeVisible({ timeout: 5000 });
    await lightBtn.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('deve configurar operação padrão', async ({ page }) => {
    await expect(page.getByText('Operação Padrão')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Alerta de prazo/i)).toBeVisible({ timeout: 5000 });
    const saveOpBtn = page.getByRole('button', { name: /Salvar Operação/i });
    await expect(saveOpBtn).toBeVisible({ timeout: 5000 });
    await saveOpBtn.click();
  });
});
