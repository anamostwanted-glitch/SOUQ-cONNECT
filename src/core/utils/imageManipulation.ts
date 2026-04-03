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
      const addTextWatermark = () => {
        const text = "B2B2C Connect";
        const fontSize = Math.floor(drawWidth * 0.05);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // Add shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        
        ctx.fillText(text, drawWidth - 20, drawHeight - 20);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      };

      if (watermarkUrl) {
        try {
          const watermarkImg = new Image();
          // Only set crossOrigin if it's not a base64 string
          if (!watermarkUrl.startsWith('data:')) {
            watermarkImg.crossOrigin = "anonymous";
          }
          
          await new Promise((res, rej) => {
            watermarkImg.onload = res;
            watermarkImg.onerror = rej;
            watermarkImg.src = watermarkUrl;
          });

          const watermarkSize = Math.floor(drawWidth * 0.15);
          const padding = Math.floor(drawWidth * 0.02);
          
          ctx.globalAlpha = 0.7;
          ctx.drawImage(
            watermarkImg,
            drawWidth - watermarkSize - padding,
            drawHeight - watermarkSize - padding,
            watermarkSize,
            watermarkSize
          );
          ctx.globalAlpha = 1.0;
        } catch (e) {
          console.error("Failed to load watermark image, falling back to text", e);
          addTextWatermark();
        }
      } else {
        addTextWatermark();
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
