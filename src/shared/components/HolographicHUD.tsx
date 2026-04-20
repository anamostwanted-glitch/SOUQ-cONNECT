import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface HolographicHUDProps {
  children: React.ReactNode;
  isActive?: boolean;
  metadata?: {
    id?: string;
    type?: string;
    status?: string;
    origin?: string;
  };
}

export const HolographicHUD: React.FC<HolographicHUDProps> = ({ 
  children, 
  isActive = false, 
  metadata = { id: '0X-7F2', type: 'DATA_NODE', status: 'ACTIVE', origin: 'NEURAL_LINK' }
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const active = isActive || isHovered;

  return (
    <div 
      className="relative group overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* HUD Elements Overlay */}
      <AnimatePresence>
        {active && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            {/* Corner Markers */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/40" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/40" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/40" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/40" />

            {/* Scan Line */}
            <motion.div 
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            />

            {/* Technical Metadata */}
            <div className="absolute top-6 left-6 font-mono text-[8px] text-white/50 space-y-1">
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 bg-white/50 rounded-full animate-pulse" />
                ID: {metadata.id}
              </div>
              <div>TYPE: {metadata.type}</div>
            </div>

            <div className="absolute bottom-6 right-6 font-mono text-[8px] text-white/50 text-right space-y-1">
              <div className="flex items-center justify-end gap-1">
                STATUS: {metadata.status}
                <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div>ORIGIN: {metadata.origin}</div>
            </div>

            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:16px_16px] pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={`transition-all duration-500 ${active ? 'scale-[0.98] blur-[0.5px]' : ''}`}>
        {children}
      </div>

      {/* Futuristic Frame Glow */}
      <AnimatePresence>
        {active && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 border border-white/20 rounded-xl pointer-events-none ring-1 ring-white/10"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
