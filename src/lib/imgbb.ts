/**
 * Converte um File (JPEG, PNG, etc.) para o formato WebP utilizando Canvas no cliente.
 * Reduz enormemente o peso de transferência inicial e de carregamento posterior no celular.
 */
const convertToWebP = (file: File, quality = 0.82): Promise<File> => {
  return new Promise((resolve) => {
    // Se já for webp, resolve direto
    if (file.type === 'image/webp') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // fallback
              return;
            }
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp',
            });
            resolve(webpFile);
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => {
        resolve(file); // fallback
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      resolve(file); // fallback
    };
    reader.readAsDataURL(file);
  });
};

export const uploadToImgBB = async (file: File): Promise<string> => {
  const apiKey = '92226daa35f3a16583ebc17de28cceab';
  
  // Otimiza o arquivo convertendo-o para WebP antes de realizar o upload
  let optimizedFile = file;
  try {
    optimizedFile = await convertToWebP(file);
  } catch (webpError) {
    console.warn('Falha na conversão preliminar para WebP, subindo no formato original:', webpError);
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
