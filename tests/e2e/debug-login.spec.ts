import { test, expect } from '@playwright/test';

/**
 * Teste de DEBUG para identificar por que o login falha
 * 
 * Execute: npx playwright test tests/e2e/debug-login.spec.ts --headed
 */

const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'teste@exemplo.com',
  password: process.env.TEST_USER_PASSWORD || 'senha123',
};

test.describe('🐛 DEBUG - Identificar problema no login', () => {
  test('Ver erro completo do login', async ({ page }) => {
    console.log('\n🔍 INICIANDO DEBUG DO LOGIN\n');
    console.log('Email:', TEST_USER.email);
    console.log('Password:', TEST_USER.password ? '***configurada***' : '❌ NÃO CONFIGURADA');
    console.log('URL:', page.url());
    console.log('\n');

    // Capturar TODOS os console.log e console.error do browser
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        console.log(`❌ ERRO NO BROWSER: ${text}`);
      } else if (type === 'log' && text.includes('erro')) {
        console.log(`⚠️  LOG: ${text}`);
      }
    });

    // Capturar requisições ao Firebase
    page.on('response', response => {
      const url = response.url();
      if (url.includes('firebaseauth') || url.includes('firestore')) {
        console.log(`\n📡 Firebase Request: ${response.status()} ${url.substring(0, 80)}...`);
      }
    });

    await page.goto('/');
    console.log('✅ Página carregada:', page.url());
    
    await page.waitForTimeout(2000);

    // Preencher formulário
    console.log('\n📝 Preenchendo formulário...');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    console.log('✅ Formulário preenchido');

    // Clicar em submit
    console.log('\n🔘 Clicando em submit...');
    await page.click('button[type="submit"]');
    
    // Aguardar um pouco para ver o que acontece
    console.log('⏳ Aguardando 5 segundos para ver o que acontece...\n');
    await page.waitForTimeout(5000);

    // Capturar URL atual
    const currentUrl = page.url();
    console.log('📍 URL ATUAL:', currentUrl);

    // Se tem erro visível, capturar
    const errorAlert = await page.locator('[role="alert"]').textContent().catch(() => null);
    if (errorAlert) {
      console.log('🚨 ERRO NA TELA:', errorAlert);
    }

    // Verificar se foi para o dashboard
    if (currentUrl.includes('/dashboard') || currentUrl === 'http://localhost:4173/') {
      console.log('✅ REDIRECIONADO COM SUCESSO!');
      console.log('\nℹ️  Se redirecionou para /, mas deveria ir para /dashboard');
      console.log('   Isso significa que o login funcionou mas há problema no roteamento');
    } else if (currentUrl.includes('/login')) {
      console.log('❌ FICOU NA PÁGINA DE LOGIN - LOGIN FALHOU!');
      console.log('\nPossíveis causas:');
      console.log('1. Senha incorreta nas GitHub Secrets');
      console.log('2. Usuário inativo (active = false no Firestore)');
      console.log('3. Usuário não tem perfil no Firestore (só existe no Authentication)');
    }

    // Tirar screenshot
    await page.screenshot({ path: 'debug-login-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot salvo em: debug-login-screenshot.png');

    // Capturar HTML do alerta de erro se existir
    const errorHtml = await page.locator('[role="alert"]').innerHTML().catch(() => null);
    if (errorHtml) {
      console.log('\n📄 HTML do erro:');
      console.log(errorHtml);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('RESUMO DO DEBUG:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Email usado:', TEST_USER.email);
    console.log('URL final:', currentUrl);
    console.log('Tem erro visível?', errorAlert ? 'SIM' : 'NÃO');
    if (errorAlert) {
      console.log('Mensagem de erro:', errorAlert);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    // Não fazer expect, só debug
  });
});
