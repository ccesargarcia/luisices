import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Testes da página de Configurações
 */

test.beforeEach(async ({ page }) => {
  test.setTimeout(60000);
  await ensureAuthenticated(page);

  await page.goto('/configuracoes');
  await expect(page.locator('main h1').first()).toContainText(/Configurações/i, { timeout: 10000 });
});

test.describe('Configurações', () => {
  test('deve exibir seções de configuração e navegar pelas abas', async ({ page }) => {
    // 1. Aba Empresa (ativa por padrão)
    await expect(page.getByRole('heading', { name: 'Informações do Negócio' })).toBeVisible({ timeout: 5000 });

    // 2. Navegar para a aba Operação
    const opTab = page.getByRole('tab', { name: /Operação/i });
    await expect(opTab).toBeVisible({ timeout: 5000 });
    await opTab.click();
    await expect(page).toHaveURL(/tab=operacao/, { timeout: 5000 });
    await expect(page.getByText('Operação Padrão')).toBeVisible({ timeout: 5000 });

    // 3. Navegar para a aba Aparência
    const apTab = page.getByRole('tab', { name: /Aparência/i });
    await expect(apTab).toBeVisible({ timeout: 5000 });
    await apTab.click();
    await expect(page).toHaveURL(/tab=aparencia/, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Aparência e identidade visual' })).toBeVisible({ timeout: 5000 });
  });

  test('deve preencher informações do negócio', async ({ page }) => {
    // Garantir que está na aba empresa
    const empTab = page.getByRole('tab', { name: /Empresa/i });
    if (await empTab.isVisible()) {
      await empTab.click();
    }

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

  test('deve alterar tema claro/escuro na aba de aparência', async ({ page }) => {
    // Acessar diretamente ou clicar na aba aparência
    await page.goto('/configuracoes?tab=aparencia');
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

  test('deve configurar operação padrão na aba de operação', async ({ page }) => {
    await page.goto('/configuracoes?tab=operacao');
    await expect(page.getByText('Operação Padrão')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Alerta de prazo/i)).toBeVisible({ timeout: 5000 });
    const saveOpBtn = page.getByRole('button', { name: /Salvar Operação/i });
    await expect(saveOpBtn).toBeVisible({ timeout: 5000 });
    await saveOpBtn.click();
  });

  test('deve preservar a aba ativa ao recarregar a página', async ({ page }) => {
    await page.goto('/configuracoes?tab=aparencia');
    await expect(page.getByRole('heading', { name: 'Aparência e identidade visual' })).toBeVisible({ timeout: 5000 });

    // Recarregar a página
    await page.reload();
    await expect(page).toHaveURL(/tab=aparencia/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Aparência e identidade visual' })).toBeVisible({ timeout: 5000 });
  });
});
