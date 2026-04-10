import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { NetworkStatus } from './useNetworkAwareness';

import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

export function useSmartCompression() {
  const [isCompressing, setIsCompressing] = useState(false);

  const compressImage = async (file: File, networkStatus: NetworkStatus): Promise<File> => {
    setIsCompressing(true);
    try {
      let options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      if (networkStatus === '3g' || networkStatus === '2g' || networkStatus === 'slow-2g') {
        options.maxSizeMB = 0.3; // Ultra compression for slow networks
        options.maxWidthOrHeight = 1080;
      }

      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'image_compression', false);
      return file; // Return original if compression fails
    } finally {
      setIsCompressing(false);
    }
  };

  return { compressImage, isCompressing };
}
