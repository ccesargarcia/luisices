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

    // Deve exibir mensagem de alerta informando a exigência de convite
    const warningAlert = page.getByText(/Este cadastro só pode ser acessado por um convite válido/i);
    await expect(warningAlert).toBeVisible({ timeout: 10000 });

    // 2. Tentar submeter formulário sem convite
    await page.locator('input#name, input[placeholder*="Nome"]').first().fill('Hacker Invasor');
    await page.locator('input[type="email"]').first().fill('invasor@teste.com');
    await page.locator('input#password, input[type="password"]').first().fill('SenhaForte123!');
    await page.locator('input#confirmPassword, input[placeholder*="confirme"]').first().fill('SenhaForte123!');

    const submitBtn = page.getByRole('button', { name: /Criar conta|Registrar/i });
    await submitBtn.click();

    // A submissão deve ser bloqueada com mensagem de erro
    await expect(page.getByText(/Este cadastro só pode ser acessado por um convite válido/i)).toBeVisible();

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

    await page.goto('/recuperar-senha');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // Informar e-mail fictício aleatório
    const fakeEmail = `conta_inexistente_${Date.now()}@dominio-seguro.com`;
    await emailInput.fill(fakeEmail);

    const submitBtn = page.getByRole('button', { name: /Enviar link|Recuperar/i });
    await submitBtn.click();

    // A resposta deve ser neutra (sem revelar se o usuário existe ou não no banco)
    // O sistema informa que o link foi enviado caso exista
    await expect(
      page.getByText(/Se o email estiver cadastrado|Email enviado|Verifique sua caixa/i).first()
    ).toBeVisible({ timeout: 10000 });

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

    // Tenta injetar diretamente no Firestore um pedido com userId de outra pessoa
    const spoofResult = await page.evaluate(async () => {
      try {
        const { db } = await import('/src/lib/firebase');
        const { collection, addDoc } = await import('firebase/firestore');

        await addDoc(collection(db, 'orders'), {
          userId: 'vitima_outro_usuario_invalido_12345',
          customerName: 'Ataque de Injeção de Pedido',
          customerPhone: '11999999999',
          productName: 'Produto Spoofing',
          quantity: 1,
          price: 500,
          status: 'pending',
          deliveryDate: '2026-12-31',
          createdAt: new Date().toISOString(),
        });

        return { blocked: false, error: null };
      } catch (err: any) {
        return {
          blocked: true,
          code: err?.code || '',
          message: err?.message || '',
        };
      }
    });

    // O Firestore Security Rules deve barrar a criação com permission-denied
    expect(spoofResult.blocked).toBe(true);
    expect(spoofResult.code).toMatch(/permission-denied|PERMISSION_DENIED/i);
  });

  test('deve rejeitar acesso direto de escrita aos metadados de outros usuários (/users/{userId})', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });

    // Tenta adulterar contadores/metadados privados de outro usuário
    const tamperResult = await page.evaluate(async () => {
      try {
        const { db } = await import('/src/lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');

        const targetRef = doc(db, 'users', 'usuario_vitima_privacidade_98765', 'metadata', 'counters');
        await setDoc(targetRef, { hacked: true, fakeOrderCount: 9999 });

        return { blocked: false };
      } catch (err: any) {
        return {
          blocked: true,
          code: err?.code || '',
          message: err?.message || '',
        };
      }
    });

    // Regras de segurança devem bloquear com permission-denied
    expect(tamperResult.blocked).toBe(true);
    expect(tamperResult.code).toMatch(/permission-denied|PERMISSION_DENIED/i);
  });

  test('deve bloquear consultas e leituras anônimas ao banco Firestore', async ({ browser }) => {
    // Contexto anônimo (sem autenticação)
    const incognitoContext = await browser.newContext({ storageState: undefined });
    const page = await incognitoContext.newPage();

    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

    // Tenta ler a coleção 'orders' sem estar autenticado
    const leakAttempt = await page.evaluate(async () => {
      try {
        const { db } = await import('/src/lib/firebase');
        const { collection, getDocs } = await import('firebase/firestore');

        const snap = await getDocs(collection(db, 'orders'));
        return { leaked: true, count: snap.size };
      } catch (err: any) {
        return {
          leaked: false,
          code: err?.code || '',
          message: err?.message || '',
        };
      }
    });

    // O Firestore deve proibir a leitura sem autenticação
    expect(leakAttempt.leaked).toBe(false);
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
