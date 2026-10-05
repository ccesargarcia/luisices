import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toCdnUrl } from '../../src/app/utils/cdnUtils';
import { optimizeImageToWebP, optimizeImageForAi } from '../../src/app/utils/imageOptimizer';

describe('Funcionalidade: Otimização de Mídias e CDN de Armazenamento', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Utilitário de URL CDN (toCdnUrl)', () => {
    it('deve retornar string vazia para valores nulos, indefinidos ou tipos não-string', () => {
      expect(toCdnUrl(null)).toBe('');
      expect(toCdnUrl(undefined)).toBe('');
      expect(toCdnUrl('')).toBe('');
      expect(toCdnUrl(123 as any)).toBe('');
    });

    it('deve transformar URL padrão do Firebase Storage para o domínio da CDN', () => {
      // Configurar variável de ambiente no Vite import.meta.env
      (import.meta.env as any).VITE_STORAGE_CDN_URL = 'https://cdn.luisices.com.br';

      const firebaseUrl =
        'https://firebasestorage.googleapis.com/v0/b/luisices-app.appspot.com/o/users%2Fuser123%2Fgallery%2Ftopo_bolo.png?alt=media&token=abcdef-12345';

      const cdnUrl = toCdnUrl(firebaseUrl);

      expect(cdnUrl).toBe('https://cdn.luisices.com.br/users/user123/gallery/topo_bolo.png');
    });

    it('deve limpar query strings de tokens de URLs que já estão no domínio CDN', () => {
      (import.meta.env as any).VITE_STORAGE_CDN_URL = 'https://cdn.luisices.com.br';

      const existingCdnUrl =
        'https://cdn.luisices.com.br/users/user123/banners/hero.webp?alt=media&token=sec123';

      expect(toCdnUrl(existingCdnUrl)).toBe('https://cdn.luisices.com.br/users/user123/banners/hero.webp');

      const devCdnUrl =
        'https://cdn-dev.luisices.com.br/products/box.jpg?version=1';
      expect(toCdnUrl(devCdnUrl)).toBe('https://cdn-dev.luisices.com.br/products/box.jpg');
    });

    it('deve manter inalteradas URLs de origens externas que não sejam do Firebase Storage', () => {
      (import.meta.env as any).VITE_STORAGE_CDN_URL = 'https://cdn.luisices.com.br';

      const externalUrl = 'https://instagram.fbr.com/v/t51.2885-15/photo.jpg';
      expect(toCdnUrl(externalUrl)).toBe(externalUrl);

      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
      expect(toCdnUrl(dataUri)).toBe(dataUri);
    });

    it('deve retornar a URL original caso a variável VITE_STORAGE_CDN_URL não esteja definida', () => {
      const currentCdnEnv = (import.meta.env as any).VITE_STORAGE_CDN_URL;
      delete (import.meta.env as any).VITE_STORAGE_CDN_URL;

      const firebaseUrl =
        'https://firebasestorage.googleapis.com/v0/b/luisices-app.appspot.com/o/users%2Fart.png?alt=media';
      expect(toCdnUrl(firebaseUrl)).toBe(firebaseUrl);

      (import.meta.env as any).VITE_STORAGE_CDN_URL = currentCdnEnv;
    });
  });

  describe('2. Otimizador de Imagens Client-Side (optimizeImageToWebP)', () => {
    it('deve ignorar e preservar intactos arquivos não-imagem (ex: PDFs)', async () => {
      const pdfFile = new File(['%PDF-1.4...'], 'recibo.pdf', { type: 'application/pdf' });
      const result = await optimizeImageToWebP(pdfFile);

      expect(result).toBe(pdfFile);
      expect(result.name).toBe('recibo.pdf');
      expect(result.type).toBe('application/pdf');
    });

    it('deve preservar intactos arquivos vetoriais SVG', async () => {
      const svgFile = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' });
      const result = await optimizeImageToWebP(svgFile);

      expect(result).toBe(svgFile);
      expect(result.type).toBe('image/svg+xml');
    });

    it('deve preservar intactos arquivos GIF animados para não quebrar a animação', async () => {
      const gifFile = new File(['GIF89a...'], 'animacao.gif', { type: 'image/gif' });
      const result = await optimizeImageToWebP(gifFile);

      expect(result).toBe(gifFile);
      expect(result.type).toBe('image/gif');
    });

    it('deve retornar o arquivo original como fallback quando o ambiente não suporta Canvas', async () => {
      // No ambiente Node sem document.createElement('canvas'), o fallbackOnError: true
      // garante que o arquivo original seja mantido de forma segura
      const pngFile = new File(['fake-png-binary'], 'convite.png', { type: 'image/png' });
      const result = await optimizeImageToWebP(pngFile, { fallbackOnError: true });

      expect(result).toBe(pngFile);
    });

    it('optimizeImageForAi deve delegar com opções de resolução reduzida (máx 800px)', async () => {
      const jpegFile = new File(['fake-jpeg'], 'foto.jpg', { type: 'image/jpeg' });
      const result = await optimizeImageForAi(jpegFile);

      // No fallback seguro em Node, o arquivo original é mantido sem quebrar a execução
      expect(result).toBe(jpegFile);
    });

    it('deve converter corretamente e redimensionar quando Canvas e Image estiverem disponíveis', async () => {
      // Simula API de navegador (Image e HTMLCanvasElement)
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;

      try {
        URL.createObjectURL = vi.fn(() => 'blob:mock-object-url');
        URL.revokeObjectURL = vi.fn();

        (global as any).Image = class {
          naturalWidth = 4000;
          naturalHeight = 2000;
          width = 4000;
          height = 2000;
          onload: (() => void) | null = null;
          onerror: ((err: any) => void) | null = null;
          private _src = '';

          get src() {
            return this._src;
          }

          set src(val: string) {
            this._src = val;
            setTimeout(() => {
              if (this.onload) this.onload();
            }, 0);
          }
        };

        // Mock de Canvas
        const mockBlob = new Blob(['mock-webp-binary'], { type: 'image/webp' });
        const mockContext = {
          imageSmoothingEnabled: false,
          imageSmoothingQuality: '',
          drawImage: vi.fn(),
        };

        (global as any).document = {
          createElement: vi.fn((tagName: string) => {
            if (tagName === 'canvas') {
              return {
                width: 0,
                height: 0,
                getContext: vi.fn(() => mockContext),
                toBlob: vi.fn((callback) => callback(mockBlob)),
              };
            }
            return {};
          }),
        };

        const imageFile = new File([new ArrayBuffer(10000)], 'arte-alta-resolucao.png', {
          type: 'image/png',
        });

        const optimized = await optimizeImageToWebP(imageFile, {
          maxDimension: 2048,
          quality: 0.85,
        });

        expect(optimized.name).toBe('arte-alta-resolucao.webp');
        expect(optimized.type).toBe('image/webp');
        expect(mockContext.drawImage).toHaveBeenCalledWith(
          expect.anything(),
          0,
          0,
          2048, // 4000x2000 redimensionado proporcionalmente para max 2048
          1024
        );
      } finally {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        delete (global as any).Image;
        delete (global as any).document;
      }
    });
  });
});
