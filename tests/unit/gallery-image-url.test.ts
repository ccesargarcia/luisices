import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getDownloadURL: vi.fn(), ref: vi.fn((_storage, path) => path) }));
vi.mock('firebase/storage', () => mocks);
vi.mock('../../src/lib/firebase', () => ({ storage: {} }));
import { resolveGalleryImageUrl } from '../../src/services/firebaseGalleryImageService';

beforeEach(() => { vi.clearAllMocks(); });
describe('Imagens privadas da galeria', () => {
  it('recupera imagem legada da CDN pelo SDK autenticado', async () => {
    mocks.getDownloadURL.mockResolvedValue('https://firebasestorage.googleapis.com/image?token=authorized');
    expect(await resolveGalleryImageUrl('https://cdn.luisices.com.br/users/owner/gallery/art.png'))
      .toBe('https://firebasestorage.googleapis.com/image?token=authorized');
    expect(mocks.ref).toHaveBeenCalledWith({}, 'users/owner/gallery/art.png');
  });
  it.each([
    'https://firebasestorage.googleapis.com/image?token=keep-this',
    'https://cdn.luisices.com.br/users/owner/products/art.png',
    'https://unrelated.example/users/owner/gallery/art.png',
  ])('preserva URL que não requer migração: %s', async url => {
    expect(await resolveGalleryImageUrl(url)).toBe(url);
    expect(mocks.getDownloadURL).not.toHaveBeenCalled();
  });
});
