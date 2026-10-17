import { describe, expect, it, vi } from 'vitest';
import { canReadGalleryItem, createGalleryMediaHandler, getGalleryStoragePath } from '../../functions/media/galleryCore.js';

function responseMock() {
  const headers: Record<string, string> = {};
  const res: any = {
    headers,
    headersSent: false,
    setHeader: (key: string, value: string) => { headers[key] = value; },
    status: vi.fn(function (this: any, code: number) { this.code = code; return this; }),
    send: vi.fn(function (this: any, body: string) { this.body = body; return this; }),
  };
  return res;
}

describe('endpoint de mídia privada da galeria', () => {
  it('aceita apenas caminhos pertencentes ao usuário e sem traversal', () => {
    expect(getGalleryStoragePath({ userId: 'u1', imageUrl: 'users/u1/gallery/a.webp' })).toBe('users/u1/gallery/a.webp');
    expect(getGalleryStoragePath({ userId: 'u1', imageUrl: 'users/u2/gallery/a.webp' })).toBeNull();
    expect(getGalleryStoragePath({ userId: 'u1', imageUrl: 'users/u1/gallery/../secret' })).toBeNull();
    expect(getGalleryStoragePath({ userId: 'u1', imageUrl: 'https://evil.test/a.webp' })).toBeNull();
  });

  it('aplica a permissão gallery.view a funcionários e bloqueia perfis inativos', () => {
    expect(canReadGalleryItem('staff', { role: 'funcionario', active: true, permissions: { gallery: { view: true } } }, { userId: 'owner' })).toBe(true);
    expect(canReadGalleryItem('staff', { role: 'funcionario', active: true, permissions: {} }, { userId: 'owner' })).toBe(false);
    expect(canReadGalleryItem('owner', { active: false }, { userId: 'owner' })).toBe(false);
  });

  it('nega acesso sem bearer token antes de consultar os dados', async () => {
    const firestore = { collection: vi.fn() };
    const handler = createGalleryMediaHandler({ auth: {}, firestore, storage: {} });
    const res = responseMock();
    await handler({ method: 'GET', headers: {}, query: { itemId: 'image-1' } } as any, res);
    expect(res.code).toBe(401);
    expect(firestore.collection).not.toHaveBeenCalled();
    expect(res.headers['Cache-Control']).toBe('private, no-store');
  });

  it('transmite imagem com cache privado e rejeita path que não corresponde ao item', async () => {
    const item = { userId: 'u1', imageUrl: 'users/u1/gallery/a.webp' };
    const firestore = { collection: (name: string) => ({ doc: (id: string) => ({ get: async () => ({ exists: true, data: () => name === 'userProfiles' ? { active: true, permissions: { gallery: { view: true } } } : item }) }) }) };
    const pipe = vi.fn();
    const file = { getMetadata: async () => [{ contentType: 'image/webp', size: 12 }], createReadStream: () => ({ on: () => ({ pipe }) }) };
    const storageFile = vi.fn(() => file);
    const storage = { bucket: () => ({ file: storageFile }) };
    const auth = { verifyIdToken: vi.fn(async () => ({ uid: 'u1', auth_time: 10 })) };
    const handler = createGalleryMediaHandler({ auth, firestore, storage });
    const req = { method: 'GET', headers: { authorization: 'Bearer valid' }, query: { itemId: 'item-1', path: 'users/u1/gallery/other.webp' } };
    const res = responseMock();
    await handler(req as any, res);
    expect(res.code).toBe(404);
    expect(storageFile).not.toHaveBeenCalled();

    req.query.path = item.imageUrl;
    await handler(req as any, res);
    expect(res.headers['Content-Type']).toBe('image/webp');
    expect(res.headers['Cache-Control']).toBe('private, no-store');
    expect(storageFile).toHaveBeenCalledWith(item.imageUrl);
    expect(pipe).toHaveBeenCalledWith(res);
  });
});
