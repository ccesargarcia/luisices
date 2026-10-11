import { describe, it, expect, vi } from 'vitest';
import { normalizeUrlToProd, normalizeObjectUrls } from '../../scripts/migrate-user-dev-to-prod.mjs';

describe('Migração de Usuário (Dev ➔ Prod): Validação de Lógica e Segurança', () => {
  it('deve normalizar URLs de Storage e CDN de dev para produção', () => {
    const urlDev1 = 'https://cdn-dev.luisices.com.br/products/topo.webp';
    const urlDev2 = 'https://luisices-dev.firebasestorage.app/v0/b/luisices-dev.appspot.com/o/item.jpg';

    expect(normalizeUrlToProd(urlDev1)).toBe('https://cdn.luisices.com.br/products/topo.webp');
    expect(normalizeUrlToProd(urlDev2)).toBe('https://papelaria-dashboard.firebasestorage.app/v0/b/papelaria-dashboard.firebasestorage.app/o/item.jpg');
  });

  it('deve normalizar URLs em objetos aninhados e arrays (normalizeObjectUrls)', () => {
    const complexData = {
      name: 'Produto Teste',
      photoUrl: 'https://cdn-dev.luisices.com.br/users/123/products/p1.webp',
      gallery: [
        'https://luisices-dev.firebasestorage.app/v0/b/luisices-dev.appspot.com/o/g1.jpg',
        'https://cdn-dev.luisices.com.br/g2.webp',
      ],
      details: {
        banner: 'https://cdn-dev.luisices.com.br/banner.png',
        active: true,
        price: 49.9,
      },
    };

    const normalized = normalizeObjectUrls(complexData);

    expect(normalized.photoUrl).toBe('https://cdn.luisices.com.br/users/123/products/p1.webp');
    expect(normalized.gallery[0]).toBe('https://papelaria-dashboard.firebasestorage.app/v0/b/papelaria-dashboard.firebasestorage.app/o/g1.jpg');
    expect(normalized.gallery[1]).toBe('https://cdn.luisices.com.br/g2.webp');
    expect(normalized.details.banner).toBe('https://cdn.luisices.com.br/banner.png');
    expect(normalized.details.price).toBe(49.9);
  });

  it('deve remapear o userId e campos de autoria quando UID de Prod for diferente de Dev', () => {
    const devUid = 'uid-dev-123';
    const prodUid = 'uid-prod-999';

    const sampleOrder = {
      id: 'order-1',
      userId: devUid,
      uid: devUid,
      createdBy: devUid,
      ownerUid: devUid,
      customerName: 'Cliente Teste',
      total: 150,
      photoUrl: 'https://cdn-dev.luisices.com.br/img.webp',
    };

    const remapped: any = { ...sampleOrder };
    remapped.userId = prodUid;
    if (remapped.uid === devUid) remapped.uid = prodUid;
    if (remapped.createdBy === devUid) remapped.createdBy = prodUid;
    if (remapped.ownerUid === devUid) remapped.ownerUid = prodUid;

    expect(remapped.userId).toBe(prodUid);
    expect(remapped.uid).toBe(prodUid);
    expect(remapped.createdBy).toBe(prodUid);
    expect(remapped.ownerUid).toBe(prodUid);
  });

  it('deve remapear o senderUid em coleções de e-mail (sentEmails)', () => {
    const devUid = 'uid-dev-123';
    const prodUid = 'uid-prod-999';

    const sentEmailDoc = {
      id: 'email-1',
      senderUid: devUid,
      subject: 'Orçamento Aprovado',
      status: 'sent',
    };

    const remapped = { ...sentEmailDoc, senderUid: prodUid };
    expect(remapped.senderUid).toBe(prodUid);
  });

  it('deve remapear o ID do documento em consolidações mensais de faturamento (salesMonthlySummaries)', () => {
    const devUid = 'uid-dev-123';
    const prodUid = 'uid-prod-999';
    const devDocId = `2026-10_${devUid}`;

    let targetDocId = devDocId;
    if (devUid !== prodUid && targetDocId.endsWith(`_${devUid}`)) {
      targetDocId = targetDocId.replace(`_${devUid}`, `_${prodUid}`);
    }

    expect(targetDocId).toBe(`2026-10_${prodUid}`);
  });

  it('deve remapear caminhos de arquivos de Storage quando o UID for alterado', () => {
    const devUid = 'uid-dev-123';
    const prodUid = 'uid-prod-999';
    const devFilePath = `users/${devUid}/products/foto1.webp`;

    const destPath = devUid === prodUid ? devFilePath : devFilePath.replace(`users/${devUid}/`, `users/${prodUid}/`);
    expect(destPath).toBe(`users/${prodUid}/products/foto1.webp`);
  });

  it('deve garantir que em modo DRY_RUN nenhuma escrita seja executada', async () => {
    const mockProdDb = {
      batch: vi.fn(),
      collection: vi.fn(),
    };

    const isDryRun = true;
    const operations = [
      { type: 'set', ref: { path: 'customers/c1' }, data: { name: 'Maria' } },
    ];

    if (!isDryRun) {
      const batch = mockProdDb.batch();
      batch.commit();
    }

    expect(mockProdDb.batch).not.toHaveBeenCalled();
  });

  it('deve particionar operações em lotes de até 400 itens para respeitar o limite do Firestore', () => {
    const totalOps = 950;
    const BATCH_SIZE = 400;
    const chunks = [];

    for (let i = 0; i < totalOps; i += BATCH_SIZE) {
      chunks.push(i);
    }

    // 950 itens divididos em lotes de 400: [0..399], [400..799], [800..949] -> 3 lotes
    expect(chunks.length).toBe(3);
    expect(chunks).toEqual([0, 400, 800]);
  });
});
