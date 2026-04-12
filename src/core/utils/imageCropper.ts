export const compressImage = async (imageUrl: string, maxWidth: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No context');

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};

export const cropImageToFocus = async (
  imageUrl: string,
  focus: { x: number; y: number; width: number; height: number },
  targetAspectRatio: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No context');

      // Calculate focus point in pixels
      const focusX = (focus.x / 1000) * img.width;
      const focusY = (focus.y / 1000) * img.height;
      const focusW = (focus.width / 1000) * img.width;
      const focusH = (focus.height / 1000) * img.height;

      // Calculate crop area to maintain target aspect ratio around focus point
      let cropW = img.width;
      let cropH = img.height;
      
      if (img.width / img.height > targetAspectRatio) {
        cropW = img.height * targetAspectRatio;
      } else {
        cropH = img.width / targetAspectRatio;
      }

      let cropX = focusX - cropW / 2;
      let cropY = focusY - cropH / 2;

      // Clamp crop area
      cropX = Math.max(0, Math.min(cropX, img.width - cropW));
      cropY = Math.max(0, Math.min(cropY, img.height - cropH));

      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};
