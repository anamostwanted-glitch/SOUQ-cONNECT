import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  GripVertical,
  Maximize2,
  RefreshCw,
  Wifi,
  WifiOff,
  Sparkles
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { analyzeProductImage } from '../../core/services/geminiService';
import { HapticButton } from './HapticButton';

interface UploadingImage {
  id: string;
  file: File;
  preview: string;
  status: 'compressing' | 'analyzing' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  aiData?: {
    productName: string;
    description: string;
    category: string;
    features: string[];
    isHighQuality: boolean;
    classification: string;
  };
  finalUrl?: string;
}

interface SmartImageUploaderProps {
  onImagesChange: (images: UploadingImage[]) => void;
  maxImages?: number;
  watermarkText?: string;
  watermarkLogo?: string;
  watermarkOpacity?: number;
}

export const SmartImageUploader: React.FC<SmartImageUploaderProps> = ({
  onImagesChange,
  maxImages = 10,
  watermarkText = "B2B Connect",
  watermarkLogo,
  watermarkOpacity = 0.5
}) => {
  const { t, i18n } = useTranslation();
  const [images, setImages] = useState<UploadingImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Network Awareness
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processImage = async (uploadingImg: UploadingImage) => {
    try {
      // 1. Compression
      setImages(prev => prev.map(img => img.id === uploadingImg.id ? { ...img, status: 'compressing' as const, progress: 20 } : img));
      
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.8
      };
      
      const compressedFile = await imageCompression(uploadingImg.file, options);
      
      // 2. Watermarking
      setImages(prev => prev.map(img => img.id === uploadingImg.id ? { ...img, progress: 40 } : img));
      const watermarkedBlob = await applyWatermark(compressedFile, watermarkText, watermarkOpacity, watermarkLogo);
      
      // 3. AI Analysis (only for the first image or if not analyzed)
      setImages(prev => prev.map(img => img.id === uploadingImg.id ? { ...img, status: 'analyzing' as const, progress: 60 } : img));
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(watermarkedBlob);
      });
      
      const base64 = await base64Promise;
      const aiResult = await analyzeProductImage(base64, watermarkedBlob.type, i18n.language);
      
      // 4. Final Success (In a real app, you'd upload to Firebase Storage here)
      // For this demo, we'll use the local blob URL as the "finalUrl"
      const finalUrl = URL.createObjectURL(watermarkedBlob);
      
      setImages(prev => {
        const updated = prev.map(img => img.id === uploadingImg.id ? { 
          ...img, 
          status: 'success' as const, 
          progress: 100, 
          aiData: aiResult || undefined,
          finalUrl 
        } : img);
        onImagesChange(updated);
        return updated;
      });

    } catch (error) {
      console.error("Error processing image:", error);
      setImages(prev => prev.map(img => img.id === uploadingImg.id ? { ...img, status: 'error' as const, error: 'Failed to process' } : img));
    }
  };

  const applyWatermark = (file: File | Blob, text: string, opacity: number, logo?: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context failed"));

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

        // Apply Watermark
        ctx.globalAlpha = opacity;
        ctx.font = `${Math.floor(canvas.width / 20)}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // Shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        
        ctx.fillText(text, canvas.width - 20, canvas.height - 20);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Blob conversion failed"));
        }, 'image/jpeg', 0.9);
      };
      img.onerror = reject;
    });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    
    const newImages: UploadingImage[] = Array.from(files).slice(0, maxImages - images.length).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      status: 'compressing',
      progress: 0
    }));

    setImages(prev => [...prev, ...newImages]);
    newImages.forEach(img => processImage(img));
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      onImagesChange(filtered);
      return filtered;
    });
  };

  const retryImage = (id: string) => {
    const img = images.find(i => i.id === id);
    if (img) processImage(img);
  };

  return (
    <div className="space-y-6">
      {/* Network Status */}
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm"
        >
          <WifiOff className="w-4 h-4" />
          <span>{t('network_disconnected', 'Network disconnected. Uploads paused.')}</span>
        </motion.div>
      )}

      {/* Dropzone */}
      {images.length < maxImages && (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer
            flex flex-col items-center justify-center gap-4 text-center
            ${isDragging ? 'border-brand-primary bg-brand-primary/5 scale-[0.99]' : 'border-slate-200 hover:border-brand-primary hover:bg-slate-50'}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            multiple 
            accept="image/*" 
            onChange={(e) => handleFiles(e.target.files)} 
          />
          
          <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Upload className="w-8 h-8" />
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-slate-800">{t('upload_images', 'Upload Product Images')}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {t('upload_desc', 'Drag and drop or click to select. 4:5 aspect ratio recommended.')}
            </p>
          </div>

          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Camera className="w-4 h-4" />
              <span>{t('capture_photo', 'Capture Photo')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ImageIcon className="w-4 h-4" />
              <span>{t('gallery', 'Gallery')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Image List */}
      <Reorder.Group 
        axis="y" 
        values={images} 
        onReorder={(newOrder) => {
          setImages(newOrder);
          onImagesChange(newOrder);
        }}
        className="space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {images.map((img) => (
            <Reorder.Item 
              key={img.id} 
              value={img}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-4 shadow-sm group"
            >
              <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors">
                <GripVertical className="w-5 h-5" />
              </div>

              <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                <img src={img.preview} alt="Preview" className="w-full h-full object-cover" />
                {img.status === 'success' && img.aiData?.isHighQuality && (
                  <div className="absolute top-1 right-1 bg-brand-primary text-white p-0.5 rounded-full shadow-sm">
                    <Sparkles className="w-3 h-3" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {img.file.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {img.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {img.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {(img.status === 'compressing' || img.status === 'analyzing' || img.status === 'uploading') && (
                      <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${img.progress}%` }}
                    className={`h-full transition-all ${
                      img.status === 'error' ? 'bg-red-500' : 
                      img.status === 'success' ? 'bg-emerald-500' : 
                      'bg-brand-primary'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {img.status === 'compressing' && t('compressing', 'Compressing...')}
                    {img.status === 'analyzing' && t('analyzing', 'AI Analyzing...')}
                    {img.status === 'uploading' && t('uploading', 'Uploading...')}
                    {img.status === 'success' && t('ready', 'Ready')}
                    {img.status === 'error' && <span className="text-red-500">{img.error}</span>}
                  </span>
                  
                    <div className="flex items-center gap-2">
                      {img.status === 'success' && !img.aiData && (
                        <button 
                          onClick={() => processImage(img)}
                          className="p-1 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all flex items-center gap-1"
                          title={t('smart_analyze', 'Smart Analyze')}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">{t('analyze', 'Analyze')}</span>
                        </button>
                      )}
                      {img.status === 'error' && (
                        <button 
                          onClick={() => retryImage(img.id)}
                          className="p-1 text-slate-400 hover:text-brand-primary transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => removeImage(img.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Empty State */}
      {images.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-slate-300">
          <ImageIcon className="w-12 h-12 mb-2" />
          <p className="text-sm font-medium">{t('no_images_yet', 'No images added yet')}</p>
        </div>
      )}
    </div>
  );
};
