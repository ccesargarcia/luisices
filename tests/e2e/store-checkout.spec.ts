import { test, expect } from '@playwright/test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'luisices-dev';
const PRODUCT_NAME = 'Produto E2E Checkout';
const CUSTOMER_NOTES = 'Evento de teste: entregar após as 14h';

test.describe('Checkout público ponta a ponta', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('envia o carrinho pela Cloud Function e persiste os dados oficiais no Firestore Emulator', async ({ page }) => {
    expect(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore Emulator deve estar ativo').toBeTruthy();

    const adminApp = initializeApp({ projectId: PROJECT_ID }, `checkout-e2e-${Date.now()}`);
    const adminDb = getFirestore(adminApp);

    // O checkout abre o WhatsApp fora do sistema; neutralizar apenas essa navegação externa.
    await page.addInitScript(() => {
      window.open = () => null;
    });

    try {
      await page.goto('/loja');
      await expect(page.locator('input[placeholder*="Buscar"]').first()).toBeVisible({ timeout: 15000 });

      const search = page.locator('input[placeholder*="Buscar"]').first();
      await search.fill(PRODUCT_NAME);

      const addToCart = page.getByRole('button', { name: 'Adicionar ao carrinho' });
      await expect(addToCart).toHaveCount(1, { timeout: 10000 });
      await addToCart.click();

      await expect(page.getByText('Sacola de Encomendas', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Aumentar quantidade' }).click();
      await page.getByPlaceholder(/Preciso receber até dia/i).fill(CUSTOMER_NOTES);
      await expect(page.getByText('Subtotal Estimado:').locator('..')).toContainText('R$ 74,50');

      await page.getByRole('button', { name: /Confirmar & Enviar Pedido no WhatsApp/i }).click();

      await expect(page.getByRole('heading', { name: 'Pedido Enviado com Sucesso!' })).toBeVisible({ timeout: 20000 });
      const orderCodeLabel = page.getByText(/Pedido #LJ-\d{4}/);
      await expect(orderCodeLabel).toBeVisible();
      const orderCode = (await orderCodeLabel.textContent())?.replace('Pedido #', '').trim();
      expect(orderCode).toMatch(/^LJ-\d{4}$/);

      const whatsappHref = await page.getByRole('link', { name: 'Reabrir WhatsApp' }).getAttribute('href');
      expect(whatsappHref).toMatch(/^https:\/\/wa\.me\/5511999999999\?text=/);
      const whatsappMessage = new URL(whatsappHref!).searchParams.get('text') || '';
      expect(whatsappMessage).toContain(orderCode);
      expect(whatsappMessage).toContain(PRODUCT_NAME);
      expect(whatsappMessage).toContain('R$ 74,50');
      expect(whatsappMessage).toContain(CUSTOMER_NOTES);

      const savedOrders = await adminDb.collection('catalogOrders').where('orderCode', '==', orderCode).get();
      expect(savedOrders.size).toBe(1);

      const savedOrder = savedOrders.docs[0].data();
      expect(savedOrder).toMatchObject({
        orderCode,
        totalItems: 2,
        subtotal: 74.5,
        officialSubtotal: 74.5,
        submittedSubtotal: 74.5,
        verifiedByServer: true,
        isPriceTampered: false,
        status: 'received',
        customerNotes: CUSTOMER_NOTES,
        items: [{
          productId: 'e2e-public-checkout',
          productName: PRODUCT_NAME,
          price: 37.25,
          quantity: 2,
          leadTimeDays: 3,
        }],
      });
      expect(savedOrder.idempotencyKey).toEqual(expect.any(String));
      expect(savedOrder.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      await deleteApp(adminApp);
    }
  });
});
