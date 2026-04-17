import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MarketplaceItem, UserProfile } from '../../../core/types';
import { BlurImage } from '../../../shared/components/BlurImage';
import { Flag, Loader2 } from 'lucide-react';
import { ReportModal } from '../../../shared/components/ReportModal';
import { auth, db } from '../../../core/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
        // هنا يمكن إضافة منطق لتحديث حالة الإعلان إلى 'expired' في Firestore
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
    <div className="text-[8px] md:text-[10px] font-black text-white bg-black/50 px-1.5 md:px-2 py-1 rounded-none whitespace-nowrap">
      {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
    </div>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onViewDetails,
  onEdit,
  isOwner,
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [showReportModal, setShowReportModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (auth.currentUser) {
      getDoc(doc(db, 'users', auth.currentUser.uid)).then(snap => {
        if (snap.exists()) setUserProfile(snap.data() as UserProfile);
      });
    }
  }, []);

  const mainImage = item.images && item.images.length > 0 ? item.images[0] : 'https://picsum.photos/seed/product/400/500';

  return (
    <motion.div 
      layout
      whileHover={{ y: -4 }}
      className="relative flex flex-col overflow-hidden cursor-pointer group bg-brand-surface border border-brand-border rounded-none shadow-sm hover:shadow-xl transition-all duration-300"
      onClick={() => onViewDetails(item)}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-brand-background">
        <BlurImage src={mainImage} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        
        {/* Title & Price Overlay (Hidden on mobile, visible on desktop) */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent hidden md:flex flex-col justify-end z-10">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-white font-bold text-[13px] line-clamp-1 leading-tight flex-1">
              {isRtl ? (item.titleAr || item.title) : (item.titleEn || item.title)}
            </h3>
            <span className="text-brand-primary font-black text-[12px] shrink-0 bg-white/10 backdrop-blur-md px-2 py-1 rounded-none">
              {item.price} {item.currency || 'SAR'}
            </span>
          </div>
        </div>

        {!isOwner && auth.currentUser && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowReportModal(true);
            }}
            className="absolute top-3 left-3 p-2 bg-black/20 backdrop-blur-md text-white rounded-none border border-white/20 hover:bg-brand-error transition-all opacity-0 group-hover:opacity-100 z-20"
          >
            <Flag size={14} />
          </button>
        )}
      </div>

      {/* ONLY the counter below image - Visible on all devices */}
      <div className="p-3 md:p-4 flex flex-col items-center justify-center gap-3">
        <CountdownRing item={item} />
        
        {item.status === 'expired' && isOwner && onEdit && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit({ ...item, status: 'active', expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() }); }}
            className="w-full py-2 bg-brand-primary text-white text-[10px] font-black uppercase rounded-none shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all"
          >
            {isRtl ? 'إعادة نشر المنتج' : 'Relist Product'}
          </button>
        )}
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
