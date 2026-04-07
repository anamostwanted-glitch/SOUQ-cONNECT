import React, { useMemo } from 'react';
import { UserProfile } from '../../../core/types';
import { motion, AnimatePresence } from 'motion/react';
import { SupplierNebulaCard } from './SupplierNebulaCard';
import { Building2, Sparkles, RefreshCw, LayoutGrid, Layers } from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';

interface SupplierNebulaLayoutProps {
  suppliers: UserProfile[];
  isRtl: boolean;
  onViewProfile: (uid: string) => void;
  onOpenChat: (chatId: string) => void;
  onToggleLayout: () => void;
  profile: UserProfile | null;
}

export const SupplierNebulaLayout: React.FC<SupplierNebulaLayoutProps> = ({ 
  suppliers, 
  isRtl, 
  onViewProfile,
  onOpenChat,
  onToggleLayout,
  profile
}) => {
  const shuffledSuppliers = useMemo(() => {
    if (!suppliers.length) return [];
    return [...suppliers].sort(() => Math.random() - 0.5);
  }, [suppliers]);

  if (!shuffledSuppliers.length) return null;

  return (
    <section className="mb-16">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
            <Layers size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              {isRtl ? 'سديم الموردين' : 'Supplier Nebula'}
              <Sparkles size={18} className="text-brand-primary animate-pulse" />
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {isRtl ? 'تصفح الموردين بتصميم بسيط وعصري' : 'Browse suppliers in a minimalist modern layout'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <HapticButton 
            onClick={onToggleLayout}
            className="p-3 bg-brand-surface border border-brand-border rounded-2xl text-brand-text-muted hover:text-brand-primary hover:border-brand-primary/30 transition-all"
            title={isRtl ? 'تغيير التنسيق' : 'Toggle Layout'}
          >
            <LayoutGrid size={18} />
          </HapticButton>
          
          <HapticButton 
            onClick={() => window.location.reload()}
            className="p-3 bg-brand-surface border border-brand-border rounded-2xl text-brand-text-muted hover:text-brand-primary hover:border-brand-primary/30 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
          >
            <RefreshCw size={14} />
            <span className="hidden md:inline">{isRtl ? 'تحديث' : 'Refresh'}</span>
          </HapticButton>
        </div>
      </div>

      {/* Nebula Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 px-2 md:px-0">
        <AnimatePresence mode="popLayout">
          {shuffledSuppliers.map((supplier, index) => (
            <motion.div
              key={supplier.uid}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <SupplierNebulaCard 
                supplier={supplier} 
                isRtl={isRtl} 
                onViewProfile={onViewProfile}
                onOpenChat={onOpenChat}
                profile={profile}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};
