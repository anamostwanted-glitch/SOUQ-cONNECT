import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MarketplaceItem } from '../../../core/types';
import { BlurImage } from '../../../shared/components/BlurImage';

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
    <div className="text-[10px] font-black text-white bg-black/50 px-2 py-1 rounded-lg">
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
  const mainImage = item.images && item.images.length > 0 ? item.images[0] : 'https://picsum.photos/seed/product/400/500';

  const glassClass = "bg-white/10 backdrop-blur-md shadow-xl";

  return (
    <motion.div 
      layout
      whileHover={{ scale: 1.02 }}
      className={`relative aspect-[4/5] overflow-hidden cursor-pointer group ${glassClass} transition-all duration-300`}
      onClick={() => onViewDetails(item)}
    >
      <BlurImage src={mainImage} alt={item.title} className="w-full h-full object-cover" />
      <div className="absolute top-3 right-3">
        <CountdownRing item={item} />
      </div>
      {item.status === 'expired' && isOwner && onEdit && (
        <div className="absolute bottom-3 left-3 right-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit({ ...item, status: 'active', expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() }); }}
            className="w-full py-2 bg-brand-primary text-white text-[10px] font-black uppercase rounded-lg"
          >
            إعادة نشر
          </button>
        </div>
      )}
    </motion.div>
  );
};
