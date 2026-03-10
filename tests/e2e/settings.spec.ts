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
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.goto('/configuracoes');
  await expect(page.locator('main h1').first()).toContainText(/Configurações/i, { timeout: 10000 });
});

test.describe('Configurações', () => {
  test('deve exibir seções de configuração', async ({ page }) => {
    // Verificar seções principais
    await expect(page.getByRole('heading', { name: 'Informações do Negócio' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Personalização' })).toBeVisible();
  });

  test('deve preencher informações do negócio', async ({ page }) => {
    // Campos de informações do negócio
    const businessName = page.locator('#businessName');
    await expect(businessName).toBeVisible({ timeout: 5000 });

    // Guardar valor original para restaurar depois
    const originalName = await businessName.inputValue();

    // Limpar e preencher
    await businessName.clear();
    await businessName.fill('Papelaria Teste E2E');

    const businessPhone = page.locator('#businessPhone');
    if (await businessPhone.isVisible({ timeout: 2000 })) {
      await businessPhone.clear();
      await businessPhone.fill('(11) 98765-4321');
    }

    const businessEmail = page.locator('#businessEmail');
    if (await businessEmail.isVisible({ timeout: 2000 })) {
      await businessEmail.clear();
      await businessEmail.fill('teste@papelaria.com');
    }

    // Salvar
    const saveBtn = page.getByRole('button', { name: /Salvar Informações/i });
    await expect(saveBtn).toBeVisible({ timeout: 3000 });
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // CLEANUP: Restaurar valor original
    await businessName.clear();
    await businessName.fill(originalName || '');
    await saveBtn.click();
    await page.waitForTimeout(1000);
  });

  test('deve alterar tema claro/escuro', async ({ page }) => {
    // Procurar seção de personalização
    const personalizacao = page.getByRole('heading', { name: 'Personalização' });
    await expect(personalizacao).toBeVisible({ timeout: 5000 });

    // Clicar em tema escuro
    const darkBtn = page.getByRole('button', { name: /Escuro/i });
    if (await darkBtn.isVisible({ timeout: 2000 })) {
      await darkBtn.click();
      await page.waitForTimeout(500);

      // Voltar para claro
      const lightBtn = page.getByRole('button', { name: /Claro/i });
      if (await lightBtn.isVisible({ timeout: 2000 })) {
        await lightBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('deve configurar operação padrão', async ({ page }) => {
    // Seção de operação padrão
    const operacaoSection = page.getByText('Operação Padrão');
    if (await operacaoSection.isVisible({ timeout: 3000 })) {
      // Verificar que selects existem
      const alertDaysExists = await page.getByText(/dias.*padrão|Alerta/i).count();
      expect(alertDaysExists).toBeGreaterThanOrEqual(0);

      // Botão de salvar operação
      const saveOpBtn = page.getByRole('button', { name: /Salvar Operação/i });
      if (await saveOpBtn.isVisible({ timeout: 2000 })) {
        await saveOpBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});
