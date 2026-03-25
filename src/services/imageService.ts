export const imageService = {
  uploadImage: async (base64OrBlob: string | Blob): Promise<string> => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '92226daa35f3a16583ebc17de28cceab';
    const formData = new FormData();
    
    if (typeof base64OrBlob === 'string') {
      // Remove data:image/xxx;base64, prefix if present
      const base64Data = base64OrBlob.split(',')[1] || base64OrBlob;
      formData.append('image', base64Data);
    } else {
      formData.append('image', base64OrBlob);
    }

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload image to ImgBB');
      }

      const data = await response.json();
      return data.data.url;
    } catch (error) {
      console.error('ImgBB Upload Error:', error);
      throw error;
    }
  }
};
