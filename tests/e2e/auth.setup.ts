import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getTestCredentials } from './utils/auth.util';

const authFile = 'playwright/.auth/user.json';
const sessionFile = 'playwright/.auth/firebaseSession.json';

setup('authenticate', async ({ page }) => {
  setup.setTimeout(60000);
  const staleIdbFile = 'playwright/.auth/firebaseIdb.json';
  if (fs.existsSync(staleIdbFile)) fs.unlinkSync(staleIdbFile);
  const credentials = getTestCredentials();

  console.log(`[auth.setup] Iniciando autenticação com usuário: ${credentials.email}`);

  // Capturar logs de erro do navegador para facilitar diagnóstico no CI
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[browser error] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    console.log(`[browser pageerror] ${err.message}`);
  });

  await page.goto('/');

  // Aguardar input de email ficar visível
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });

  // Preencher formulário de login
  await emailInput.fill(credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');

  // Aguardar redirecionamento para o dashboard com diagnóstico de erro
  try {
    await page.waitForURL('**/dashboard', { timeout: 25000 });
  } catch (err) {
    const errorToast = await page
      .locator('[role="alert"]')
      .or(page.locator('.sonner'))
      .or(page.getByText(/erro|incorret|inválid|falha/i))
      .first()
      .textContent()
      .catch(() => null);

    if (errorToast) {
      throw new Error(
        `[auth.setup] Falha no login para ${credentials.email}: "${errorToast.trim()}". Verifique se as credenciais configuradas no GitHub Secrets são válidas.`
      );
    }
    throw new Error(
      `[auth.setup] Timeout ao aguardar /dashboard com usuário ${credentials.email}. URL atual: ${page.url()}`
    );
  }

  await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
  console.log('[auth.setup] Login efetuado com sucesso no dashboard');

  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Capturar a sessão temporária do Firebase Auth para restaurá-la nos contextos E2E.
  try {
    const sessionData = await page.evaluate(() => Object.entries(sessionStorage));
    if (sessionData.length > 0) {
      fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
      console.log(`[auth.setup] Sessão da aba do Firebase capturada (${sessionData.length} entradas)`);
    }
  } catch (err) {
    console.warn('[auth.setup] Não foi possível capturar a sessão do Firebase:', err);
  }

  // Salvar cookies e localStorage
  await page.context().storageState({ path: authFile });
  console.log('[auth.setup] StorageState salvo em', authFile);
});
