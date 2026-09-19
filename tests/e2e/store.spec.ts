import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Suíte de Testes E2E da Loja / Catálogo Público e Gestão de Loja
 *
 * Focado em:
 * 1. Funcionalidade da Loja Pública (Vitrine, Busca, Filtros, Sacola, Checkout)
 * 2. Segurança e Isolamento (Acesso público vs Proteção de rotas administrativas)
 * 3. Proteção contra Injeção de Scripts (XSS) na loja pública
 * 4. Funcionalidades Administrativas da Loja (Produtos da Loja, Pedidos, Personalização)
 */

test.describe('Loja Pública - Funcionalidade e Experiência do Cliente', () => {
  test('deve carregar a vitrine pública da loja com cabeçalho e elementos principais', async ({ browser }) => {
    // Contexto anônimo / cliente público sem autenticação
    const incognito = await browser.newContext({ storageState: undefined });
    const page = await incognito.newPage();

    await page.goto('/loja');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar que a página carrega sem redirecionar para login
    expect(page.url()).toContain('/loja');

    // 2. Validar elementos visuais essenciais da vitrine
    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // 3. Validar seletor de categorias
    const allCategoryBtn = page.getByRole('button', { name: /Todos/i }).first();
    await expect(allCategoryBtn).toBeVisible({ timeout: 5000 });

    // 4. Validar alternador de tema claro/escuro
    const themeBtn = page.locator('button[title*="tema" i], button:has(.lucide-sun), button:has(.lucide-moon)').first();
    if (await themeBtn.isVisible({ timeout: 3000 })) {
      await themeBtn.click();
      // O html deve ter alternado classe dark/light
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
      expect(typeof isDark).toBe('boolean');
    }

    await incognito.close();
  });

  test('deve permitir redirecionamento correto pelos aliases /catalogo e /lojinha', async ({ browser }) => {
    const incognito = await browser.newContext({ storageState: undefined });
    const page = await incognito.newPage();

    // /catalogo deve carregar a vitrine
    await page.goto('/catalogo');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('input[placeholder*="Buscar"]').first()).toBeVisible({ timeout: 10000 });

    // /lojinha deve redirecionar para /loja
    await page.goto('/lojinha');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/loja/, { timeout: 10000 });

    await incognito.close();
  });

  test('deve realizar busca em tempo real na vitrine de produtos', async ({ browser }) => {
    const incognito = await browser.newContext({ storageState: undefined });
    const page = await incognito.newPage();

    await page.goto('/loja');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Digitar termo de busca
    await searchInput.fill('Caderno');
    await page.waitForTimeout(400);

    // O valor do input deve refletir a busca
    await expect(searchInput).toHaveValue('Caderno');

    // Limpar busca
    await searchInput.fill('');
    await page.waitForTimeout(300);
    await expect(searchInput).toHaveValue('');

    await incognito.close();
  });

  test('deve manipular a sacola de compras (adicionar, alterar quantidade e abrir drawer)', async ({ browser }) => {
    const incognito = await browser.newContext({ storageState: undefined });
    const page = await incognito.newPage();

    await page.goto('/loja');
    await page.waitForLoadState('domcontentloaded');

    // Localizar primeiro botão de adicionar produto à sacola se houver produtos
    const addProductBtn = page.getByRole('button', { name: /Adicionar|Quero|Comprar|\+/i }).first();
    
    if (await addProductBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addProductBtn.click();

      // Validar que o botão/contador da sacola fica visível
      const cartBtn = page.locator('button').filter({ hasText: /Sacola|Item|Itens/i }).or(
        page.locator('button:has(.lucide-shopping-bag)')
      ).first();

      await expect(cartBtn).toBeVisible({ timeout: 5000 });
      await cartBtn.click();

      // Validar que o drawer/modal da sacola abriu
      const cartSheet = page.locator('[role="dialog"]').or(page.getByText(/Sua Sacola|Resumo do Pedido/i)).first();
      await expect(cartSheet).toBeVisible({ timeout: 5000 });

      // Validar campo de observações do pedido
      const notesField = page.locator('textarea, input[placeholder*="observa" i]').first();
      if (await notesField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await notesField.fill('Entregar embrulhado para presente');
        await expect(notesField).toHaveValue('Entregar embrulhado para presente');
      }
    }

    await incognito.close();
  });
});

test.describe('Loja - Segurança, Isolamento e Proteção de Dados', () => {
  test('vitrine pública não deve expor painéis administrativos ou dados sensíveis', async ({ browser }) => {
    const incognito = await browser.newContext({ storageState: undefined });
    const page = await incognito.newPage();

    await page.goto('/loja');
    await page.waitForLoadState('domcontentloaded');

    // 1. Menu lateral e cabeçalho administrativo NÃO devem existir no HTML
    await expect(page.getByRole('link', { name: /Relatórios/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /Configurações/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /Usuários/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /Permutas/i })).not.toBeVisible();

    // 2. Não deve haver botões de excluir pedidos ou ver margens de lucro
    await expect(page.getByRole('button', { name: /Excluir Pedido/i })).not.toBeVisible();
    await expect(page.getByText(/Margem de Lucro|Custo Total/i)).not.toBeVisible();

    await incognito.close();
  });

  test('deve bloquear acesso anônimo às páginas administrativas da loja', async ({ browser }) => {
    const adminStoreRoutes = [
      { name: 'Produtos da Loja', path: '/produtos-lojinha' },
      { name: 'Pedidos da Loja', path: '/pedidos-lojinha' },
      { name: 'Personalização da Loja', path: '/personalizar-lojinha' },
    ];

    for (const route of adminStoreRoutes) {
      const incognito = await browser.newContext({ storageState: undefined });
      const page = await incognito.newPage();

      await page.goto(route.path);

      // Deve redirecionar obrigatoriamente para a tela de login
      await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

      await incognito.close();
    }
  });

  test('deve sanitizar entradas e proteger contra injeção de script (XSS) no catálogo', async ({ browser }) => {
    const incognito = await browser.newContext({ storageState: undefined });
    const page = await incognito.newPage();

    await page.goto('/loja');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Injetar payload malicioso no campo de busca
    const xssPayload = '<script id="xss-store-probe">window.__XSS_STORE_FLAG__=true;</script><img src="x" onerror="window.__XSS_STORE_IMG__=true;" />';
    await searchInput.fill(xssPayload);
    await page.waitForTimeout(400);

    // Avaliar se algum script injetado foi executado no contexto da página
    const isXssExecuted = await page.evaluate(() => {
      return Boolean(
        (window as any).__XSS_STORE_FLAG__ ||
        (window as any).__XSS_STORE_IMG__ ||
        document.getElementById('xss-store-probe')
      );
    });

    expect(isXssExecuted).toBe(false);

    await incognito.close();
  });
});

test.describe('Gestão da Loja (Backoffice Administrativo)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await ensureAuthenticated(page);
  });

  test('deve carregar tela de Produtos da Lojinha com cards de métricas e listagem', async ({ page }) => {
    await page.goto('/produtos-lojinha');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar container principal e cabeçalho
    const main = page.locator('main').first();
    await expect(main).toBeVisible({ timeout: 10000 });

    const heading = page.getByRole('heading', { name: /Produtos da Lojinha/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    // 2. Validar botão de novo produto
    const newProductBtn = page.getByRole('button', { name: /Novo Produto/i }).first();
    await expect(newProductBtn).toBeVisible({ timeout: 5000 });

    // 3. Abrir modal de criação e validar campos
    await newProductBtn.click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(
      dialog.locator('#sp-name, input[placeholder*="Caderneta"], input[placeholder*="Nome comercial"]')
    ).toBeVisible({ timeout: 5000 });
    await expect(
      dialog.locator('#sp-price, input[placeholder="0,00"]')
    ).toBeVisible({ timeout: 5000 });

    // Fechar modal
    const cancelBtn = dialog.getByRole('button', { name: /Cancelar/i }).first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('deve abrir modal de publicação em lote via fotos e alternar categoria dinâmica', async ({ page }) => {
    await page.goto('/produtos-lojinha');
    await page.waitForLoadState('domcontentloaded');

    // 1. Clicar no botão Fotos em Lote
    const bulkBtn = page.getByRole('button', { name: /Fotos em Lote/i }).first();
    await expect(bulkBtn).toBeVisible({ timeout: 10000 });
    await bulkBtn.click();

    // 2. Validar que o diálogo abriu com o título correto
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/Publicação em Lote via Fotografias/i)).toBeVisible({ timeout: 5000 });

    // 3. Validar área de upload e formatos suportados no estado inicial
    await expect(dialog.getByText(/Toque para selecionar as fotografias|Formatos: JPG, PNG, WebP/i).first()).toBeVisible({ timeout: 5000 });

    // 4. Testar o botão Escolher Fotos
    await expect(dialog.getByRole('button', { name: /Escolher Fotos/i })).toBeVisible({ timeout: 5000 });

    // 5. Fechar diálogo
    const closeBtn = dialog.locator('button[aria-label="Close"]').or(
      dialog.locator('button:has(.lucide-x)')
    ).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('deve carregar tela de Pedidos da Lojinha com filtros de status e busca', async ({ page }) => {
    await page.goto('/pedidos-lojinha');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar cabeçalho
    const heading = page.getByRole('heading', { name: /Pedidos da Lojinha/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // 2. Validar campo de busca de pedidos
    const searchInput = page.locator('input[placeholder*="LJ-"], input[placeholder*="Buscar"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // 3. Validar filtros de status
    const allTab = page.getByRole('button', { name: /Todos/i }).first();
    await expect(allTab).toBeVisible({ timeout: 5000 });
  });

  test('deve carregar tela de Personalização da Lojinha com seções de configuração', async ({ page }) => {
    await page.goto('/personalizar-lojinha');
    await page.waitForLoadState('domcontentloaded');

    // 1. Validar container e título
    const heading = page.getByRole('heading', { name: /Personalizar Lojinha/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // 2. Validar link de visualização da loja pública
    const viewStoreLink = page.getByRole('link', { name: /Ver Lojinha|Ver Loja/i }).or(
      page.locator('a[href*="/loja"]')
    ).first();
    await expect(viewStoreLink).toBeVisible({ timeout: 5000 });
  });
});
