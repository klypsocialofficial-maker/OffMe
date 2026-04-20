import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Uploads a file to Firebase Storage.
 * @param file The file to upload.
 * @param path The destination path in storage (e.g., 'videos/filename.mp4').
 * @param onProgress Callback for upload progress (simulated for uploadBytes).
 * @returns Promise that resolves with the download URL.
 */
export const uploadToStorage = async (
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (!storage) {
    console.error('Firebase Storage NOT initialized. Current config used storage bucket:', storage);
    throw new Error('Firebase Storage não inicializado. Verifique se o bucket de storage está configurado.');
  }

  try {
    console.log('Starting Firebase Storage upload to:', path);
    if (onProgress) onProgress(0);
    
    // Create a storage reference
    const storageRef = ref(storage, path);
    
    // Add simple metadata
    const metadata = {
      contentType: file.type,
    };

    console.log(`Uploading ${file.name} (${file.size} bytes)...`);
    
    // Use uploadBytes for simpler execution
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log('Upload successful, getting download URL...');
    
    if (onProgress) onProgress(100);
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL obtained:', downloadURL);
    return downloadURL;
  } catch (error: any) {
    console.error('Firebase Storage upload error:', error);
    // Provide a more descriptive error message if possible
    if (error.code === 'storage/unauthorized') {
      throw new Error('Sem permissão para fazer upload no Storage. Verifique as Storage Rules no console do Firebase.');
    }
    if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error('Limite de tentativas excedido ou falha de conexão com o Storage.');
    }
    throw error;
  }
};
