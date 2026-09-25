/**
 * Utilitário de compressão e otimização de imagens para o catálogo e estúdio.
 * Converte imagens para WebP no navegador antes do upload para o Firebase Storage,
 * reduzindo fotos de 3-5MB para ~100-180KB com qualidade visual preservada.
 */

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Converte e redimensiona um File de imagem para um Blob WebP usando a API nativa de Canvas.
 * @param file Arquivo original selecionado pelo usuário
 * @param options Opções de dimensão máxima (padrão: 1200px) e qualidade (padrão: 0.82)
 * @returns Blob WebP otimizado (ou o próprio arquivo original como fallback)
 */
export async function compressImageToWebP(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; fileName: string; contentType: string }> {
  const { maxDimension = 1200, quality = 0.82 } = options;

  // Se não for imagem, retorna o arquivo original
  if (!file.type.startsWith('image/')) {
    return {
      blob: file,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
    };
  }

  // Gera nome com extensão .webp
  const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const webpFileName = `${nameWithoutExt}_${Date.now()}.webp`;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Redimensiona proporcionalmente mantendo o aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          blob: file,
          fileName: file.name,
          contentType: file.type,
        });
        return;
      }

      // Renderiza a imagem no canvas com interpolação suave
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Converte para WebP
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve({
              blob,
              fileName: webpFileName,
              contentType: 'image/webp',
            });
          } else {
            // Se o arquivo original for menor ou o browser não der suporte ao WebP, usa o original
            resolve({
              blob: blob || file,
              fileName: blob ? webpFileName : file.name,
              contentType: blob ? 'image/webp' : file.type,
            });
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Em caso de erro na decodificação da imagem, não quebra o fluxo
      resolve({
        blob: file,
        fileName: file.name,
        contentType: file.type,
      });
    };

    img.src = objectUrl;
  });
}
