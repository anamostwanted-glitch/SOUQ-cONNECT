import React from 'react';
import { UserProfile } from '../../../core/types';
import { motion } from 'motion/react';
import { 
  Building2, 
  Star, 
  ShieldCheck, 
  Zap, 
  MapPin, 
  BrainCircuit,
  ArrowUpRight
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';

interface SupplierMosaicCardProps {
  supplier: UserProfile;
  isRtl: boolean;
  onViewProfile: (uid: string) => void;
  onOpenChat: (chatId: string) => void;
  profile: UserProfile | null;
  size?: 'small' | 'medium' | 'large';
}

export const SupplierMosaicCard: React.FC<SupplierMosaicCardProps> = ({ 
  supplier, 
  isRtl, 
  onViewProfile,
  onOpenChat,
  profile,
  size = 'medium'
}) => {
  // AI Trust Pulse Color
  const getTrustColor = (score: number = 0) => {
    if (score >= 90) return 'from-emerald-500 to-teal-400';
    if (score >= 70) return 'from-blue-500 to-indigo-400';
    if (score >= 50) return 'from-amber-500 to-orange-400';
    return 'from-slate-400 to-slate-500';
  };

  const trustColor = getTrustColor(supplier.trustScore);

  const handleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    const chatId = [profile.uid, supplier.uid].sort().join('_');
    onOpenChat(chatId);
  };

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onViewProfile(supplier.uid)}
      className={`relative group cursor-pointer overflow-hidden rounded-[2.5rem] border border-white/30 dark:border-slate-700/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl shadow-xl transition-all duration-500 h-full flex flex-col
        ${size === 'large' ? 'p-8' : size === 'medium' ? 'p-6' : 'p-4'}
      `}
    >
      {/* Background Decorative Element */}
      <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${trustColor} opacity-[0.03] group-hover:opacity-[0.08] rounded-full blur-3xl transition-opacity duration-700`} />

      {/* Top Header: Status & Verification */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          {/* Live Status Dot */}
          <div className="relative flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${supplier.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {supplier.isOnline && (
              <div className="absolute w-4 h-4 rounded-full bg-emerald-500/30 animate-ping" />
            )}
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-brand-text-muted">
            {supplier.isOnline ? (isRtl ? 'نشط الآن' : 'Live Now') : (isRtl ? 'غير متصل' : 'Offline')}
          </span>
        </div>

        {supplier.isVerified && (
          <div className="relative group/shield">
            <div className="absolute inset-0 bg-amber-400/20 blur-md rounded-full group-hover/shield:blur-lg transition-all" />
            <ShieldCheck size={18} className="text-amber-500 relative z-10" />
          </div>
        )}
      </div>

      {/* Main Content: Logo & Name */}
      <div className="flex flex-col items-center text-center flex-1 relative z-10">
        {/* Logo with Trust Pulse */}
        <div className="relative mb-4">
          <div className={`absolute -inset-3 bg-gradient-to-br ${trustColor} opacity-10 blur-2xl rounded-full group-hover:opacity-30 transition-opacity duration-700`} />
          <div className={`relative ${size === 'large' ? 'w-24 h-24 md:w-28 md:h-28' : size === 'medium' ? 'w-20 h-20 md:w-24 md:h-24' : 'w-16 h-16 md:w-20 md:h-20'} rounded-full bg-white dark:bg-slate-800 p-2 border border-white/50 dark:border-slate-700/50 shadow-xl overflow-hidden flex items-center justify-center`}>
            {supplier.logoUrl ? (
              <img 
                src={supplier.logoUrl} 
                alt={supplier.companyName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain rounded-full"
              />
            ) : (
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${trustColor} opacity-10 flex items-center justify-center`}>
                <Building2 className={`text-brand-primary opacity-40 ${size === 'large' ? 'w-12 h-12' : 'w-8 h-8'}`} />
              </div>
            )}
          </div>
          
          {/* Trust Score Badge */}
          <div className={`absolute -bottom-1 -right-1 px-2 py-1 rounded-xl bg-gradient-to-br ${trustColor} text-white text-[9px] font-black shadow-lg border border-white/20 backdrop-blur-md`}>
            {supplier.trustScore || 85}%
          </div>
        </div>

        <h3 className={`font-black text-brand-text-main leading-tight mb-1 group-hover:text-brand-primary transition-colors ${size === 'large' ? 'text-xl' : 'text-base'}`}>
          {isRtl ? supplier.companyName : (supplier.companyName || supplier.name)}
        </h3>

        {/* AI Bio Tag */}
        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
          <div className="px-2 py-0.5 rounded-md bg-brand-primary/5 border border-brand-primary/10 flex items-center gap-1">
            <BrainCircuit size={10} className="text-brand-primary" />
            <span className="text-[9px] font-bold text-brand-primary">
              {isRtl ? (supplier.aiBio?.bioAr || 'مورد معتمد') : (supplier.aiBio?.bioEn || 'Verified Supplier')}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-4 w-full mb-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-amber-500">
              <Star size={12} className="fill-amber-500" />
              <span className="text-xs font-black">{supplier.rating || '4.9'}</span>
            </div>
            <span className="text-[8px] font-bold text-brand-text-muted uppercase tracking-tighter">{isRtl ? 'تقييم' : 'Rating'}</span>
          </div>
          <div className="w-px h-6 bg-brand-border/50" />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-brand-primary">
              <Zap size={12} />
              <span className="text-xs font-black">{supplier.averageResponseTime || '15'}m</span>
            </div>
            <span className="text-[8px] font-bold text-brand-text-muted uppercase tracking-tighter">{isRtl ? 'سرعة الرد' : 'Response'}</span>
          </div>
        </div>

        {/* Location & Distance */}
        <div className="flex items-center gap-1 text-brand-text-muted mb-4">
          <MapPin size={10} />
          <span className="text-[10px] font-medium truncate max-w-[120px]">
            {supplier.location || (isRtl ? 'الموقع غير محدد' : 'Location unknown')}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="relative z-10 mt-auto pt-2 flex gap-2">
        <HapticButton 
          onClick={handleChat}
          className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary hover:text-white transition-all"
        >
          <Zap size={14} />
        </HapticButton>
        <HapticButton className="flex-1 py-2 bg-brand-primary/10 text-brand-primary rounded-xl text-[9px] font-black uppercase tracking-widest group-hover:bg-brand-primary group-hover:text-white group-hover:shadow-md transition-all flex items-center justify-center gap-1.5">
          {isRtl ? 'زيارة' : 'Visit'}
          <ArrowUpRight size={12} />
        </HapticButton>
      </div>
    </motion.div>
  );
};
