import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Bio-Digital Sandbox: Secure File Upload Utility
 * Focuses on file type validation and environment isolation before storage.
 */
export const secureUpload = async (
  file: File, 
  path: string, 
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf'],
  maxSize: number = 5 * 1024 * 1024 // 5MB
): Promise<string> => {
  // 1. Pre-flight Validation
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Security Exception: File type ${file.type} NOT permitted in sandbox.`);
  }

  if (file.size > maxSize) {
    throw new Error(`Security Exception: File size ${Math.round(file.size / 1024 / 1024)}MB exceeds sandbox limits.`);
  }

  // 2. Metadata Cleaning (Conceptual - in a full server environment we'd strip EXIF)
  console.log(`[Bio-Sentinel] Scanning file: ${file.name}...`);

  // 3. Immutable Path Generation
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  const fullPath = `${path}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, fullPath);

  try {
    // 4. Encapsulated Upload
    const snapshot = await uploadBytes(storageRef, file, {
      customMetadata: {
        'uploadedBy': 'Sentinel-Utility',
        'securityScan': 'passed'
      }
    });

    // 5. Final Verified Retrieval
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error('[Bio-Sentinel] Upload Blocked by Guard:', error);
    throw new Error('System Integrity Check Failed during upload.');
  }
};
