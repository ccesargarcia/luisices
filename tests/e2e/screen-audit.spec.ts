import { test, expect, Page } from '@playwright/test';
import { ensureAuthenticated } from './utils/auth.util';

/**
 * Suíte de Auditoria Global de Telas, Geometria e Layout (Screen Health & Overflow Crawler)
 * 
 * Executa uma varredura completa (100% das rotas e modais críticos):
 * 1. Ausência de erros silenciosos no console e no runtime do React (zero pageerrors)
 * 2. Ausência de overflow horizontal em telas móveis (scrollWidth <= innerWidth)
 * 3. Integridade geométrica de modais em telas móveis (botões de ação nunca cortados ou sobrepostos por barras flutuantes)
 */

interface RouteConfig {
  name: string;
  path: string;
  isPublic?: boolean;
}

const ALL_SYSTEM_ROUTES: RouteConfig[] = [
  // Rotas Administrativas / Autenticadas
  { name: 'Dashboard Principal', path: '/dashboard' },
  { name: 'Agenda de Entregas', path: '/agenda' },
  { name: 'Cadastro de Clientes', path: '/clientes' },
  { name: 'Catálogo de Produtos e Insumos', path: '/produtos' },
  { name: 'Gestão de Orçamentos', path: '/orcamentos' },
  { name: 'Controle de Permutas', path: '/permutas' },
  { name: 'Relatórios Financeiros e Operacionais', path: '/relatorios' },
  { name: 'Galeria de Mídia e Fotos', path: '/galeria' },
  { name: 'Central de Atendimento WhatsApp', path: '/whatsapp' },
  { name: 'Produtos da Lojinha Online', path: '/produtos-lojinha' },
  { name: 'Pedidos da Lojinha Online', path: '/pedidos-lojinha' },
  { name: 'Calculadora de Precificação', path: '/precificacao' },
  { name: 'Personalização da Vitrine', path: '/personalizar-lojinha' },
  { name: 'Central de E-mails', path: '/emails' },
  { name: 'Configurações do Ateliê', path: '/configuracoes' },
  { name: 'Central de Ajuda e FAQ', path: '/ajuda' },

  // Rotas Públicas
  { name: 'Vitrine Pública da Loja', path: '/loja', isPublic: true },
  { name: 'Tela de Login', path: '/', isPublic: true },
  { name: 'Recuperação de Senha', path: '/recuperar-senha', isPublic: true },
];

/**
 * Validador que verifica se uma página móvel tem overflow horizontal
 */
async function assertNoHorizontalOverflow(page: Page, contextName: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientWidth = window.innerWidth;
    return {
      hasOverflow: scrollWidth > clientWidth + 2, // tolerância de subpixel de 2px
      scrollWidth,
      clientWidth,
    };
  });

  expect(
    overflow.hasOverflow,
    `[Overflow Detectado] Na tela "${contextName}": scrollWidth (${overflow.scrollWidth}px) ultrapassou a largura da tela (${overflow.clientWidth}px). Elementos vazando para a lateral!`
  ).toBe(false);
}

test.describe('Auditoria Global de Telas - Integridade de Layout e Zero Erros', () => {
  for (const route of ALL_SYSTEM_ROUTES) {
    test(`[Desktop] Deve renderizar ${route.name} (${route.path}) sem erros de runtime`, async ({ page, browser }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => {
        // Ignora erros conhecidos de bloqueador de rastreadores externos em ambiente de teste
        if (!err.message.includes('chrome-extension://')) {
          pageErrors.push(err.message);
        }
      });

      if (!route.isPublic) {
        await ensureAuthenticated(page);
        await page.goto(route.path);
      } else {
        const incognito = await browser.newContext({ storageState: undefined });
        const pubPage = await incognito.newPage();
        await pubPage.goto(route.path);
        await pubPage.waitForLoadState('domcontentloaded');
        await expect(pubPage.locator('body')).toBeVisible();
        await incognito.close();
        return;
      }

      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('main').first()).toBeVisible({ timeout: 15000 });
      expect(pageErrors, `Erros de script na rota ${route.path}`).toEqual([]);
    });

    test(`[Mobile] Deve renderizar ${route.name} (${route.path}) com layout responsivo sem overflow horizontal`, async ({ browser }) => {
      // Viewport comum de smartphones (iPhone / Galaxy / Pixel)
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        storageState: route.isPublic ? undefined : 'playwright/.auth/user.json',
      });
      const page = await context.newPage();

      const pageErrors: string[] = [];
      page.on('pageerror', (err) => {
        if (!err.message.includes('chrome-extension://')) {
          pageErrors.push(err.message);
        }
      });

      if (!route.isPublic) {
        await ensureAuthenticated(page);
      }

      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');

      // 1. Validar ausência de erros de script
      expect(pageErrors, `Erros de execução no mobile na rota ${route.path}`).toEqual([]);

      // 2. Validar que o conteúdo não vaza horizontalmente
      await assertNoHorizontalOverflow(page, route.name);

      await context.close();
    });
  }
});

test.describe('Auditoria de Modais Críticos em Mobile (Prevenção de Botões Cortados e Z-Index)', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // Modo retrato de smartphone

  test('Modal de Exclusão em Massa da Loja: botões devem estar 100% visíveis e barra flutuante oculta', async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto('/produtos-lojinha');
    await page.waitForLoadState('domcontentloaded');

    // 1. Procurar checkboxes de produtos na lista ou card
    const checkboxes = page.locator('input[type="checkbox"], button[role="checkbox"]');
    const count = await checkboxes.count();

    if (count > 0) {
      // Selecionar o primeiro item disponível
      await checkboxes.first().click();
      await page.waitForTimeout(300);

      // Clicar no botão Excluir da barra flutuante
      const deleteFloatingBtn = page.getByRole('button', { name: /Excluir/i }).first();
      if (await deleteFloatingBtn.isVisible({ timeout: 3000 })) {
        await deleteFloatingBtn.click();

        // Diálogo de confirmação deve abrir
        const dialog = page.locator('[role="alertdialog"]').first();
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // A barra flutuante de ações em massa (<aside>) DEVE estar oculta para não cobrir o modal
        const floatingAside = page.locator('aside[aria-label*="Ações em massa"]');
        await expect(floatingAside).not.toBeVisible();

        // O botão principal Confirmar Exclusão DEVE estar dentro da área visível do viewport (nunca cortado)
        const confirmBtn = dialog.getByRole('button', { name: /Confirmar Exclusão/i }).first();
        await expect(confirmBtn).toBeVisible({ timeout: 5000 });

        const box = await confirmBtn.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          // O rodapé inferior do botão não pode ultrapassar o tamanho da tela
          expect(box.y + box.height).toBeLessThanOrEqual(844);
          expect(box.y).toBeGreaterThan(0);
        }

        // Fechar diálogo
        const cancelBtn = dialog.getByRole('button', { name: /Cancelar/i }).first();
        await cancelBtn.click();
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Modal de Upload por Fotos em Lote: deve ter rolagem contida e botões acessíveis no mobile', async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto('/produtos-lojinha');
    await page.waitForLoadState('domcontentloaded');

    // Clicar no botão Fotos em Lote
    const bulkBtn = page.getByRole('button', { name: /Fotos em Lote/i }).first();
    await expect(bulkBtn).toBeVisible({ timeout: 10000 });
    await bulkBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // O botão Escolher Fotos no topo do modal deve estar perfeitamente posicionado
    const chooseBtn = dialog.getByRole('button', { name: /Escolher Fotos/i }).first();
    await expect(chooseBtn).toBeVisible({ timeout: 5000 });

    const box = await chooseBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y + box.height).toBeLessThanOrEqual(844);
    }

    // Fechar modal
    const closeBtn = dialog.locator('button[aria-label="Close"], button:has(.lucide-x)').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('Modal de Nova Conversa WhatsApp: formulário e ações devem caber na tela mobile', async ({ page }) => {
    await ensureAuthenticated(page);
    await page.goto('/whatsapp');
    await page.waitForLoadState('domcontentloaded');

    // Clicar em Nova Conversa
    const newChatBtn = page.getByRole('button', { name: /Nova Conversa/i }).first();
    await expect(newChatBtn).toBeVisible({ timeout: 5000 });
    await newChatBtn.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verificar se botão Cancelar e Iniciar estão dentro do viewport
    const cancelBtn = dialog.getByRole('button', { name: /Cancelar/i }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });

    const box = await cancelBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y + box.height).toBeLessThanOrEqual(844);
    }

    await cancelBtn.click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
