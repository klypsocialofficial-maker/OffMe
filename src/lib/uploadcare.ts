import { uploadFile } from '@uploadcare/upload-client';

export const uploadToUploadcare = async (file: File): Promise<string> => {
  const publicKey = import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY || 'demopublickey';
  
  try {
    const result = await uploadFile(file, {
      publicKey,
      store: 'auto',
    });
    
    return result.cdnUrl || `https://ucarecdn.com/${result.uuid}/`;
  } catch (error) {
    console.error('Uploadcare upload error:', error);
    throw error;
  }
};
