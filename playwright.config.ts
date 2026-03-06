import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do .env.test
dotenv.config({ path: '.env.test' });

/**
 * Configuração de Testes E2E com Playwright
 * 
 * Testes automatizados que simulam interações reais do usuário
 * para garantir que as funcionalidades críticas estão funcionando.
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Timeout máximo por teste */
  timeout: 30 * 1000,
  
  /* Configuração de expectativas */
  expect: {
    timeout: 5000
  },
  
  /* Rodar testes em paralelo */
  fullyParallel: true,
  
  /* Falhar o build se algum teste deixou .only */
  forbidOnly: !!process.env.CI,
  
  /* Retry em CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Workers - número de testes paralelos */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter */
  reporter: [
    ['html'],
    ['list']
  ],
  
  /* Configuração compartilhada */
  use: {
    /* URL base para testes */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    
    /* Trace on primeira falha */
    trace: 'on-first-retry',
    
    /* Screenshot em falha */
    screenshot: 'only-on-failure',
    
    /* Video em falha */
    video: 'retain-on-failure',
  },

  /* Configurar projetos para diferentes navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Descomente para testar em outros navegadores
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Mobile viewports (opcional) */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  /* Rodar servidor dev antes dos testes (opcional) */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});
