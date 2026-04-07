import React, { useMemo } from 'react';
import { UserProfile } from '../../../core/types';
import { motion, AnimatePresence } from 'motion/react';
import { SupplierPulseSlab } from './SupplierPulseSlab';
import { Building2, Sparkles, RefreshCw, LayoutGrid } from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';

interface SupplierPulseHorizonProps {
  suppliers: UserProfile[];
  isRtl: boolean;
  onViewProfile: (uid: string) => void;
  onOpenChat: (chatId: string) => void;
  onToggleLayout: () => void;
  profile: UserProfile | null;
}

export const SupplierPulseHorizon: React.FC<SupplierPulseHorizonProps> = ({ 
  suppliers, 
  isRtl, 
  onViewProfile,
  onOpenChat,
  onToggleLayout,
  profile
}) => {
  // AI Weighted Shuffle: Prioritize high trust scores but keep randomness
  const shuffle = (array: UserProfile[]) => {
    const newArray = [...array];
    // Sort slightly by trust score first to give them a "boost"
    newArray.sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));
    
    // Then shuffle small chunks to maintain randomness
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Only swap if they are close in rank to keep the "AI Priority" feel
      if (Math.abs(i - j) < 5) {
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
    }
    return newArray;
  };

  const shuffledSuppliers = useMemo(() => {
    if (!suppliers.length) return [];
    return shuffle(suppliers);
  }, [suppliers]);

  if (!shuffledSuppliers.length) return null;

  return (
    <section className="mb-16">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-10 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center text-white shadow-2xl shadow-brand-primary/20 rotate-3">
            <Building2 size={28} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              {isRtl ? 'أفق النبض الذكي' : 'AI Pulse Horizon'}
              <Sparkles size={20} className="text-brand-primary animate-pulse" />
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">
              {isRtl ? 'تصفح الموردين بتدفق سينمائي ذكي' : 'Explore suppliers in a cinematic AI flow'}
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
            <RefreshCw size={16} />
            <span className="hidden md:inline">{isRtl ? 'تحديث النبض' : 'Refresh Pulse'}</span>
          </HapticButton>
        </div>
      </div>

      {/* Cinematic Slab Flow */}
      <div className="space-y-6 px-2 md:px-0">
        <AnimatePresence mode="popLayout">
          {shuffledSuppliers.map((supplier, index) => (
            <SupplierPulseSlab 
              key={supplier.uid} 
              supplier={supplier} 
              isRtl={isRtl} 
              onViewProfile={onViewProfile}
              onOpenChat={onOpenChat}
              profile={profile}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};
