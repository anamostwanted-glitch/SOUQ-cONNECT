import React, { useMemo } from 'react';
import { UserProfile } from '../../../core/types';
import { motion, AnimatePresence } from 'motion/react';
import { SupplierMosaicCard } from './SupplierMosaicCard';
import { Building2, Sparkles, RefreshCw } from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';

interface SupplierMosaicProps {
  suppliers: UserProfile[];
  isRtl: boolean;
  onViewProfile: (uid: string) => void;
  onOpenChat: (chatId: string) => void;
  profile: UserProfile | null;
}

export const SupplierMosaic: React.FC<SupplierMosaicProps> = ({ 
  suppliers, 
  isRtl, 
  onViewProfile,
  onOpenChat,
  profile
}) => {
  // Fisher-Yates Shuffle Algorithm
  const shuffle = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Memoize the shuffled list to prevent re-shuffling on every render
  // but it will re-shuffle on mount or if suppliers change
  const shuffledSuppliers = useMemo(() => {
    if (!suppliers.length) return [];
    return shuffle(suppliers);
  }, [suppliers]);

  // Determine grid size based on index for Bento-Grid feel
  const getGridSpan = (index: number) => {
    // Large card for every 5th element
    if (index % 5 === 0) return 'col-span-2 row-span-2';
    // Medium card for every 3rd element
    if (index % 3 === 0) return 'col-span-1 row-span-2';
    // Small card for others
    return 'col-span-1 row-span-1';
  };

  const getCardSize = (index: number): 'small' | 'medium' | 'large' => {
    if (index % 5 === 0) return 'large';
    if (index % 3 === 0) return 'medium';
    return 'small';
  };

  if (!shuffledSuppliers.length) return null;

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              {isRtl ? 'الفسيفساء العصبية للموردين' : 'Neural Supplier Mosaic'}
              <Sparkles size={18} className="text-brand-primary animate-pulse" />
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {isRtl ? 'اكتشف موردين جدد في كل زيارة بتنسيق ذكي' : 'Discover new suppliers in every visit with smart layout'}
            </p>
          </div>
        </div>
        
        <HapticButton 
          onClick={() => window.location.reload()}
          className="p-3 bg-brand-surface border border-brand-border rounded-2xl text-brand-text-muted hover:text-brand-primary hover:border-brand-primary/30 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
        >
          <RefreshCw size={14} />
          <span className="hidden md:inline">{isRtl ? 'تحديث' : 'Refresh'}</span>
        </HapticButton>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 auto-rows-[180px] gap-4 md:gap-6 px-2 md:px-0">
        <AnimatePresence mode="popLayout">
          {shuffledSuppliers.map((supplier, index) => (
            <motion.div
              key={supplier.uid}
              layout
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.05,
                type: 'spring',
                stiffness: 100,
                damping: 15
              }}
              className={`${getGridSpan(index)}`}
            >
              <SupplierMosaicCard 
                supplier={supplier} 
                isRtl={isRtl} 
                onViewProfile={onViewProfile}
                onOpenChat={onOpenChat}
                profile={profile}
                size={getCardSize(index)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};
