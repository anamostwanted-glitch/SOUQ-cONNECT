// src/core/workers/imageWorker.ts

import { WatermarkPosition } from '../utils/imageManipulation';

self.onmessage = async (e) => {
  const { file, watermarkUrl, watermarkText, opacity, position, scale } = e.data;

  try {
    const img = await createImageBitmap(file);
    
    // Set 4:5 Aspect Ratio (Portrait)
    const MAX_DIMENSION = 2048;
    let targetWidth = img.width;
    let targetHeight = (img.width * 5) / 4;

    if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
      if (targetWidth > targetHeight) {
        targetWidth = MAX_DIMENSION;
        targetHeight = (MAX_DIMENSION * 5) / 4;
      } else {
        targetHeight = MAX_DIMENSION;
        targetWidth = (MAX_DIMENSION * 4) / 5;
      }
    }
    
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      self.postMessage({ error: 'Could not get canvas context' });
      return;
    }

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

    // Add Text Watermark
    const fontSize = Math.floor((canvas.width / 20) * scale);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.globalAlpha = opacity;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    
    // Add shadow
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

    // Handle Image Watermark if URL provided
    if (watermarkUrl) {
      try {
        const response = await fetch(watermarkUrl);
        const blob = await response.blob();
        const watermarkImg = await createImageBitmap(blob);
        
        const baseLogoSize = canvas.width * 0.15;
        const logoSize = baseLogoSize * scale;
        
        let wx = canvas.width - logoSize - padding;
        let wy = canvas.height - logoSize - padding;

        if (position === 'top-left') {
          wx = padding;
          wy = padding;
        } else if (position === 'top-right') {
          wx = canvas.width - logoSize - padding;
          wy = padding;
        } else if (position === 'center') {
          wx = (canvas.width - logoSize) / 2;
          wy = (canvas.height - logoSize) / 2;
        } else if (position === 'bottom-left') {
          wx = padding;
          wy = canvas.height - logoSize - padding;
        }

        ctx.globalAlpha = opacity;
        ctx.drawImage(watermarkImg, wx, wy, logoSize, logoSize);
        ctx.globalAlpha = 1.0;
      } catch (e) {
        console.error('Watermark image loading failed in worker:', e);
      }
    }
    
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    self.postMessage({ success: true, blob });
  } catch (error: any) {
    self.postMessage({ error: error.message });
  }
};
