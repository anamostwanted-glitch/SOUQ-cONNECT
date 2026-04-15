import React from 'react';
import { motion } from 'motion/react';
import { Sparkles as SparklesIcon, Building2, ArrowRight } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { UserProfile } from '../../../../core/types';
import { getUserImageUrl } from '../../../../core/utils/imageUtils';

interface MatchedSuppliersSectionProps {
  matchedSuppliers: UserProfile[];
  isRtl: boolean;
  onOpenChat: (uid: string) => void;
  onViewProfile: (uid: string) => void;
}

export const MatchedSuppliersSection: React.FC<MatchedSuppliersSectionProps> = ({ 
  matchedSuppliers, 
  isRtl, 
  onOpenChat, 
  onViewProfile 
}) => {
  if (matchedSuppliers.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-teal/10 rounded-xl flex items-center justify-center text-brand-teal">
          <SparklesIcon size={20} />
        </div>
        <div>
          <h3 className="text-xl font-black text-brand-text-main">
            {isRtl ? 'الموردون المقترحون لك' : 'Suggested Suppliers for You'}
          </h3>
          <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest mt-1">
            {isRtl ? 'بناءً على تحليلات الذكاء الاصطناعي لطلبك' : 'Based on AI analysis of your request'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {matchedSuppliers.map((supplier) => (
          <motion.div
            key={supplier.uid}
            whileHover={{ y: -5 }}
            className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 rounded-[2rem] p-5 md:p-6 shadow-xl shadow-black/5 group relative overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative z-10 flex flex-col items-center text-center flex-1">
              <div className="w-20 h-20 rounded-2xl bg-brand-background flex items-center justify-center mb-4 overflow-hidden border-2 border-white shadow-lg shrink-0">
                <img 
                  src={getUserImageUrl(supplier)} 
                  alt={supplier.companyName || supplier.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <h4 className="text-lg font-black text-brand-text-main mb-1 truncate w-full px-2">
                {supplier.companyName || supplier.name}
              </h4>
              
              <div className="flex items-center gap-1 text-amber-500 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <SparklesIcon key={star} size={10} fill="currentColor" />
                ))}
                <span className="text-[10px] font-black ml-1 text-brand-text-muted">5.0</span>
              </div>

              <p className="text-xs text-brand-text-muted line-clamp-2 mb-6 min-h-[2rem]">
                {supplier.bio || (isRtl ? 'مورد معتمد في منصتنا' : 'Verified supplier on our platform')}
              </p>

              <div className="flex items-center gap-2 w-full">
                <HapticButton
                  onClick={() => onOpenChat(supplier.uid)}
                  className="flex-1 bg-brand-primary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-dark transition-all"
                >
                  {isRtl ? 'تواصل' : 'Contact'}
                </HapticButton>
                <HapticButton
                  onClick={() => onViewProfile(supplier.uid)}
                  className="p-3 bg-brand-background text-brand-text-main rounded-xl hover:bg-brand-border transition-all"
                >
                  <ArrowRight size={16} className={isRtl ? 'rotate-180' : ''} />
                </HapticButton>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
