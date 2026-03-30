import React from 'react';
import { motion } from 'motion/react';
import { X, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export type UploadStatus = 'idle' | 'compressing' | 'analyzing' | 'uploading' | 'success' | 'error';

export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  isMain?: boolean;
}

interface ImageThumbnailProps {
  image: ImageFile;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({ image, onRemove, onRetry }) => {
  return (
    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden group bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <img 
        src={image.previewUrl} 
        alt="Preview" 
        className={`w-full h-full object-cover transition-all duration-300 ${image.status !== 'success' && image.status !== 'idle' ? 'blur-sm scale-110' : ''}`}
      />

      {/* Main Image Badge */}
      {image.isMain && (
        <div className="absolute top-2 left-2 bg-brand-primary text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md z-10">
          Main Image
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={() => onRemove(image.id)}
        className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors z-10 opacity-0 group-hover:opacity-100"
      >
        <X size={14} />
      </button>

      {/* Status Overlay */}
      {image.status !== 'idle' && image.status !== 'success' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
          {image.status === 'compressing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="text-xs font-medium">Compressing...</span>
            </motion.div>
          )}
          
          {image.status === 'analyzing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-brand-primary">
              <div className="relative w-12 h-12 mb-2">
                <div className="absolute inset-0 border-2 border-brand-primary/30 rounded-lg"></div>
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }} 
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-brand-primary shadow-[0_0_8px_rgba(var(--brand-primary),0.8)]"
                />
              </div>
              <span className="text-xs font-bold text-white">AI Analyzing...</span>
            </motion.div>
          )}

          {image.status === 'uploading' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full text-white">
              <span className="text-xs font-medium mb-2">Uploading {Math.round(image.progress)}%</span>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-brand-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${image.progress}%` }}
                />
              </div>
            </motion.div>
          )}

          {image.status === 'error' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-red-400">
              <AlertCircle className="w-8 h-8 mb-2" />
              <span className="text-xs font-medium mb-2">{image.error || 'Upload failed'}</span>
              {onRetry && (
                <button 
                  onClick={() => onRetry(image.id)}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Success Indicator */}
      {image.status === 'success' && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="absolute bottom-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-lg z-10"
        >
          <CheckCircle size={16} />
        </motion.div>
      )}
    </div>
  );
};
