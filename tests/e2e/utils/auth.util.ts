import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });

export function getTestCredentials() {
  return {
    email: process.env.TEST_USER_EMAIL || 'teste@luisices.com.br',
    password: process.env.TEST_USER_PASSWORD || 'Senha123456!',
  };
}

const IDB_FILE = path.resolve(process.cwd(), 'playwright/.auth/firebaseIdb.json');

/**
 * Restaura IndexedDB salvo pelo auth.setup.ts antes do carregamento da página
 */
export async function restoreIndexedDB(page: Page) {
  if (!fs.existsSync(IDB_FILE)) return;

  try {
    const raw = fs.readFileSync(IDB_FILE, 'utf-8');
    const entries = JSON.parse(raw);
    if (!entries || !entries.length) return;

    await page.addInitScript((items) => {
      const req = indexedDB.open('firebaseLocalStorageDb', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
          db.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('firebaseLocalStorage', 'readwrite');
        const store = tx.objectStore('firebaseLocalStorage');
        items.forEach((item: any) => {
          try {
            store.put(item.value ?? item);
          } catch {}
        });
      };
    }, entries);
  } catch (err) {
    console.warn('[auth.util] Falha ao ler ou restaurar IndexedDB:', err);
  }
}

/**
 * Garante que a página está autenticada.
 * Se storageState/IndexedDB estiverem disponíveis, evita logins repetidos.
 * Caso contrário, executa o login pelo formulário como fallback seguro.
 */
export async function ensureAuthenticated(page: Page) {
  await restoreIndexedDB(page);

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
