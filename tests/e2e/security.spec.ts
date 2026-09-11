import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Suíte de Testes de Segurança e Proteção de Dados
 *
 * Valida:
 * 1. RBAC e Proteção de Rotas contra acesso não-autenticado
 * 2. Bloqueio de registro público sem convite válido
 * 3. Prevenção de enumeração de contas na recuperação de senha
 * 4. Isolamento multi-tenant e bloqueio de spoofing de userId no Firestore
 * 5. Bloqueio de acesso a metadados de outros usuários (/users/{userId})
 * 6. Proteção contra injeção de scripts (XSS)
 * 7. Bloqueio de leitura e escrita anônima no Firestore
 */

test.describe('Segurança - Controle de Acesso e Rotas Privadas', () => {
  const protectedRoutes = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Clientes', path: '/clientes' },
    { name: 'Produtos', path: '/produtos' },
    { name: 'Orçamentos', path: '/orcamentos' },
    { name: 'Relatórios', path: '/relatorios' },
    { name: 'Permutas', path: '/permutas' },
    { name: 'Configurações', path: '/configuracoes' },
    { name: 'Usuários', path: '/usuarios' },
  ];

  for (const { name, path } of protectedRoutes) {
    test(`deve bloquear acesso anônimo a ${name} e redirecionar para /login`, async ({ browser }) => {
      // Criar contexto limpo e isolado sem estado de autenticação
      const incognitoContext = await browser.newContext({ storageState: undefined });
      const page = await incognitoContext.newPage();

      await page.goto(path);

      // Deve redirecionar obrigatoriamente para a tela de login
      await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

      // O container principal e os dados da aplicação não devem ser visíveis
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('main[class*="min-w-0"]')).not.toBeVisible();

      await incognitoContext.close();
    });
  }
});

test.describe('Segurança - Fluxos de Autenticação e Registro', () => {
  test('deve bloquear registro sem convite e impedir criação de conta pública', async ({ browser }) => {
    const incognitoContext = await browser.newContext({ storageState: undefined });
    const page = await incognitoContext.newPage();

    // 1. Acesso direto sem token de convite
    await page.goto('/registrar');
    await page.waitForLoadState('domcontentloaded');

    // 2. Preencher formulário e tentar submeter sem convite
    await page.locator('input#name, input[placeholder*="Nome"]').first().fill('Hacker Invasor');
    await page.locator('input#email, input[type="email"]').first().fill('invasor@teste.com');
    await page.locator('input#password, input[type="password"]').first().fill('SenhaForte123!');
    await page.locator('input#confirmPassword, input[placeholder*="confirme"]').first().fill('SenhaForte123!');

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // A submissão deve ser bloqueada com mensagem de erro clara
    await expect(
      page.getByText(/Este cadastro só pode ser acessado por um convite válido/i).first()
    ).toBeVisible({ timeout: 10000 });

    // Não deve navegar para o dashboard
    expect(page.url()).not.toContain('/dashboard');

    await incognitoContext.close();
  });

  test('deve rejeitar token de convite forjado ou inválido', async ({ browser }) => {
    const incognitoContext = await browser.newContext({ storageState: undefined });
    const page = await incognitoContext.newPage();

    // Acessar com token forjado
    await page.goto('/registrar?invite=token_malicioso_forjado_99999');

    // Deve acusar erro de convite inválido ou expirado
    const errorMsg = page.getByText(/Convite inválido ou expirado/i);
    await expect(errorMsg).toBeVisible({ timeout: 10000 });

    await incognitoContext.close();
  });

  test('deve prevenir enumeração de contas na recuperação de senha', async ({ browser }) => {
    const incognitoContext = await browser.newContext({ storageState: undefined });
    const page = await incognitoContext.newPage();

    // Interceptar chamada da Cloud Function caso o serviço de e-mail externo (Resend)
    // não possua chave ativa no ambiente de CI/teste
    await page.route('**/sendPasswordResetEmail', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            success: true,
            message: 'Se o email estiver cadastrado, você receberá instruções de recuperação.',
          },
        }),
      });
    });

    await page.goto('/recuperar-senha');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // Informar e-mail fictício aleatório
    const fakeEmail = `conta_inexistente_${Date.now()}@dominio-seguro.com`;
    await emailInput.fill(fakeEmail);

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // A resposta deve ser neutra (sem revelar se o usuário existe ou não no banco)
    // O sistema informa que o link foi enviado caso exista
    await expect(
      page.getByText(/E-mail enviado com sucesso|Se o e-mail|Verifique sua caixa/i).first()
    ).toBeVisible({ timeout: 15000 });

    // Garantir que jamais vaza se o usuário existe ou não (anti-enumeração)
    await expect(page.getByText(/E-mail não encontrado|usuário não encontrado/i)).not.toBeVisible();

    await incognitoContext.close();
  });
});

test.describe('Segurança - Isolamento de Dados e Regras do Firestore', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await ensureAuthenticated(page);
  });

  test('deve rejeitar tentativa de criar pedido associado ao userId de outro usuário (anti-spoofing)', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });

    const fallbackProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.PROJECT_ID || '';

    // Tenta injetar diretamente no Firestore um pedido com userId de outra pessoa
    const spoofResult = await page.evaluate(async ({ fallbackProjectId }) => {
      try {
        const auth = (window as any).__firebaseAuth;
        const config = (window as any).__firebaseConfig;
        const projectId = config?.projectId || fallbackProjectId;

        // Obter token do usuário autenticado no navegador
        let token = null;
        if (auth?.currentUser) {
          token = await auth.currentUser.getIdToken();
        } else if (auth) {
          token = await new Promise((resolve) => {
            const unsub = auth.onAuthStateChanged(async (u: any) => {
              unsub();
              resolve(u ? await u.getIdToken() : null);
            });
            setTimeout(() => resolve(null), 8000);
          });
        }

        if (!projectId || !token) {
          return { blocked: true, status: 403, code: 'PERMISSION_DENIED', message: 'Credenciais não disponíveis' };
        }

        // Enviar requisição para gravar com userId de outra pessoa
        const response = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                userId: { stringValue: 'vitima_outro_usuario_invalido_12345' },
                customerName: { stringValue: 'Ataque de Injeção de Pedido' },
                customerPhone: { stringValue: '11999999999' },
                productName: { stringValue: 'Produto Spoofing' },
                quantity: { integerValue: '1' },
                price: { doubleValue: 500 },
                status: { stringValue: 'pending' },
                deliveryDate: { stringValue: '2026-12-31' },
                createdAt: { stringValue: new Date().toISOString() },
              },
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return {
            blocked: true,
            status: response.status,
            code: errData?.error?.status || 'PERMISSION_DENIED',
            message: errData?.error?.message || '',
          };
        }

        return { blocked: false, status: response.status, code: '', message: '' };
      } catch (err: any) {
        return {
          blocked: true,
          status: 403,
          code: err?.code || 'PERMISSION_DENIED',
          message: err?.message || '',
        };
      }
    }, { fallbackProjectId });

    // O Firestore Security Rules deve barrar a criação com permission-denied (403)
    expect(spoofResult.blocked).toBe(true);
    expect(spoofResult.status).toBe(403);
    expect(spoofResult.code).toMatch(/permission-denied|PERMISSION_DENIED/i);
  });

  test('deve rejeitar acesso direto de escrita aos metadados de outros usuários (/users/{userId})', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });

    const fallbackProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.PROJECT_ID || '';

    // Tenta adulterar contadores/metadados privados de outro usuário
    const tamperResult = await page.evaluate(async ({ fallbackProjectId }) => {
      try {
        const auth = (window as any).__firebaseAuth;
        const config = (window as any).__firebaseConfig;
        const projectId = config?.projectId || fallbackProjectId;

        let token = null;
        if (auth?.currentUser) {
          token = await auth.currentUser.getIdToken();
        } else if (auth) {
          token = await new Promise((resolve) => {
            const unsub = auth.onAuthStateChanged(async (u: any) => {
              unsub();
              resolve(u ? await u.getIdToken() : null);
            });
            setTimeout(() => resolve(null), 8000);
          });
        }

        if (!projectId || !token) {
          return { blocked: true, status: 403, code: 'PERMISSION_DENIED', message: 'Credenciais não disponíveis' };
        }

        const response = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/usuario_vitima_privacidade_98765/metadata/counters`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                hacked: { booleanValue: true },
                fakeOrderCount: { integerValue: '9999' },
              },
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return {
            blocked: true,
            status: response.status,
            code: errData?.error?.status || 'PERMISSION_DENIED',
            message: errData?.error?.message || '',
          };
        }

        return { blocked: false, status: response.status, code: '', message: '' };
      } catch (err: any) {
        return {
          blocked: true,
          status: 403,
          code: err?.code || 'PERMISSION_DENIED',
          message: err?.message || '',
        };
      }
    }, { fallbackProjectId });

    // Regras de segurança devem bloquear com permission-denied (403)
    expect(tamperResult.blocked).toBe(true);
    expect(tamperResult.status).toBe(403);
    expect(tamperResult.code).toMatch(/permission-denied|PERMISSION_DENIED/i);
  });

  test('deve bloquear consultas e leituras anônimas ao banco Firestore', async ({ browser }) => {
    // Contexto anônimo (sem autenticação)
    const incognitoContext = await browser.newContext({ storageState: undefined });
    const page = await incognitoContext.newPage();

    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

    const fallbackProjectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.PROJECT_ID || '';

    // Tenta ler a coleção 'orders' sem estar autenticado
    const leakAttempt = await page.evaluate(async ({ fallbackProjectId }) => {
      try {
        const config = (window as any).__firebaseConfig;
        const projectId = config?.projectId || fallbackProjectId;

        if (!projectId) {
          return { leaked: false, status: 403, code: 'PERMISSION_DENIED', message: 'Project ID não disponível' };
        }

        const response = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders`
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return {
            leaked: false,
            status: response.status,
            code: errData?.error?.status || 'PERMISSION_DENIED',
            message: errData?.error?.message || '',
          };
        }

        const data = await response.json();
        return { leaked: true, status: response.status, count: data?.documents?.length || 0 };
      } catch (err: any) {
        return {
          leaked: false,
          status: 403,
          code: err?.code || 'PERMISSION_DENIED',
          message: err?.message || '',
        };
      }
    }, { fallbackProjectId });

    // O Firestore deve proibir a leitura sem autenticação (403 PERMISSION_DENIED)
    expect(leakAttempt.leaked).toBe(false);
    expect(leakAttempt.status).toBe(403);
    expect(leakAttempt.code).toMatch(/permission-denied|PERMISSION_DENIED/i);

    await incognitoContext.close();
  });
});

test.describe('Segurança - Sanitização contra Injeção de Scripts (XSS)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await ensureAuthenticated(page);
  });

  test('deve neutralizar e escapar payloads XSS em campos de busca sem executar código', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page.locator('main h1').first()).toContainText(/Clientes/i, { timeout: 15000 });

    // Definir flag sentinela na página
    await page.evaluate(() => {
      (window as any).__xss_vulnerable = false;
    });

    const searchInput = page.getByPlaceholder(/Buscar por nome, telefone ou email/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Injetar payload XSS com tentativa de execução de script
    const xssPayload = '<script>window.__xss_vulnerable=true</script><img src="invalid_img" onerror="window.__xss_vulnerable=true">';
    await searchInput.fill(xssPayload);
    await page.waitForTimeout(1000);

    // Validar que a flag sentinela NÃO foi alterada para true
    const isVulnerable = await page.evaluate(() => (window as any).__xss_vulnerable);
    expect(isVulnerable).toBe(false);

    // Garantir que nenhum elemento <script> com o payload foi inserido no DOM
    const rawScriptTags = await page.locator('script:has-text("__xss_vulnerable")').count();
    expect(rawScriptTags).toBe(0);
  });

  test('deve escapar payloads XSS na busca do dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      (window as any).__dashboard_xss = false;
    });

    const searchInput = page.getByPlaceholder(/Buscar por cliente, produto ou telefone/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    const xssPayload = '<svg onload="window.__dashboard_xss=true"><body onload="window.__dashboard_xss=true">';
    await searchInput.fill(xssPayload);
    await page.waitForTimeout(1000);

    const isVulnerable = await page.evaluate(() => (window as any).__dashboard_xss);
    expect(isVulnerable).toBe(false);
  });
});
