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
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        URL.revokeObjectURL(objectUrl);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set 4:5 Aspect Ratio (Portrait)
        const targetWidth = img.width;
        const targetHeight = (img.width * 5) / 4;
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw background (white)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center crop the image
        const imgAspect = img.width / img.height;
        const targetAspect = 4 / 5;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgAspect > targetAspect) {
          drawHeight = targetHeight;
          drawWidth = img.width * (targetHeight / img.height);
          offsetX = (targetWidth - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = targetWidth;
          drawHeight = img.height * (targetWidth / img.width);
          offsetX = 0;
          offsetY = (targetHeight - drawHeight) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Add Watermark
        const addTextWatermark = () => {
          const fontSize = Math.floor((canvas.width / 20) * scale);
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.globalAlpha = opacity;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          
          // Add shadow for readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 10;
          
          const padding = 20 * scale;
          let x = canvas.width - padding;
          let y = canvas.height - padding;

          if (position === 'top-left') {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            x = padding;
            y = padding;
          } else if (position === 'top-right') {
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            x = canvas.width - padding;
            y = padding;
          } else if (position === 'center') {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            x = canvas.width / 2;
            y = canvas.height / 2;
          } else if (position === 'bottom-left') {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            x = padding;
            y = canvas.height - padding;
          }

          ctx.fillText(watermarkText, x, y);
          
          // Reset
          ctx.globalAlpha = 1.0;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        };

        if (watermarkUrl) {
          try {
            const watermarkImg = new Image();
            if (!watermarkUrl.startsWith('data:')) {
              watermarkImg.crossOrigin = "anonymous";
            }
            
            await new Promise((res, rej) => {
              watermarkImg.onload = res;
              watermarkImg.onerror = rej;
              watermarkImg.src = watermarkUrl;
            });

            const baseLogoSize = canvas.width * 0.15;
            const logoSize = baseLogoSize * scale;
            const padding = 20 * scale;
            ctx.globalAlpha = opacity;
            
            let x = canvas.width - logoSize - padding;
            let y = canvas.height - logoSize - padding;

            if (position === 'top-left') {
              x = padding;
              y = padding;
            } else if (position === 'top-right') {
              x = canvas.width - logoSize - padding;
              y = padding;
            } else if (position === 'center') {
              x = (canvas.width - logoSize) / 2;
              y = (canvas.height - logoSize) / 2;
            } else if (position === 'bottom-left') {
              x = padding;
              y = canvas.height - logoSize - padding;
            }

            ctx.drawImage(watermarkImg, x, y, logoSize, logoSize);
            ctx.globalAlpha = 1.0;
          } catch (e) {
            console.error("Failed to load watermark image, falling back to text", e);
            addTextWatermark();
          }
        } else {
          addTextWatermark();
        }

        // Convert back to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob failed'));
          }
        }, 'image/jpeg', 0.9);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for processing'));
    };

    img.src = objectUrl;
  });
};
