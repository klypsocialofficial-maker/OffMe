export const uploadToImgBB = async (file: File): Promise<string> => {
  const apiKey = '92226daa35f3a16583ebc17de28cceab';
  const formData = new FormData();
  formData.append('image', file);

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
