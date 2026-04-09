import React from 'react';
import { UserProfile } from '../../../core/types';
import { motion } from 'motion/react';
import { 
  Star, 
  ShieldCheck, 
  Zap, 
  MapPin, 
  BrainCircuit,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Building2
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';

interface SupplierPulseSlabProps {
  supplier: UserProfile;
  isRtl: boolean;
  onViewProfile: (uid: string) => void;
  onOpenChat: (chatId: string) => void;
  profile: UserProfile | null;
}

export const SupplierPulseSlab: React.FC<SupplierPulseSlabProps> = ({ 
  supplier, 
  isRtl, 
  onViewProfile,
  onOpenChat,
  profile
}) => {
  const trustColor = supplier.trustScore && supplier.trustScore >= 80 ? 'emerald' : 'brand';

  return (
    <motion.div
      initial={{ opacity: 0, x: isRtl ? 50 : -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.01 }}
      className="relative w-full mb-6 group"
    >
      {/* Main Slab Container */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-slate-700/30 shadow-2xl flex flex-col md:flex-row items-stretch min-h-[180px]">
        
        {/* Left/Right Accent: Cover Image with Parallax feel */}
        <div className="relative w-full md:w-48 lg:w-64 h-32 md:h-auto overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-brand-teal/20" />
          <img 
            src={supplier.coverUrl || `https://picsum.photos/seed/${supplier.uid}_cover/400/300`}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100"
            referrerPolicy="no-referrer"
          />
          {/* Logo Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 p-1 shadow-2xl border-2 border-white/50">
              {supplier.logoUrl && profile ? (
                <img 
                  src={supplier.logoUrl} 
                  alt={supplier.companyName}
                  className="w-full h-full object-contain rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-brand-primary/10 flex items-center justify-center">
                  <Building2 className="text-brand-primary w-8 h-8" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 flex flex-col justify-between relative">
          {/* Top Row: Name & AI Insight */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-black text-brand-text-main group-hover:text-brand-primary transition-colors">
                  {profile ? (isRtl ? supplier.companyName : (supplier.companyName || supplier.name)) : (isRtl ? 'مورد معتمد' : 'Verified Supplier')}
                </h3>
                {supplier.isVerified && (
                  <div className="p-1 bg-amber-400/10 rounded-full">
                    <ShieldCheck size={16} className="text-amber-500" />
                  </div>
                )}
              </div>
              
              {/* Smart Info Bar */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
                <div className="flex items-center gap-1">
                  <MapPin size={12} className="text-brand-primary" />
                  {profile ? (supplier.location || (isRtl ? 'الموقع غير محدد' : 'Location unknown')) : (isRtl ? 'سجل للمشاهدة' : 'Login to view')}
                </div>
                <span className="w-1 h-1 rounded-full bg-brand-border" />
                <div className="flex items-center gap-1">
                  <Zap size={12} className="text-amber-500" />
                  {isRtl ? 'سرعة الرد:' : 'Response:'} {profile ? (supplier.averageResponseTime || '15') : '??'}m
                </div>
                <span className="w-1 h-1 rounded-full bg-brand-border" />
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-brand-warning fill-brand-warning" />
                  {profile ? (supplier.rating || '4.9') : '?.?'}
                </div>
              </div>
            </div>

            {/* AI Match Score / Badge */}
            {profile && (
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 flex items-center gap-2">
                  <BrainCircuit size={14} className="text-brand-primary" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-brand-text-muted uppercase">{isRtl ? 'توافق ذكي' : 'AI Match'}</span>
                    <span className="text-sm font-black text-brand-primary">98%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Bio Summary */}
          <p className="text-sm text-brand-text-muted mb-6 line-clamp-2 italic">
            {profile ? (isRtl 
              ? (supplier.aiBio?.bioAr || 'مورد متميز بخدمة عملاء سريعة ومنتجات ذات جودة عالية في السوق المحلي.') 
              : (supplier.aiBio?.bioEn || 'Premium supplier with fast customer service and high-quality products in the local market.'))
              : (isRtl ? 'سجل الدخول لرؤية تفاصيل المورد وتقييمات الذكاء الاصطناعي.' : 'Login to view supplier details and AI insights.')}
          </p>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            <HapticButton 
              onClick={() => onViewProfile(supplier.uid)}
              className="flex-1 py-2 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-primary/10 hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5"
            >
              {isRtl ? 'المتجر' : 'Store'}
              {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </HapticButton>
            
            {profile && (
              <HapticButton 
                onClick={() => {
                  if (profile) {
                    const chatId = [profile.uid, supplier.uid].sort().join('_');
                    onOpenChat(chatId);
                  }
                }}
                className="w-10 h-10 bg-white dark:bg-slate-800 border border-brand-border rounded-xl flex items-center justify-center text-brand-text-main hover:text-brand-primary hover:border-brand-primary/20 transition-all"
              >
                <MessageSquare size={16} />
              </HapticButton>
            )}
          </div>
        </div>

        {/* Live Status Indicator (Floating) */}
        {profile && (
          <div className="absolute top-4 right-4 md:right-auto md:left-4 z-20">
            <div className={`px-3 py-1 rounded-full backdrop-blur-md border flex items-center gap-2 ${supplier.isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-500/10 border-slate-500/20 text-slate-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${supplier.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {supplier.isOnline ? (isRtl ? 'نشط' : 'Live') : (isRtl ? 'أوفلاين' : 'Offline')}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
