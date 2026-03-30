import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface ScanningOverlayProps {
  isScanning: boolean;
}

export const ScanningOverlay: React.FC<ScanningOverlayProps> = ({ isScanning }) => {
  const { t } = useTranslation();
  const [statusIndex, setStatusIndex] = useState(0);
  
  const statuses = [
    t('visualSearch.analyzingShape', 'Analyzing shape and structure...'),
    t('visualSearch.extractingColors', 'Extracting colors and materials...'),
    t('visualSearch.findingMatches', 'Finding the best matches for you...'),
  ];

  useEffect(() => {
    if (!isScanning) return;
    
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isScanning, statuses.length]);

  if (!isScanning) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 overflow-hidden rounded-2xl bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center"
    >
      {/* Laser Scanner Line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1 bg-brand-primary shadow-[0_0_15px_rgba(var(--brand-primary),0.8)] z-10"
        animate={{ 
          top: ['0%', '100%', '0%'] 
        }}
        transition={{ 
          duration: 3, 
          ease: "linear", 
          repeat: Infinity 
        }}
      />

      {/* Glowing Dots (Simulating object detection) */}
      <div className="absolute inset-0">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-brand-primary/80 shadow-[0_0_10px_rgba(var(--brand-primary),1)]"
            initial={{ 
              top: `${Math.random() * 80 + 10}%`, 
              left: `${Math.random() * 80 + 10}%`,
              scale: 0,
              opacity: 0
            }}
            animate={{ 
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0]
            }}
            transition={{ 
              duration: 2,
              delay: Math.random() * 2,
              repeat: Infinity,
              repeatDelay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Dynamic Text Feedback */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
        <div className="bg-brand-surface/80 backdrop-blur-md px-6 py-2 rounded-full border border-brand-border shadow-lg">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-brand-text-main text-sm font-medium tracking-wide"
            >
              {statuses[statusIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
