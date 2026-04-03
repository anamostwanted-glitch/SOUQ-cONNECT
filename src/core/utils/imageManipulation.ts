export const processImageTo4x5WithWatermark = async (
  file: File,
  watermarkUrl?: string,
  isAiGenerated: boolean = false
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate 4:5 crop dimensions
      const targetRatio = 4 / 5;
      const imgRatio = img.width / img.height;

      let drawWidth = img.width;
      let drawHeight = img.height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > targetRatio) {
        // Image is wider than 4:5
        drawWidth = img.height * targetRatio;
        offsetX = (img.width - drawWidth) / 2;
      } else if (imgRatio < targetRatio) {
        // Image is taller than 4:5
        drawHeight = img.width / targetRatio;
        offsetY = (img.height - drawHeight) / 2;
      }

      // Set canvas size to the cropped dimensions
      canvas.width = drawWidth;
      canvas.height = drawHeight;

      // Draw the cropped image
      ctx.drawImage(
        img,
        offsetX, offsetY, drawWidth, drawHeight, // Source rectangle
        0, 0, drawWidth, drawHeight // Destination rectangle
      );

      // Add Watermark
      if (watermarkUrl) {
        try {
          const watermarkImg = new Image();
          watermarkImg.crossOrigin = "anonymous";
          await new Promise((res, rej) => {
            watermarkImg.onload = res;
            watermarkImg.onerror = rej;
            watermarkImg.src = watermarkUrl;
          });

          const watermarkSize = Math.floor(drawWidth * 0.15);
          const padding = Math.floor(drawWidth * 0.02);
          ctx.drawImage(
            watermarkImg,
            drawWidth - watermarkSize - padding,
            drawHeight - watermarkSize - padding,
            watermarkSize,
            watermarkSize
          );
        } catch (e) {
          console.error("Failed to load watermark image", e);
        }
      }

      // Convert back to file
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        } else {
          reject(new Error('Canvas to Blob failed'));
        }
      }, 'image/jpeg', 0.9);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for processing'));
    };

    img.src = objectUrl;
  });
};
