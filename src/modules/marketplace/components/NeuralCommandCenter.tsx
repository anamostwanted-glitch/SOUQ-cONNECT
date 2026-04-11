import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutGrid, Shield, Building2, TrendingUp, BarChart3 } from 'lucide-react';

interface NeuralCommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  isRtl: boolean;
  tabs: { id: string; label: string; icon: any }[];
  onNavigate: (tab: string) => void;
}

export const NeuralCommandCenter: React.FC<NeuralCommandCenterProps> = ({ isOpen, onClose, isRtl, tabs, onNavigate }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: isRtl ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRtl ? '100%' : '-100%' }}
            className="fixed top-0 bottom-0 w-80 bg-brand-surface border-r border-brand-border z-[101] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-brand-text-main">المركز العصبي</h2>
              <button onClick={onClose} className="p-2 hover:bg-brand-background rounded-xl">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    onNavigate(tab.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-brand-background transition-all"
                >
                  <tab.icon size={20} className="text-brand-primary" />
                  <span className="font-bold text-brand-text-main">{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
