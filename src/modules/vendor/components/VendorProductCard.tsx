import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MarketplaceItem, AdAnalytics } from '../../../core/types';
import { BlurImage } from '../../../shared/components/BlurImage';
import { Eye, MousePointer, Edit2, Trash2, RotateCcw, TrendingUp, Zap, Sparkles, MoreVertical, ExternalLink } from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { toast } from 'sonner';

interface VendorProductCardProps {
  item: MarketplaceItem;
  analytics?: AdAnalytics;
  onEdit: (item: MarketplaceItem) => void;
  onDelete: (item: MarketplaceItem) => void;
  onUpdate?: () => void;
  viewMode?: 'grid' | 'list';
}

export const VendorProductCard: React.FC<VendorProductCardProps> = ({ 
  item, 
  analytics, 
  onEdit, 
  onDelete, 
  onUpdate,
  viewMode = 'grid'
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const mainImage = item.images && item.images.length > 0 ? item.images[0] : 'https://picsum.photos/seed/product/400/500';

  const handleRepublish = async () => {
    try {
      await updateDoc(doc(db, 'marketplace', item.id), { 
        status: 'active', 
        createdAt: new Date().toISOString() 
      });
      toast.success(isRtl ? 'تم إعادة نشر الإعلان' : 'Ad republished');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(isRtl ? 'حدث خطأ أثناء إعادة النشر' : 'Error republishing ad');
    }
  };

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]";
  
  // Simulated AI Performance Logic
  const isTrending = (analytics?.views || 0) > 50;
  const isHighConversion = (analytics?.clicks || 0) / (analytics?.views || 1) > 0.1;

  if (viewMode === 'list') {
    return (
      <motion.div 
        layout
        className={`${glassClass} p-4 rounded-3xl flex items-center gap-4 group hover:border-brand-primary/30 transition-all shadow-md hover:shadow-xl`}
      >
        <div className="relative w-20 h-24 shrink-0 overflow-hidden rounded-2xl">
          <BlurImage src={mainImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          {item.status !== 'active' && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-[8px] font-black text-white uppercase tracking-tighter">{isRtl ? 'غير نشط' : 'Inactive'}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-black text-brand-text-main truncate text-sm">{item.title}</h3>
            {isTrending && <Zap size={12} className="text-amber-500 fill-amber-500" />}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-[10px] font-bold text-brand-text-muted">
              <Eye size={12} /> {analytics?.views || 0}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-brand-text-muted">
              <MousePointer size={12} /> {analytics?.clicks || 0}
            </div>
            <div className="text-[10px] font-black text-brand-primary">
              {item.price} {item.currency || (isRtl ? 'ر.س' : 'SAR')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HapticButton onClick={() => onEdit(item)} className="p-2 hover:bg-brand-primary/10 text-brand-primary rounded-none">
            <Edit2 size={16} />
          </HapticButton>
          <HapticButton onClick={() => onDelete(item)} className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-none">
            <Trash2 size={16} />
          </HapticButton>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      layout
      whileHover={{ y: -5 }}
      className={`relative group ${glassClass} rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:border-brand-primary/20 border-2`}
    >
      {/* Neural Aura Glow */}
      <div className={`absolute -inset-1 bg-gradient-to-tr ${item.status === 'active' ? 'from-brand-primary/20 via-brand-teal/20 to-brand-primary/20' : 'from-rose-500/10 to-rose-500/5'} blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

      <div className="relative p-0 flex flex-col">
        {/* Image & Status Badge - 4:5 Aspect Ratio */}
        <div className="relative aspect-[4/5] overflow-hidden bg-brand-background/50">
          <BlurImage src={mainImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10">
            <Badge className={`${item.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'} border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-xl shadow-lg`}>
              {item.status === 'active' ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'غير نشط' : 'Inactive')}
            </Badge>
            {isTrending && (
              <Badge className="bg-amber-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-xl shadow-lg flex items-center gap-1">
                <TrendingUp size={10} /> {isRtl ? 'رائج' : 'Trending'}
              </Badge>
            )}
          </div>

          {/* Quick Action Overlay (Mobile Friendly) */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
            <HapticButton 
              onClick={() => onEdit(item)}
              className="w-12 h-12 bg-white text-brand-primary flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
            >
              <Edit2 size={20} />
            </HapticButton>
            <HapticButton 
              onClick={() => onDelete(item)}
              className="w-12 h-12 bg-white text-rose-500 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
            >
              <Trash2 size={20} />
            </HapticButton>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-black text-brand-text-main text-lg leading-tight line-clamp-2">{item.title}</h3>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-brand-primary">{item.price} {item.currency || (isRtl ? 'ر.س' : 'SAR')}</p>
            </div>
          </div>

          {/* Performance Pulse */}
          <div className="grid grid-cols-2 gap-px bg-brand-border/30 border border-brand-border/30 overflow-hidden">
            <div className="bg-brand-background/30 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-brand-text-muted">
                <Eye size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">{isRtl ? 'مشاهدات' : 'Views'}</span>
              </div>
              <p className="text-sm font-black text-brand-text-main">{analytics?.views || 0}</p>
            </div>
            <div className="bg-brand-background/30 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-brand-text-muted">
                <MousePointer size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">{isRtl ? 'نقرات' : 'Clicks'}</span>
              </div>
              <p className="text-sm font-black text-brand-text-main">{analytics?.clicks || 0}</p>
            </div>
          </div>

          {/* AI Insights Tag */}
          {isHighConversion && (
            <div className="flex items-center gap-2 text-[9px] font-black text-brand-teal bg-brand-teal/5 p-2 border border-brand-teal/10">
              <Sparkles size={10} />
              {isRtl ? 'أداء ممتاز: معدل تحويل مرتفع' : 'Excellent Performance: High Conversion'}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-brand-border/30">
            <span className="text-[9px] font-bold text-brand-text-muted">
              {isRtl ? 'نشر في:' : 'Published:'} {new Date(item.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
            </span>
            {item.status !== 'active' && (
              <HapticButton 
                onClick={handleRepublish}
                className="flex items-center gap-2 text-[9px] font-black text-brand-primary hover:bg-brand-primary/10 px-3 py-1.5 transition-all"
              >
                <RotateCcw size={12} />
                {isRtl ? 'إعادة نشر' : 'Republish'}
              </HapticButton>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
    {children}
  </div>
);
