import { handleAiError } from './errorHandling';

export type WatermarkPosition = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';

export const processImageTo4x5WithWatermark = async (
  file: File | Blob,
  watermarkUrl?: string,
  watermarkText: string = "B2B2C Connect",
  opacity: number = 0.7,
  position: WatermarkPosition = 'bottom-right',
  scale: number = 1
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/imageWorker.ts', import.meta.url));
    
    worker.onmessage = (e) => {
      if (e.data.success) {
        resolve(e.data.blob);
      } else {
        reject(new Error(e.data.error || 'Worker processing failed'));
      }
      worker.terminate();
    };
    
    worker.onerror = (e) => {
      reject(new Error('Worker error: ' + e.message));
      worker.terminate();
    };
    
    worker.postMessage({ file, watermarkUrl, watermarkText, opacity, position, scale });
  });
};
