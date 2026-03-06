import { test, expect } from '@playwright/test';

test.describe('🔥 Firebase Configuration', () => {
  test('Login funciona e Firebase conecta corretamente', async ({ page }) => {
    const networkRequests: any[] = [];
    const errors: string[] = [];

    // Monitorar requests de rede
    page.on('request', request => {
      if (request.url().includes('firebase') || request.url().includes('googleapis')) {
        networkRequests.push({
          method: request.method(),
          url: request.url(),
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('firebase') || response.url().includes('googleapis')) {
        const status = response.status();
        const url = response.url();
        
        if (status >= 400) {
          let body = '';
          try {
            body = await response.text();
          } catch {
            body = 'Could not read response body';
          }
          
          errors.push(`HTTP ${status} on ${url}: ${body.substring(0, 200)}`);
        }
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console: ${msg.text()}`);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Preencher credenciais
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    console.log(`\n🔐 Tentando login com: ${email}`);

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Aguardar um pouco para capturar requests
    await page.waitForTimeout(5000);

    console.log(`\n📡 Firebase Network Requests (${networkRequests.length}):`);
    networkRequests.forEach(req => {
      console.log(`  ${req.method} ${req.url.substring(0, 100)}...`);
    });

    if (errors.length > 0) {
      console.log(`\n❌ Errors Captured (${errors.length}):`);
      errors.forEach(err => console.log(`  - ${err}`));
    }

    // Verificar se houve algum request ao Firebase
    expect(networkRequests.length, 'Deve haver requests ao Firebase durante login').toBeGreaterThan(0);
    
    // Verificar se não houve erro HTTP
    const httpErrors = errors.filter(e => e.startsWith('HTTP'));
    if (httpErrors.length > 0) {
      console.log('\n🔴 Falha de autenticação HTTP detectada!');
      expect(httpErrors).toEqual([]);
    }
  });
});
