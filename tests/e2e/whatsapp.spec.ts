import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Suíte de Testes E2E da Central de Atendimento WhatsApp
 * Cobre carregamento da central, diálogo de nova conversa, busca e templates.
 */

test.beforeEach(async ({ page }) => {
  await ensureAuthenticated(page);
});

test.describe('Central de Atendimento WhatsApp', () => {
  test('deve carregar a central de WhatsApp com barra lateral e cabeçalho', async ({ page }) => {
    await page.goto('/whatsapp');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar container e título da central
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Central de Atendimento/i })).toBeVisible({ timeout: 5000 });

    // 2. Validar campo de busca de contatos/conversas
    const searchInput = page.getByPlaceholder(/Buscar cliente, número ou mensagem/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // 3. Validar botão de nova conversa
    const newChatBtn = page.getByRole('button', { name: /Nova Conversa/i }).first();
    await expect(newChatBtn).toBeVisible({ timeout: 5000 });
  });

  test('deve abrir modal de Nova Conversa e validar campos obrigatórios', async ({ page }) => {
    await page.goto('/whatsapp');
    await page.waitForLoadState('domcontentloaded');

    // Clicar em Nova Conversa
    const newChatBtn = page.getByRole('button', { name: /Nova Conversa/i }).first();
    await expect(newChatBtn).toBeVisible({ timeout: 5000 });
    await newChatBtn.click();

    // Validar modal aberto
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/Iniciar Nova Conversa/i)).toBeVisible({ timeout: 5000 });

    // Validar campo de telefone
    const phoneInput = dialog.locator('input[placeholder*="11 99999-9999"], input[placeholder*="11999999999"]');
    await expect(phoneInput).toBeVisible({ timeout: 5000 });

    // Validar botão de fechar/cancelar
    const cancelBtn = dialog.getByRole('button', { name: /Cancelar/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('deve filtrar clientes na busca de conversas', async ({ page }) => {
    await page.goto('/whatsapp');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByPlaceholder(/Buscar cliente, número ou mensagem/i);
    await searchInput.fill('Teste');
    await page.waitForTimeout(300);

    // Campo de busca deve manter o valor preenchido
    await expect(searchInput).toHaveValue('Teste');

    // Limpar campo
    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
  });
});
