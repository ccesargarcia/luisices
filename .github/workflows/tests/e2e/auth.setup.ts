import { test as setup } from '@playwright/test';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  const TEST_USER = {
    email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
    password: process.env.TEST_USER_PASSWORD || 'senha123',
  };
  
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  
  // Esperar até que a navegação para o dashboard ocorra
  await page.waitForURL('**/dashboard', { timeout: process.env.CI ? 30000 : 15000 });
  
  // Salvar estado da autenticação
  await page.context().storageState({ path: authFile });
});
