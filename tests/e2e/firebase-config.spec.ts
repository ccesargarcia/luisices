import { test, expect } from '@playwright/test';

test.describe('🔥 Firebase Configuration', () => {
  test('Verificar configuração do Firebase no build', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Capturar erros de console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    // Capturar erros não tratados
    page.on('pageerror', error => {
      errors.push(`PageError: ${error.message}`);
    });

    await page.goto('/');
    
    // Dar tempo para o app inicializar
    await page.waitForTimeout(3000);

    // Injetar script para verificar Firebase config
    const firebaseConfig = await page.evaluate(() => {
      // @ts-ignore - Acessar variáveis globais do Vite
      return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
      };
    });

    console.log('\n🔍 Firebase Config Detection:');
    console.log(JSON.stringify({
      apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : '❌ VAZIO',
      authDomain: firebaseConfig.authDomain || '❌ VAZIO',
      projectId: firebaseConfig.projectId || '❌ VAZIO',
      storageBucket: firebaseConfig.storageBucket || '❌ VAZIO',
      messagingSenderId: firebaseConfig.messagingSenderId || '❌ VAZIO',
      appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 15)}...` : '❌ VAZIO',
      measurementId: firebaseConfig.measurementId || '❌ VAZIO',
    }, null, 2));

    if (errors.length > 0) {
      console.log('\n❌ Console Errors:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️ Console Warnings:');
      warnings.forEach(warn => console.log(`  - ${warn}`));
    }

    // Verificações
    expect(firebaseConfig.apiKey, 'VITE_FIREBASE_API_KEY deve estar definido').toBeTruthy();
    expect(firebaseConfig.authDomain, 'VITE_FIREBASE_AUTH_DOMAIN deve estar definido').toBeTruthy();
    expect(firebaseConfig.projectId, 'VITE_FIREBASE_PROJECT_ID deve estar definido').toBeTruthy();
    expect(firebaseConfig.projectId, 'Deve ser o projeto DEV').toBe('luisices-dev');
    
    // Não deve haver erros críticos do Firebase
    const firebaseErrors = errors.filter(err => 
      err.toLowerCase().includes('firebase') || 
      err.toLowerCase().includes('apikey') ||
      err.toLowerCase().includes('auth')
    );
    
    if (firebaseErrors.length > 0) {
      console.log('\n🔥 Firebase-related errors found:');
      firebaseErrors.forEach(err => console.log(`  - ${err}`));
    }
    
    expect(firebaseErrors.length, 'Não deve haver erros do Firebase').toBe(0);
  });

  test('Tentar login e capturar erro específico', async ({ page }) => {
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
