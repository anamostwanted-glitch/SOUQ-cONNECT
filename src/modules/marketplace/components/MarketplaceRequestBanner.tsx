import React from 'react';
import { motion } from 'motion/react';
import { Zap, Plus, Sparkles, Send } from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { useTranslation } from 'react-i18next';

interface MarketplaceRequestBannerProps {
  onPostClick: () => void;
  requests: any[];
}

export const MarketplaceRequestBanner: React.FC<MarketplaceRequestBannerProps> = ({ 
  onPostClick,
  requests 
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const openRequestsCount = requests.filter(r => r.status === 'open').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-brand-primary rounded-[2.5rem] p-8 shadow-2xl shadow-brand-primary/20 mb-8"
    >
      {/* Decorative Orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white mb-4 border border-white/20">
            <Sparkles size={12} />
            {isRtl ? 'ذكاء اصطناعي تفاعلي' : 'AI-POWERED DEMAND'}
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight tracking-tight">
            {isRtl ? 'اطلب ما تحتاجه الآن' : 'Request what you need'}
            <br />
            {isRtl ? 'ودع الموردين يجدونك' : 'And let suppliers find you'}
          </h2>
          <p className="text-white/80 font-medium max-w-lg mb-6">
            {isRtl 
              ? 'هل تبحث عن منتج أو خدمة محددة؟ انشر طلبك الآن وسيقوم الموردون بتقديم أفضل عروضهم لك في دقائق.'
              : 'Looking for a specific product or service? Post your request now and suppliers will send you their best offers in minutes.'}
          </p>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
              <Zap size={18} className="text-brand-teal" />
              <span className="text-sm font-bold text-white">
                {openRequestsCount || 0} {isRtl ? 'طلب مفتوح حالياً' : 'Current Open Requests'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
              <Send size={18} className="text-brand-teal" />
              <span className="text-sm font-bold text-white">
                {isRtl ? 'استجابة سريعة' : 'Fast Response'}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <HapticButton 
            onClick={onPostClick}
            className="group relative flex items-center gap-3 bg-white text-brand-primary px-8 py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-tighter shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            {isRtl ? 'نشر طلب جديد' : 'Post New Request'}
          </HapticButton>
        </div>
      </div>
    </motion.div>
  );
};
