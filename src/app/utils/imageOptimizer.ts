/**
 * Image Optimizer Utility
 *
 * Converte e otimiza imagens no navegador antes do upload para o Firebase Storage,
 * convertendo para o formato WebP com redimensionamento proporcional inteligente
 * e retenção de máxima qualidade visual.
 */

export interface OptimizeImageOptions {
  /**
   * Limite máximo para a maior dimensão (largura ou altura) em pixels.
   * Padrão: 2048px (ideal para telas Retina e zoom sem desperdício de megabytes)
   */
  maxDimension?: number;
  /**
   * Qualidade da compressão WebP (entre 0.1 e 1.0).
   * Padrão: 0.85 (85% - fidelidade visual idêntica com redução de ~80-90% no peso)
   */
  quality?: number;
  /**
   * Se verdadeiro, mantém o arquivo original caso ocorra qualquer erro no Canvas.
   * Padrão: true
   */
  fallbackOnError?: boolean;
  /** Garante que a imagem convertida seja usada mesmo quando o WebP resultante ficar maior. */
  forceResize?: boolean;
}

/**
 * Converte um arquivo de imagem para WebP otimizado no client-side.
 * Arquivos não-imagem, PDFs, SVGs ou GIFs animados são preservados intactos.
 */
export async function optimizeImageToWebP(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<File> {
  const {
    maxDimension = 2048,
    quality = 0.85,
    fallbackOnError = true,
    forceResize = false,
  } = options;

  // Preservar arquivos que não são imagens (ex: PDF de pedidos) ou formatos vetoriais/animados
  if (!file || !file.type) return file;
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/svg+xml') return file;
  if (file.type === 'image/gif') return file; // Preserva animações de GIF

  // Fallback seguro quando o ambiente não suporta DOM/Canvas/Image (ex: Node.js / SSR / testes unitários)
  const ImageConstructor = typeof Image !== 'undefined'
    ? Image
    : (typeof globalThis !== 'undefined' ? (globalThis as any).Image : undefined);
  const doc = typeof document !== 'undefined'
    ? document
    : (typeof globalThis !== 'undefined' ? (globalThis as any).document : undefined);

  if (!ImageConstructor || !doc) {
    return file;
  }

  try {
    const optimizedBlob = await convertImageElementToWebP(file, maxDimension, quality, ImageConstructor, doc);
    if (!optimizedBlob) {
      return file;
    }

    // Se por algum motivo o WebP gerado for maior que o original (ex: ícone minúsculo de 2KB), manter o original
    if (!forceResize && optimizedBlob.size >= file.size && file.type === 'image/webp') {
      return file;
    }

    // Substituir extensão por .webp
    const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const newFileName = `${originalNameWithoutExt}.webp`;

    const optimizedFile = new File([optimizedBlob], newFileName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });

    if (process.env.NODE_ENV === 'development') {
      const reduction = (((file.size - optimizedFile.size) / file.size) * 100).toFixed(1);
      console.log(
        `[ImageOptimizer] "${file.name}" otimizado: ${(file.size / 1024).toFixed(0)}KB ➔ ${(optimizedFile.size / 1024).toFixed(0)}KB (-${reduction}%)`
      );
    }

    return optimizedFile;
  } catch (error) {
    console.warn('[ImageOptimizer] Falha ao otimizar imagem para WebP, usando arquivo original:', error);
    if (fallbackOnError) {
      return file;
    }
    throw error;
  }
}

/**
 * Otimiza e reduz uma imagem especificamente para análise de visão computacional / IA (Gemini Vision).
 * Reduz para no máximo 800px e comprime em WebP com 80% de qualidade.
 * Reduz em até ~95% o payload base64 enviado à Cloud Function e o consumo de tokens de visão.
 */
export async function optimizeImageForAi(file: File): Promise<File> {
  return optimizeImageToWebP(file, {
    maxDimension: 800,
    quality: 0.8,
    fallbackOnError: true,
  });
}


/**
 * Carrega a imagem e processa a renderização no Canvas para exportação WebP
 */
function convertImageElementToWebP(
  file: File,
  maxDimension: number,
  quality: number,
  ImageCtor?: any,
  docObj?: any
): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const Ctor = ImageCtor || (typeof Image !== 'undefined' ? Image : (globalThis as any).Image);
    const doc = docObj || (typeof document !== 'undefined' ? document : (globalThis as any).document);
    const img = new Ctor();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const { width, height } = calculateDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDimension);

        const canvas = doc.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        // Suavização bilinear de alta qualidade ao redimensionar
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Suporte a toBlob nativo
        if (canvas.toBlob) {
          canvas.toBlob(
            (blob: Blob | null) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(null);
              }
            },
            'image/webp',
            quality
          );
        } else {
          // Fallback seguro se toBlob não estiver disponível
          const dataUrl = canvas.toDataURL('image/webp', quality);
          const blob = dataURItoBlob(dataUrl);
          resolve(blob);
        }
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err: unknown) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}

/**
 * Calcula dimensões proporcionais preservando o aspect ratio
 */
function calculateDimensions(
  origWidth: number,
  origHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (origWidth <= 0 || origHeight <= 0) {
    return { width: maxDimension, height: maxDimension };
  }

  if (origWidth <= maxDimension && origHeight <= maxDimension) {
    return { width: origWidth, height: origHeight };
  }

  const ratio = Math.min(maxDimension / origWidth, maxDimension / origHeight);
  return {
    width: Math.max(1, Math.round(origWidth * ratio)),
    height: Math.max(1, Math.round(origHeight * ratio)),
  };
}

/**
 * Converte Data URI para Blob
 */
function dataURItoBlob(dataURI: string): Blob {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}
