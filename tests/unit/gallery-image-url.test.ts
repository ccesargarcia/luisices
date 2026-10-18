import { describe, expect, it } from 'vitest';
vi.mock('../../src/lib/firebase', () => ({ auth: { currentUser: null } }));
import { extractGalleryStoragePath } from '../../src/services/firebaseGalleryImageService';

describe('URLs privadas da galeria', () => {
  it('converte URL antiga do Firebase em caminho, removendo token e query', () => {
    const source = 'https://firebasestorage.googleapis.com/v0/b/example/o/users%2Fowner%2Fgallery%2Fart.webp?alt=media&token=secret';
    expect(extractGalleryStoragePath(source)).toBe('users/owner/gallery/art.webp');
  });

  it('converte URL antiga da CDN em caminho sem carregar query de token', () => {
    expect(extractGalleryStoragePath('https://cdn-dev.luisices.com.br/users/owner/gallery/art.webp?token=secret'))
      .toBe('users/owner/gallery/art.webp');
  });

  it('aceita caminho canônico e descarta query acidental', () => {
    expect(extractGalleryStoragePath('users/owner/gallery/art.webp?token=secret'))
      .toBe('users/owner/gallery/art.webp');
  });

  it('não interpreta URL de domínio não confiável como caminho do Storage', () => {
    expect(extractGalleryStoragePath('https://attacker.example/users/owner/gallery/art.webp')).toBe('');
  });
});
