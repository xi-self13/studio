// src/lib/storageService.ts
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param file The file to upload.
 * @param storagePath The path in Firebase Storage where the file should be stored (e.g., 'avatars/users/userId/filename.jpg').
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export async function uploadImageAndGetURL(file: File, storagePath: string): Promise<string> {
  if (!file) {
    throw new Error('No file provided for upload.');
  }
  if (!storagePath) {
    throw new Error('Storage path is required.');
  }

  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`File uploaded to ${storagePath}, URL: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file to Firebase Storage:', error);
    if (error instanceof Error) {
        // Check for specific storage errors if needed, e.g., permission denied
        if (error.message.includes('storage/unauthorized')) {
            throw new Error('Permission denied. You may not have access to write to this storage location.');
        }
         if (error.message.includes('storage/object-not-found')) {
            throw new Error('Storage object not found. The path might be incorrect or the object was deleted.');
        }
    }
    throw new Error('Failed to upload image.');
  }
}
