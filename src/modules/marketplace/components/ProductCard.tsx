import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MarketplaceItem, UserProfile } from '../../../core/types';
import { BlurImage } from '../../../shared/components/BlurImage';
import { Camera, Flag, Loader2, Play, ShieldCheck, Sparkles, TrendingUp, Zap, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { ReportModal } from '../../../shared/components/ReportModal';
import { auth, db } from '../../../core/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useGlobalMarket } from '../../../core/providers/GlobalMarketProvider';
import { useSettings } from '../../../core/providers/SettingsProvider';

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

const CountdownRing = ({ item }: { item: MarketplaceItem }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const expiry = item.expiryDate 
        ? new Date(item.expiryDate).getTime() 
        : new Date(item.createdAt).getTime() + (10 * 24 * 60 * 60 * 1000);
      const now = new Date().getTime();
      const remaining = expiry - now;

      if (remaining <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [item]);

  return (
    <div className="text-[10px] font-black text-brand-text-muted bg-brand-background px-2 py-1 border border-brand-border flex items-center gap-1.5 whitespace-nowrap">
      <Zap size={10} className="text-brand-primary" />
      {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
      <span>{timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s</span>
    </div>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onViewDetails,
  onEdit,
  isOwner,
}) => {
  const { i18n, t } = useTranslation();
  const { exchangeRate, currency } = useGlobalMarket();
  const { settings } = useSettings();
  const isRtl = i18n.language === 'ar';
  const [showReportModal, setShowReportModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isFullBleed = settings?.gridSettings?.fullBleedMobile && windowWidth < 768;
  const isSpeedMode = settings?.gridSettings?.performanceMode === 'speed';

  useEffect(() => {
    if (auth.currentUser) {
      getDoc(doc(db, 'users', auth.currentUser.uid)).then(snap => {
        if (snap.exists()) setUserProfile(snap.data() as UserProfile);
      });
    }
  }, []);

  const mainImage = item.images && item.images.length > 0 ? item.images[0] : 'https://picsum.photos/seed/product/400/500';
  const displayTitle = isRtl ? (item.titleAr || item.title) : (item.titleEn || item.title);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}?view=marketplace&itemId=${item.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: displayTitle,
        text: isRtl ? `شاهد هذا المنتج على سوق كونيكت: ${displayTitle}` : `Check out this product on Souq Connect: ${displayTitle}`,
        url: shareUrl,
      }).catch(err => console.log('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success(isRtl ? 'تم نسخ الرابط!' : 'Link copied to clipboard!');
    }
  };

  return (
    <motion.div 
      layout
      whileHover={{ y: isFullBleed ? 0 : -4 }}
      className={`relative flex flex-col overflow-hidden cursor-pointer group transition-all duration-300 ${
        isFullBleed 
          ? 'bg-black border-none' 
          : 'bg-brand-surface border-2 border-brand-border hover:border-brand-primary'
      }`}
      onClick={() => onViewDetails(item)}
    >
      <div className={`relative aspect-[4/5] overflow-hidden bg-brand-background`}>
        <BlurImage 
          src={mainImage} 
          alt={displayTitle} 
          className={`w-full h-full object-cover transition-transform duration-1000 ${!isSpeedMode ? 'group-hover:scale-110' : ''}`} 
          referrerPolicy="no-referrer"
        />
        
        {/* Badges Overlay - Always show certain badges in full bleed but minimal */}
        <div className={`absolute ${isFullBleed ? 'top-2 left-2' : 'top-3 left-3'} ${isFullBleed ? 'flex' : 'hidden md:flex'} flex-col gap-1.5 z-20`}>
          {item.isVerifiedSupplier && (
            <motion.div 
              initial={isSpeedMode ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`${isFullBleed ? 'bg-brand-primary p-1 rounded-sm' : 'bg-brand-primary text-white p-2 border border-white/20'}`}
              title={isRtl ? 'مورد موثق' : 'Verified Supplier'}
            >
              <ShieldCheck size={isFullBleed ? 12 : 14} className="text-white" />
            </motion.div>
          )}
        </div>

        {/* View Count Badge - Desktop Only */}
        {item.views !== undefined && item.views > 10 && (
          <div className="absolute top-3 right-3 hidden md:flex bg-black/40 backdrop-blur-md px-2 py-1 flex items-center gap-1.5 text-[10px] font-black text-white border border-white/10">
            <TrendingUp size={10} className="text-emerald-400" />
            {item.views}
          </div>
        )}

        {/* Action Buttons Overlay - Desktop Only */}
        <div className="absolute bottom-3 right-3 hidden md:flex items-center gap-2 z-20">
          <button
            onClick={handleShare}
            className="p-2 bg-white/20 backdrop-blur-md text-white border border-white/20 hover:bg-brand-primary transition-all rounded-lg opacity-0 group-hover:opacity-100"
            title={isRtl ? 'مشاركة' : 'Share'}
          >
            <Share2 size={14} />
          </button>
          {!isOwner && auth.currentUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowReportModal(true);
              }}
              className="p-2 bg-white/20 backdrop-blur-md text-white border border-white/20 hover:bg-brand-error transition-all rounded-lg opacity-0 group-hover:opacity-100"
              title={isRtl ? 'إبلاغ' : 'Report'}
            >
              <Flag size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Information Area - Desktop Only/Standard */}
      <div className="hidden md:flex p-4 md:p-5 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-brand-text-main font-black text-sm md:text-base line-clamp-1 leading-tight group-hover:text-brand-primary transition-colors">
            {displayTitle}
          </h3>
          <div className="flex items-center justify-between">
            <div className="text-brand-primary font-black text-base md:text-lg flex flex-col items-start leading-none">
              <div className="flex items-baseline gap-1">
                {(item.price * (currency === item.currency ? 1 : exchangeRate)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{currency}</span>
              </div>
              {currency !== item.currency && (
                <span className="text-[8px] font-bold text-brand-text-muted/60 uppercase mt-0.5">
                  ≈ {item.price.toLocaleString()} {item.currency}
                </span>
              )}
            </div>
            <CountdownRing item={item} />
          </div>
        </div>

        {(item.status === 'expired' && isOwner && onEdit) ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit({ ...item, status: 'active', expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() }); }}
            className="w-full py-3 bg-brand-primary text-white text-[10px] font-black uppercase shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            {isRtl ? 'إعادة نشر المنتج' : 'Relist Product'}
          </button>
        ) : (
          <div className="pt-2 border-t border-brand-border flex items-center justify-end">
            <div className="text-[10px] font-bold text-brand-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              {isRtl ? 'التفاصيل' : 'Details'}
              <Play size={8} className="fill-current" />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Only: Hidden Info Overlay (User requested to remove info from images on mobile) */}
      <div className="hidden md:flex absolute inset-0 z-30 pointer-events-none flex flex-col justify-end p-3">
        {/* Scrim hidden on mobile to show raw image */}
      </div>

      
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetId={item.id}
        targetType="marketplace_item"
        targetOwnerId={item.sellerId}
        targetTitle={item.titleAr || item.title}
        profile={userProfile}
        isRtl={true} // Defaulting to true for Arabic context as per user preference
      />
    </motion.div>
  );
};
