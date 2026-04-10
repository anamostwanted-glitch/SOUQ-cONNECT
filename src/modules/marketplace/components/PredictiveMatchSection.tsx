import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { UserProfile } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';

interface PredictiveMatchSectionProps {
  matches: { supplierId: string, reason: string }[];
  suppliers: UserProfile[];
  onViewProfile: (uid: string) => void;
  isRtl: boolean;
}

export const PredictiveMatchSection: React.FC<PredictiveMatchSectionProps> = ({ matches, suppliers, onViewProfile, isRtl }) => {
  if (matches.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-12"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {isRtl ? 'مطابقات ذكية لك' : 'Smart Matches for You'}
          </h2>
          <p className="text-slate-500 text-xs font-medium">
            {isRtl ? 'موردون نوصي بهم بناءً على اهتماماتك' : 'Suppliers we recommend based on your interests'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {matches.map((match) => {
          const supplier = suppliers.find(s => s.uid === match.supplierId);
          if (!supplier) return null;
          return (
            <div key={match.supplierId} className="p-6 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/30 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white mb-2">{supplier.name || supplier.companyName}</h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-4">{match.reason}</p>
              </div>
              <HapticButton 
                onClick={() => onViewProfile(supplier.uid)}
                className="w-full py-2 bg-brand-primary/10 text-brand-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-brand-primary/20"
              >
                {isRtl ? 'عرض الملف' : 'View Profile'} <ArrowRight size={14} />
              </HapticButton>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
