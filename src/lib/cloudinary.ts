import axios from 'axios';

export const uploadToCloudinary = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  const formData = new FormData();
  formData.append('video', file);

  try {
    const response = await axios.post('/api/upload-video', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    
    return response.data.url;
  } catch (error) {
    console.error('Cloudinary client upload error:', error);
    if (axios.isAxiosError(error)) {
      const serverMessage = error.response?.data?.error || error.response?.data?.details;
      throw new Error(serverMessage || `Erro de rede no upload (Status: ${error.response?.status || 'desconhecido'})`);
    }
    throw error;
  }
};
