import React, { useMemo } from 'react';
import { motion } from 'motion/react';

export const DataStreamBackground: React.FC = () => {
  const instanceId = useMemo(() => Math.random().toString(36).substr(2, 9), []);

  const binaryCols = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: `${instanceId}-col-${i}`,
      x: `${(i * 7) + 5}%`,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 15,
      content: Array.from({ length: 20 }).map(() => Math.round(Math.random())).join('\n')
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-[0.05] dark:opacity-[0.08]">
      {/* 3D Grid Floor Effect */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:60px_60px]" 
        style={{ 
          perspective: '1000px', 
          transform: 'rotateX(45deg) scale(2)', 
          transformOrigin: 'top' 
        }}
      />

      {/* Pulsing Scan Line */}
      <motion.div
        animate={{ y: ['-10%', '110%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 h-[2px] bg-brand-primary/20 shadow-[0_0_15px_rgba(0,122,255,0.5)] z-20"
      />

      {binaryCols.map((col) => (
        <motion.div
          key={col.id}
          initial={{ y: -500, opacity: 0 }}
          animate={{ y: 500, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: col.duration,
            repeat: Infinity,
            ease: "linear",
            delay: col.delay
          }}
          className="absolute font-mono text-[10px] leading-tight whitespace-pre text-brand-primary/60"
          style={{ left: col.x }}
        >
          {col.content}
        </motion.div>
      ))}
      
      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-radial-vignette" />
    </div>
  );
};
