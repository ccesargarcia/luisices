import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, updateMetadata } from 'firebase/storage';

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
        gallery: { view: true, create: true, edit: true, delete: true },
        emails: { create: true, view: true },
      },
    });
  });
});

describe('Allowlist de MIME nas demais rotas de upload do Storage', () => {
  it('bloqueia tipos não permitidos em pastas de imagem do usuário e da loja', async () => {
    const ownerStorage = env.authenticatedContext('owner').storage();

    await assertFails(uploadBytes(
      ref(ownerStorage as any, 'users/owner/logo/logo.svg'),
      new TextEncoder().encode('<svg/>'),
      { contentType: 'image/svg+xml' },
    ));
    await assertFails(uploadBytes(
      ref(ownerStorage as any, 'users/owner/gallery/payload.svg'),
      new TextEncoder().encode('<svg/>'),
      { contentType: 'image/svg+xml' },
    ));
    await assertFails(uploadBytes(
      ref(ownerStorage as any, 'store/products/payload.svg'),
      new TextEncoder().encode('<svg/>'),
      { contentType: 'image/svg+xml', customMetadata: { userId: 'owner' } },
    ));
    await assertFails(uploadBytes(
      ref(ownerStorage as any, 'users/owner/logo/payload.bin'),
      new Uint8Array([0x4d, 0x5a, 1, 2]),
      { contentType: 'application/x-msdownload' },
    ));
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

describe('Autorização granular de criação e edição no Storage', () => {
  async function setOwnerPermissions(permissions: Record<string, unknown>) {
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc('userProfiles/owner').update({ permissions });
    });
  }

  it('permissão create permite novos arquivos, mas não sobrescrever anexos ou imagens existentes', async () => {
    await setOwnerPermissions({
      orders: { view: true, create: true, edit: false, delete: false },
      gallery: { view: true, create: true, edit: false, delete: false },
    });
    const ownerStorage = env.authenticatedContext('owner').storage();
    const suffix = `${Date.now()}-${Math.random()}`;
    const orderFile = ref(ownerStorage as any, `users/owner/orders/create-only-${suffix}/file.png`);
    const galleryFile = ref(ownerStorage as any, `users/owner/gallery/create-only-${suffix}.png`);

    await assertSucceeds(uploadBytes(orderFile, new Uint8Array([1]), { contentType: 'image/png' }));
    await assertFails(uploadBytes(orderFile, new Uint8Array([2]), { contentType: 'image/png' }));
    await assertSucceeds(uploadBytes(galleryFile, new Uint8Array([1]), { contentType: 'image/png' }));
    await assertFails(uploadBytes(galleryFile, new Uint8Array([2]), { contentType: 'image/png' }));
  });

  it('permissão edit permite editar metadados existentes, mas não enviar ou substituir conteúdo', async () => {
    await setOwnerPermissions({
      orders: { view: true, create: false, edit: true, delete: false },
      gallery: { view: true, create: false, edit: true, delete: false },
    });
    const suffix = `${Date.now()}-${Math.random()}`;
    const orderPath = `users/owner/orders/edit-only-${suffix}/file.png`;
    const galleryPath = `users/owner/gallery/edit-only-${suffix}.png`;
    await env.withSecurityRulesDisabled(async (context) => {
      const storage = context.storage();
      await uploadBytes(ref(storage as any, orderPath), new Uint8Array([1]), { contentType: 'image/png' });
      await uploadBytes(ref(storage as any, galleryPath), new Uint8Array([1]), { contentType: 'image/png' });
    });

    const ownerStorage = env.authenticatedContext('owner').storage();
    await assertSucceeds(updateMetadata(ref(ownerStorage as any, orderPath), { cacheControl: 'public,max-age=3600' }));
    await assertFails(uploadBytes(ref(ownerStorage as any, `users/owner/orders/new-edit-only-${suffix}/file.png`), new Uint8Array([1]), { contentType: 'image/png' }));
    await assertSucceeds(updateMetadata(ref(ownerStorage as any, galleryPath), { cacheControl: 'public,max-age=3600' }));
    await assertFails(uploadBytes(ref(ownerStorage as any, `users/owner/gallery/new-edit-only-${suffix}.png`), new Uint8Array([1]), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(ownerStorage as any, orderPath), new Uint8Array([2]), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(ownerStorage as any, galleryPath), new Uint8Array([2]), { contentType: 'image/png' }));
  });

  it('mantém edição de metadados para proprietário legado sem gallery.edit, mas nega edit=false explícito', async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const legacyPath = `users/owner/gallery/legacy-${suffix}.png`;
    const revokedPath = `users/owner/gallery/revoked-${suffix}.png`;
    await setOwnerPermissions({
      gallery: { view: true, create: true, delete: true },
    });
    await env.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage() as any, legacyPath), new Uint8Array([1]), { contentType: 'image/png' });
    });
    const ownerStorage = env.authenticatedContext('owner').storage();
    await assertSucceeds(updateMetadata(ref(ownerStorage as any, legacyPath), { cacheControl: 'public,max-age=3600' }));

    await setOwnerPermissions({
      gallery: { view: true, create: true, edit: false, delete: true },
    });
    await env.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage() as any, revokedPath), new Uint8Array([1]), { contentType: 'image/png' });
    });
    await assertFails(updateMetadata(ref(ownerStorage as any, revokedPath), { cacheControl: 'public,max-age=3600' }));
  });
});
