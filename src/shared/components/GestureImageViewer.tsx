import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface GestureImageViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export const GestureImageViewer: React.FC<GestureImageViewerProps> = ({ src, alt, onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
      >
        <X size={24} />
      </button>
      <motion.img 
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        src={src} 
        alt={alt} 
        className="max-w-full max-h-full object-contain rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
};
