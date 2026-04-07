import React from 'react';
import { UserProfile } from '../../../core/types';
import { motion } from 'motion/react';
import { 
  Star, 
  ShieldCheck, 
  Zap, 
  MapPin, 
  BrainCircuit,
  ArrowUpRight,
  MessageSquare
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';

interface SupplierNebulaCardProps {
  supplier: UserProfile;
  isRtl: boolean;
  onViewProfile: (uid: string) => void;
  onOpenChat: (chatId: string) => void;
  profile: UserProfile | null;
}

export const SupplierNebulaCard: React.FC<SupplierNebulaCardProps> = ({ 
  supplier, 
  isRtl, 
  onViewProfile,
  onOpenChat,
  profile
}) => {
  const trustColor = supplier.trustScore && supplier.trustScore >= 80 ? 'from-emerald-500 to-teal-400' : 'from-brand-primary to-brand-teal';

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="relative group h-full"
    >
      {/* Floating Card Design */}
      <div className="h-full rounded-[2rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 p-4 flex flex-col items-center text-center shadow-lg hover:shadow-2xl transition-all duration-500">
        
        {/* Compact Logo */}
        <div className="relative mb-3">
          <div className={`absolute -inset-2 bg-gradient-to-br ${trustColor} opacity-10 blur-xl rounded-full group-hover:opacity-30 transition-opacity`} />
          <div className="relative w-16 h-16 rounded-full bg-white dark:bg-slate-800 p-1 border border-brand-border shadow-inner overflow-hidden">
            <img 
              src={supplier.logoUrl || `https://picsum.photos/seed/${supplier.uid}/100/100`} 
              alt=""
              className="w-full h-full object-contain rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
          {/* Mini Status Dot */}
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${supplier.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        </div>

        {/* Minimalist Info */}
        <h3 className="text-sm font-black text-brand-text-main line-clamp-1 mb-1">
          {isRtl ? supplier.companyName : (supplier.companyName || supplier.name)}
        </h3>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5 text-amber-500">
            <Star size={10} className="fill-amber-500" />
            <span className="text-[10px] font-bold">{supplier.rating || '4.9'}</span>
          </div>
          <span className="text-brand-border text-[10px]">•</span>
          <div className="flex items-center gap-0.5 text-brand-primary">
            <Zap size={10} />
            <span className="text-[10px] font-bold">{supplier.averageResponseTime || '15'}m</span>
          </div>
        </div>

        {/* AI Bio (Very Compact) */}
        <div className="px-2 py-1 rounded-lg bg-brand-primary/5 border border-brand-primary/10 mb-4 w-full">
          <p className="text-[9px] font-bold text-brand-primary line-clamp-1">
            {isRtl ? (supplier.aiBio?.bioAr || 'مورد معتمد') : (supplier.aiBio?.bioEn || 'Verified Supplier')}
          </p>
        </div>

        {/* Minimalist Action Buttons */}
        <div className="flex items-center gap-2 w-full mt-auto">
          <HapticButton 
            onClick={() => onViewProfile(supplier.uid)}
            className="flex-1 py-2 bg-brand-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1"
          >
            {isRtl ? 'زيارة' : 'Visit'}
            <ArrowUpRight size={12} />
          </HapticButton>
          
          <HapticButton 
            onClick={() => {
              if (profile) {
                const chatId = [profile.uid, supplier.uid].sort().join('_');
                onOpenChat(chatId);
              }
            }}
            className="w-8 h-8 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all"
          >
            <MessageSquare size={14} />
          </HapticButton>
        </div>
      </div>
    </motion.div>
  );
};
