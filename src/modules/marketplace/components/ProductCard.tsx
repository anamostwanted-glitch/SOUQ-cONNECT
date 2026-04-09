import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, ShieldCheck, Star, MapPin, MoreVertical, Edit2, Trash2, User, Building2, TrendingUp, ShoppingBag, Zap, Clock, Award, Sparkles } from 'lucide-react';
import { MarketplaceItem } from '../../../core/types';
import { BlurImage } from '../../../shared/components/BlurImage';
import { WhatsAppButton } from '../../../shared/components/WhatsAppButton';
import { useTranslation } from 'react-i18next';
import { auth } from '../../../core/firebase';
import { HapticButton } from '../../../shared/components/HapticButton';

interface ProductCardProps {
  item: MarketplaceItem;
  onOpenChat: (sellerId: string) => void;
  onViewDetails: (item: MarketplaceItem) => void;
  onViewProfile?: (uid: string) => void;
  isOwner?: boolean;
  onEdit?: (item: MarketplaceItem) => void;
  onDelete?: (item: MarketplaceItem) => void;
  isAdmin?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onOpenChat,
  onViewDetails,
  onViewProfile,
  isOwner,
  onEdit,
  onDelete,
  isAdmin
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language.startsWith('ar');
  const [showMenu, setShowMenu] = useState(false);

  const displayTitle = isRtl 
    ? (item.titleAr || item.title) 
    : (item.titleEn || item.title);
  
  const displayDescription = isRtl 
    ? (item.descriptionAr || item.description) 
    : (item.descriptionEn || item.description);

  const mainImage = item.images && item.images.length > 0 
    ? item.images[0] 
    : 'https://picsum.photos/seed/product/400/500';

  const glassClass = "bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/30 dark:border-slate-700/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]";

  // Smart Price Logic (Simulated AI Analysis)
  const getPriceStatus = () => {
    if (item.isHighQuality && item.price < 500) return { ar: 'سعر لقطة', en: 'Best Deal', color: 'bg-emerald-500', pulse: true };
    if (item.price > 1000) return { ar: 'فاخر', en: 'Premium', color: 'bg-brand-primary', pulse: false };
    return { ar: 'سعر عادل', en: 'Fair Price', color: 'bg-brand-teal', pulse: false };
  };

  const priceStatus = getPriceStatus();

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`relative rounded-[2.5rem] overflow-hidden cursor-pointer group ${glassClass} transition-all duration-500 ${
        item.sellerRole === 'supplier' 
          ? 'ring-2 ring-brand-primary/10 hover:ring-brand-primary/30' 
          : 'ring-1 ring-brand-border/30 hover:ring-brand-secondary/20'
      }`}
      onClick={() => onViewDetails(item)}
    >
      {/* Image Section (4:5 Aspect Ratio) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <BlurImage 
          src={mainImage}
          alt={displayTitle}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        
        {/* Gradient Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
          <div className="flex flex-col gap-2">
            {item.sellerRole === 'supplier' ? (
              <motion.span 
                animate={{ 
                  boxShadow: ['0 0 0px rgba(var(--brand-primary-rgb), 0)', '0 0 15px rgba(var(--brand-primary-rgb), 0.4)', '0 0 0px rgba(var(--brand-primary-rgb), 0)']
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-brand-primary/80 backdrop-blur-xl text-white text-[10px] font-black shadow-2xl border border-white/20 uppercase tracking-wider relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <ShieldCheck size={12} className="animate-pulse" />
                {isRtl ? 'مورد معتمد' : 'Verified'}
              </motion.span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-brand-secondary/80 backdrop-blur-xl text-white text-[10px] font-black shadow-2xl border border-white/20 uppercase tracking-wider">
                <User size={12} />
                {isRtl ? 'بائع مجتمعي' : 'Community'}
              </span>
            )}
            
            {item.isHighQuality && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/80 backdrop-blur-xl text-white text-[10px] font-black shadow-lg uppercase tracking-wider border border-white/10">
                <Award size={10} className="fill-current" />
                Premium
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <motion.span 
              animate={priceStatus.pulse ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${priceStatus.color}/80 backdrop-blur-xl text-white text-[10px] font-black shadow-lg uppercase tracking-wider border border-white/10`}
            >
              <Sparkles size={10} className={priceStatus.pulse ? 'animate-spin-slow' : ''} />
              {isRtl ? priceStatus.ar : priceStatus.en}
            </motion.span>
            
            {(item.views || 0) > 5 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/80 backdrop-blur-xl text-white text-[10px] font-black shadow-lg uppercase tracking-wider border border-white/10">
                <TrendingUp size={10} />
                {isRtl ? 'رائج' : 'Trending'}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Image Info (Visible on Hover) */}
        <div className="absolute bottom-4 left-4 right-4 z-10 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
          <div className="flex items-center gap-2 text-white/90 text-[10px] font-bold">
            <Clock size={12} />
            <span>{isRtl ? 'استجابة سريعة' : 'Fast Response'}</span>
            <div className="w-1 h-1 rounded-full bg-brand-teal" />
            <span>{isRtl ? 'شحن متاح' : 'Shipping Available'}</span>
          </div>
        </div>
      </div>

      {/* Product Info (Below Image) */}
      <div className="p-5">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-block px-2 py-0.5 rounded-lg bg-brand-primary/5 text-brand-primary text-[9px] font-black uppercase tracking-widest border border-brand-primary/10">
                {item.categories && item.categories.length > 0 ? item.categories[0] : 'General'}
              </span>
              {item.classification && (
                <span className="inline-block px-2 py-0.5 rounded-lg bg-brand-teal/5 text-brand-teal text-[9px] font-black uppercase tracking-widest border border-brand-teal/10">
                  {item.classification}
                </span>
              )}
            </div>
            <h3 className="text-brand-text-main font-black text-lg leading-tight truncate group-hover:text-brand-primary transition-colors duration-300">
              {displayTitle}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <div className="text-brand-primary font-black text-xl tracking-tighter">
              {item.price > 0 ? (
                <>
                  <span className="text-[10px] font-bold opacity-60 mr-1">{item.currency || '$'}</span>
                  {item.price.toLocaleString()}
                </>
              ) : (
                <span className="text-xs uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{isRtl ? 'حسب الطلب' : 'On Demand'}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-brand-text-muted text-[11px] font-medium">
            <MapPin size={12} className="text-brand-primary/60" />
            <span className="truncate max-w-[120px]">{item.location || (isRtl ? 'غير محدد' : 'Not specified')}</span>
          </div>
          
          {item.isOnline && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
              <span className="text-[10px] font-bold text-brand-teal uppercase tracking-widest">{isRtl ? 'متصل' : 'Online'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="p-4 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-brand-border/30">
        <div 
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-all group/seller"
          onClick={(e) => {
            e.stopPropagation();
            if (!auth.currentUser) return;
            onViewProfile?.(item.sellerId);
          }}
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-brand-primary/10 group-hover/seller:scale-110 transition-transform">
              {auth.currentUser ? (item.sellerName || 'S').charAt(0).toUpperCase() : '?'}
            </div>
            {item.isOnline && auth.currentUser && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-teal rounded-full border-2 border-white dark:border-slate-800" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black text-brand-text-main truncate flex items-center gap-1">
              {auth.currentUser ? (item.sellerName || (isRtl ? 'بائع' : 'Seller')) : (isRtl ? 'سجل للمشاهدة' : 'Login to view')}
              {item.sellerRole === 'supplier' && auth.currentUser && (
                <ShieldCheck size={12} className="text-brand-primary fill-brand-primary/10" />
              )}
            </span>
            <span className="text-[9px] font-bold text-brand-text-muted uppercase tracking-tighter">
              {auth.currentUser ? (item.sellerRole === 'supplier' ? (isRtl ? 'مورد معتمد' : 'Verified Supplier') : (isRtl ? 'بائع مجتمعي' : 'Community')) : (isRtl ? 'معلومات البائع' : 'Seller Info')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {auth.currentUser && (
            <>
              <HapticButton 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!auth.currentUser) return;
                  const chatId = [auth.currentUser.uid, item.sellerId].sort().join('_');
                  onOpenChat(chatId);
                }}
                className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white flex items-center justify-center transition-all shadow-sm"
                title={isRtl ? 'محادثة' : 'Chat'}
              >
                <MessageCircle size={20} />
              </HapticButton>
              
              <WhatsAppButton 
                phoneNumber={item.sellerPhone || ''}
                productName={displayTitle}
                productId={item.id}
                className="w-10 h-10 !p-0 rounded-2xl flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
              />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
