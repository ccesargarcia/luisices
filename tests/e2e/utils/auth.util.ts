import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });

export function getTestCredentials() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error('Configure TEST_USER_EMAIL e TEST_USER_PASSWORD fora do repositório para executar os fluxos E2E autenticados.');
  }
  return { email, password };
}

const SESSION_FILE = path.resolve(process.cwd(), 'playwright/.auth/firebaseSession.json');

/**
 * Restaura a sessão do Firebase antes do carregamento da página
 */
export async function restoreFirebaseSession(page: Page) {
  if (!fs.existsSync(SESSION_FILE)) return;

  try {
    const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
    const entries = JSON.parse(raw);
    if (!entries || !entries.length) return;

    await page.addInitScript((items) => {
      for (const [key, value] of items as Array<[string, string]>) sessionStorage.setItem(key, value);
    }, entries);
  } catch (err) {
    console.warn('[auth.util] Falha ao ler ou restaurar sessão do Firebase:', err);
  }
}

/**
 * Garante que a página está autenticada.
 * Se a sessão temporária estiver disponível, evita logins repetidos.
 * Caso contrário, executa o login pelo formulário como fallback seguro.
 */
export async function ensureAuthenticated(page: Page) {
  // Se já estiver logado no dashboard com layout carregado, retornar imediatamente
  if (page.url().includes('/dashboard')) {
    const main = page.locator('main').first();
    if (await main.isVisible({ timeout: 1000 }).catch(() => false)) {
      return;
    }
  }

  await restoreFirebaseSession(page);

  await page.goto('/dashboard');

  // Se já estiver logado no dashboard, aguardar elemento principal e retornar
  const currentUrl = page.url();
  if (currentUrl.includes('/dashboard')) {
    try {
      const main = page.locator('main').first();
      await main.waitFor({ state: 'visible', timeout: 5000 });
      return;
    } catch {
      // Se não renderizou, continua para o fluxo normal de login
    }
  }

  // Fallback: Efetua login pelo formulário
  const creds = getTestCredentials();
  await page.goto('/');

  // Aguardar input de email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });

  await emailInput.fill(creds.email);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 10000 });
}
