import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getTestCredentials } from './utils/auth.util';

const authFile = 'playwright/.auth/user.json';
const idbFile = 'playwright/.auth/firebaseIdb.json';

setup('authenticate', async ({ page }) => {
  setup.setTimeout(60000);
  const credentials = getTestCredentials();

  console.log(`[auth.setup] Iniciando autenticação com usuário: ${credentials.email}`);

  // Capturar logs de erro do navegador para facilitar diagnóstico no CI
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[browser error] ${msg.text()}`);
    }
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

  // Capturar tokens do IndexedDB (Firebase Auth) para persistência
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
      console.log(`[auth.setup] IndexedDB do Firebase capturado com sucesso (${idbData.length} entradas)`);
    }
  } catch (err) {
    console.warn('[auth.setup] Não foi possível extrair IndexedDB do Firebase:', err);
  }

  // Salvar cookies e localStorage
  await page.context().storageState({ path: authFile });
  console.log('[auth.setup] StorageState salvo em', authFile);
});
