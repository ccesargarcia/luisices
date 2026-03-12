import { chromium, FullConfig } from '@playwright/test';

// Global setup script executed once before any tests run.
// It performs a UI login and persists the authenticated storage state
// to avoid having every test repeat the slow login flow.
export default async function globalSetup(config: FullConfig) {
  const { baseURL } = config.use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // navigate to the app and sign in using the test credentials
  await page.goto(baseURL || 'http://localhost:4173');
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'teste@exemplo.com');
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'senha123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 60000 });

  // persist state to file that will be reused by each test run
  await page.context().storageState({ path: 'tests/e2e/storageState.json' });

  await browser.close();
}
