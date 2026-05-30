/**
 * Converte um File (JPEG, PNG, etc.) para o formato WebP utilizando Canvas no cliente.
 * Reduz enormemente o peso de transferência inicial e de carregamento posterior no celular.
 */
/**
 * Telemetria para acompanhar a economia total em bytes de todas as imagens comprimidas na sessão.
 */
export const compressionStats = {
  totalOriginalSize: 0,
  totalCompressedSize: 0,
  get ratio() {
    if (this.totalOriginalSize === 0) return 0;
    return Math.round((1 - (this.totalCompressedSize / this.totalOriginalSize)) * 100);
  },
  reset() {
    this.totalOriginalSize = 0;
    this.totalCompressedSize = 0;
  }
};

/**
 * Converte e compacta de forma inteligente qualquer File no cliente,
 * redimensionando se necessário e adaptando o fator de qualidade.
 */
export const optimizeImage = (file: File): Promise<{ file: File; originalSize: number; optimizedSize: number; savedPercent: number }> => {
  return new Promise((resolve) => {
    const originalSize = file.size;

    // Preserva GIFs animados ou imagens SVG intactas para não quebrar animações/vetores
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      resolve({ file, originalSize, optimizedSize: originalSize, savedPercent: 0 });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Configura limites inteligentes baseados na resolução original e no peso
        // Limite máximo de largura/altura padrão de 1920px para redes sociais
        let maxWidth = 1920;
        let maxHeight = 1920;
        let quality = 0.82;

        if (originalSize > 5 * 1024 * 1024) {
          // Arquivos gigantes (> 5MB): Limite mais severo de tamanho e qualidade
          maxWidth = 1440;
          maxHeight = 1440;
          quality = 0.75;
        } else if (originalSize > 2 * 1024 * 1024) {
          // Arquivos médios (> 2MB): Compressão equilibrada
          maxWidth = 1600;
          maxHeight = 1600;
          quality = 0.80;
        } else if (originalSize < 300 * 1024) {
          // Arquivos pequenos (< 300KB): Mantém fidelidade altíssima
          maxWidth = 2048;
          maxHeight = 2048;
          quality = 0.90;
        }

        let width = img.width;
        let height = img.height;

        // Redimensionamento proporcional se passar das dimensões máximas
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ file, originalSize, optimizedSize: originalSize, savedPercent: 0 });
          return;
        }

        // Desenha a imagem redimensionada
        ctx.fillStyle = '#ffffff'; // Fundo branco caso haja transparências em JPG convertidos
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Exporta como WebP (ou jpeg caso o navegador não suporte)
        const format = 'image/webp';
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ file, originalSize, optimizedSize: originalSize, savedPercent: 0 });
              return;
            }

            // Se o arquivo compactado por um acaso ficar maior que o original, use o original
            if (blob.size >= originalSize) {
              resolve({ file, originalSize, optimizedSize: originalSize, savedPercent: 0 });
              return;
            }

            const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: format,
            });

            // Registrar telemetria global
            compressionStats.totalOriginalSize += originalSize;
            compressionStats.totalCompressedSize += blob.size;

            const savedPercent = Math.round((1 - (blob.size / originalSize)) * 100);

            resolve({
              file: optimizedFile,
              originalSize,
              optimizedSize: blob.size,
              savedPercent
            });
          },
          format,
          quality
        );
      };

      img.onerror = () => {
        resolve({ file, originalSize, optimizedSize: originalSize, savedPercent: 0 });
      };
      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve({ file, originalSize, optimizedSize: originalSize, savedPercent: 0 });
    };
    reader.readAsDataURL(file);
  });
};

export const uploadToImgBB = async (file: File): Promise<string> => {
  const apiKey = '92226daa35f3a16583ebc17de28cceab';
  
  // Otimiza o arquivo usando o algoritmo inteligente antes do envio
  let optimizedFile = file;
  try {
    const result = await optimizeImage(file);
    optimizedFile = result.file;
    console.log(`[MediaManager] Imagem compactada: ${(result.originalSize / 1024).toFixed(1)}KB -> ${(result.optimizedSize / 1024).toFixed(1)}KB (-${result.savedPercent}%)`);
  } catch (webpError) {
    console.warn('[MediaManager] Falha na compressão inteligente, subindo arquivo bruto:', webpError);
  }

  const formData = new FormData();
  formData.append('image', optimizedFile);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (data.success) {
      return data.data.url;
    } else {
      throw new Error(data.error.message || 'Failed to upload image');
    }
  } catch (error) {
    console.error('ImgBB upload error:', error);
    throw error;
  }
};
