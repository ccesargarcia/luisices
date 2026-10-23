import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { ref, uploadBytes } from 'firebase/storage';

let env: RulesTestEnvironment;

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error('Execute via npm run test:integration para usar os emuladores.');
  }
  env = await initializeTestEnvironment({
    projectId: 'demo-luisices-review',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

afterAll(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc('userProfiles/owner').set({
      role: 'user',
      active: true,
      permissions: {
        orders: { create: true, edit: true, view: true, delete: true },
        emails: { create: true, view: true },
      },
    });
  });
});

describe('Hardening de Storage: validação de contentType em anexos de pedidos', () => {
  it('permite upload de imagens seguras (JPEG, PNG, WebP) e PDFs em pedidos', async () => {
    const ownerStorage = env.authenticatedContext('owner').storage();

    // JPEG
    await assertSucceeds(uploadBytes(
      ref(ownerStorage as any, 'users/owner/orders/order-123/foto.jpg'),
      new Uint8Array([1, 2, 3]),
      { contentType: 'image/jpeg' },
    ));

    // PNG
    await assertSucceeds(uploadBytes(
      ref(ownerStorage as any, 'users/owner/orders/order-123/foto.png'),
      new Uint8Array([1, 2, 3]),
      { contentType: 'image/png' },
    ));

    // WebP (otimizado pelo sistema)
    await assertSucceeds(uploadBytes(
      ref(ownerStorage as any, 'users/owner/orders/order-123/foto.webp'),
      new Uint8Array([1, 2, 3]),
      { contentType: 'image/webp' },
    ));

    // PDF
    await assertSucceeds(uploadBytes(
      ref(ownerStorage as any, 'users/owner/orders/order-123/documento.pdf'),
      new Uint8Array([1, 2, 3]),
      { contentType: 'application/pdf' },
    ));
  });

  it('bloqueia upload de HTML, SVG e executáveis como anexo de pedido', async () => {
    const ownerStorage = env.authenticatedContext('owner').storage();

    // 1. Bloqueia HTML (Stored XSS)
    await assertFails(uploadBytes(
      ref(ownerStorage as any, 'users/owner/orders/order-123/payload.html'),
      new TextEncoder().encode('<script>alert("xss")</script>'),
      { contentType: 'text/html' },
    ));

    // 2. Bloqueia SVG (vetor comum de script XSS)
    await assertFails(uploadBytes(
      ref(ownerStorage as any, 'users/owner/orders/order-123/image.svg'),
      new TextEncoder().encode('<svg onload="alert(1)"></svg>'),
      { contentType: 'image/svg+xml' },
    ));

    // 3. Bloqueia scripts e executáveis
    await assertFails(uploadBytes(
      ref(ownerStorage as any, 'users/owner/orders/order-123/backdoor.sh'),
      new TextEncoder().encode('#!/bin/bash\necho hacked'),
      { contentType: 'application/x-sh' },
    ));

    // 4. Bloqueia executáveis e HTML em rascunhos de e-mail (email_draft)
    await assertFails(uploadBytes(
      ref(ownerStorage as any, 'users/owner/orders/email_draft/malicious.exe'),
      new Uint8Array([0x4d, 0x5a, 1, 2]),
      { contentType: 'application/x-msdownload' },
    ));

    // 5. Permite PDF e imagens em rascunhos de e-mail (email_draft)
    await assertSucceeds(uploadBytes(
      ref(ownerStorage as any, 'users/owner/orders/email_draft/anexo.pdf'),
      new Uint8Array([1, 2, 3]),
      { contentType: 'application/pdf' },
    ));
  });
});
