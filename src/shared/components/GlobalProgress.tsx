import React from 'react';
import { motion } from 'motion/react';

export const GlobalProgress = ({ progress }: { progress: number | null }) => {
  if (progress === null) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 h-1 bg-brand-primary z-[9999]"
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.3 }}
    />
  );
};
