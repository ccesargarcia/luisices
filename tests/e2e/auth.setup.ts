import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getTestCredentials } from './utils/auth.util';

const authFile = 'playwright/.auth/user.json';
const idbFile = 'playwright/.auth/firebaseIdb.json';

setup('authenticate', async ({ page }) => {
  setup.setTimeout(60000);
  const credentials = getTestCredentials();

  await page.goto('/');

  // Preencher formulário de login
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');

  // Aguardar redirecionamento para o dashboard
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });

  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Tentar capturar tokens do IndexedDB (Firebase Auth) para persistência perfeita
  try {
    const idbData = await page.evaluate(async () => {
      return new Promise<Array<{ key: IDBValidKey; value: any }>>((resolve) => {
        const req = indexedDB.open('firebaseLocalStorageDb');
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction('firebaseLocalStorage', 'readonly');
          const store = tx.objectStore('firebaseLocalStorage');
          const getAllReq = store.getAll();
          const getAllKeysReq = store.getAllKeys();

          tx.oncomplete = () => {
            const keys = getAllKeysReq.result;
            const values = getAllReq.result;
            const entries = keys.map((k, i) => ({ key: k, value: values[i] }));
            db.close();
            resolve(entries);
          };
          tx.onerror = () => {
            db.close();
            resolve([]);
          };
        };
        req.onerror = () => resolve([]);
      });
    });

    if (idbData && idbData.length > 0) {
      fs.writeFileSync(idbFile, JSON.stringify(idbData, null, 2));
    }
  } catch (err) {
    console.warn('[Setup] Não foi possível extrair IndexedDB do Firebase:', err);
  }

  // Salvar cookies e localStorage
  await page.context().storageState({ path: authFile });
});
