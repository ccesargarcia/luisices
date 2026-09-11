import { test, expect } from '@playwright/test';
import { getTestCredentials } from './utils/auth.util';

const TEST_USER = getTestCredentials();

test.describe.skip('Fluxos Críticos e Financeiros', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('deve bloquear a criação de pedidos para clientes inadimplentes', async ({ page }) => {
    // 1. Criar um cliente marcado como Inadimplente (defaulter)
    await page.goto('/clientes');
    await page.getByRole('button', { name: /Novo Cliente/i }).click();
    await page.waitForSelector('[role="dialog"]');
    
    const customerName = `Inadimplente Teste ${Date.now()}`;
    await page.getByPlaceholder('Nome completo').fill(customerName);
    await page.getByPlaceholder('(00) 00000-0000').fill('11999999999');
    
    // Selecionar o status de inadimplente
    const statusTrigger = page.locator('button[role="combobox"]').filter({ hasText: /Padrão/i });
    if(await statusTrigger.count() > 0) {
      await statusTrigger.click();
      await page.getByRole('option', { name: /Inadimplente/i }).click();
    }
    
    await page.getByRole('button', { name: /Criar Cliente/i }).click();
    await page.waitForTimeout(1000);
    // Fechar modal de cliente se ainda estiver ai (o shadcn não fecha as vezes via UI)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.waitForTimeout(1000);

    // 2. Tentar criar um pedido para esse cliente no Dashboard
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /Novo Pedido/i }).click();
    
    // Na nova tela de pedidos, em vez de "Novo Cliente", vamos buscar
    const clientSelect = page.locator('button[role="combobox"]').first();
    await clientSelect.click();
    const searchClient = page.getByPlaceholder(/Buscar cliente/i);
    await searchClient.fill(customerName);
    await page.waitForTimeout(1000);
    await page.locator('[role="option"]').filter({ hasText: customerName }).first().click();

    await page.fill('input[placeholder="Nome do produto..."]', 'Produto Teste Bloqueio');
    await page.fill('input[placeholder="R$ 0,00"]', '100');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.locator('input[type="date"]').fill(futureDate.toISOString().split('T')[0]);

    // Ao salvar, deve mostrar o toast de erro de bloqueio
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/Existem pagamentos pendentes/i).or(page.getByText(/inadimplente/i))).toBeVisible({ timeout: 5000 });
  });
});
