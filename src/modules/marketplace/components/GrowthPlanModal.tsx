import React from 'react';
import { motion } from 'framer-motion';
import { X, Zap, TrendingUp, Target, Search, Globe, CheckCircle2, ArrowRight } from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { Category } from '../../../core/types';

interface GrowthPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  category: Category;
  seoData: {
    slug: string;
    metaTitleAr: string;
    metaTitleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    seoKeywords: string[];
    schemaType: string;
    strategyAr: string;
    strategyEn: string;
  };
  isRtl: boolean;
}

export const GrowthPlanModal: React.FC<GrowthPlanModalProps> = ({
  isOpen,
  onClose,
  onApply,
  category,
  seoData,
  isRtl
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-background/80 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-brand-border flex items-center justify-between bg-brand-primary/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-brand-text-main">
                {isRtl ? 'خطة النمو الاستراتيجي' : 'Strategic Growth Plan'}
              </h3>
              <p className="text-xs text-brand-text-muted font-bold tracking-widest uppercase mt-1">
                {isRtl ? category.nameAr : category.nameEn}
              </p>
            </div>
          </div>
          <HapticButton 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-brand-background border border-brand-border flex items-center justify-center text-brand-text-main hover:bg-brand-surface"
          >
            <X size={20} />
          </HapticButton>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8 custom-scrollbar">
          {/* Strategy Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-brand-primary">
              <Target size={18} />
              <h4 className="text-sm font-black uppercase tracking-widest">
                {isRtl ? 'استراتيجية الاستحواذ' : 'Acquisition Strategy'}
              </h4>
            </div>
            <div className="p-6 bg-brand-background rounded-3xl border border-brand-border relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Target size={80} />
              </div>
              <p className="text-sm text-brand-text-main leading-relaxed font-medium whitespace-pre-wrap relative z-10">
                {isRtl ? seoData.strategyAr : seoData.strategyEn}
              </p>
            </div>
          </section>

          {/* SEO Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand-teal">
                <Search size={18} />
                <h4 className="text-sm font-black uppercase tracking-widest">
                  {isRtl ? 'عناوين البحث (SEO)' : 'SEO Titles'}
                </h4>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-brand-background rounded-2xl border border-brand-border">
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase mb-1">AR</p>
                  <p className="text-xs font-black text-brand-text-main">{seoData.metaTitleAr}</p>
                </div>
                <div className="p-4 bg-brand-background rounded-2xl border border-brand-border">
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase mb-1">EN</p>
                  <p className="text-xs font-black text-brand-text-main">{seoData.metaTitleEn}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-brand-amber">
                <Globe size={18} />
                <h4 className="text-sm font-black uppercase tracking-widest">
                  {isRtl ? 'الرابط الدائم' : 'Permanent Slug'}
                </h4>
              </div>
              <div className="p-4 bg-brand-background rounded-2xl border border-brand-border h-full flex items-center">
                <p className="text-xs font-mono font-bold text-brand-primary">/{seoData.slug}</p>
              </div>
            </div>
          </div>

          {/* Keywords */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-brand-primary">
              <Zap size={18} />
              <h4 className="text-sm font-black uppercase tracking-widest">
                {isRtl ? 'الكلمات المفتاحية المستهدفة' : 'Targeted SEO Keywords'}
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {seoData.seoKeywords.map((tag, i) => (
                <span 
                  key={i}
                  className="px-4 py-2 bg-brand-primary/5 border border-brand-primary/10 rounded-xl text-xs font-bold text-brand-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          {/* Description Preview */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-brand-text-muted">
              <CheckCircle2 size={18} />
              <h4 className="text-sm font-black uppercase tracking-widest">
                {isRtl ? 'وصف محرّكات البحث' : 'Meta Descriptions'}
              </h4>
            </div>
            <div className="space-y-4">
               <div className="p-5 bg-brand-surface border border-brand-border rounded-2xl">
                 <p className="text-xs text-brand-text-main leading-relaxed italic">
                   {isRtl ? seoData.descriptionAr : seoData.descriptionEn}
                 </p>
               </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-brand-border bg-brand-background flex items-center gap-4">
          <HapticButton 
            onClick={onClose}
            className="flex-1 py-4 bg-brand-surface text-brand-text-main border border-brand-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-background transition-all"
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </HapticButton>
          <HapticButton 
            onClick={onApply}
            className="flex-[2] py-4 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all"
          >
            <Zap size={16} />
            {isRtl ? 'اعتماد خطة النمو' : 'Apply Growth Plan'}
            <ArrowRight size={16} className={isRtl ? 'rotate-180' : ''} />
          </HapticButton>
        </div>
      </motion.div>
    </div>
  );
};
