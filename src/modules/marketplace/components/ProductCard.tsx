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

const CountdownRing = ({ createdAt }: { createdAt: string }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const timer = setInterval(() => {
      const created = new Date(createdAt).getTime();
      const expiry = created + (10 * 24 * 60 * 60 * 1000);
      const now = new Date().getTime();
      const total = 10 * 24 * 60 * 60 * 1000;
      const remaining = expiry - now;
      setProgress(Math.max(0, (remaining / total) * 100));
    }, 60000);
    return () => clearInterval(timer);
  }, [createdAt]);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-12 h-12">
      <svg className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/30" />
        <motion.circle 
          cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="3" 
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-white"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">
        {Math.round(progress / 10)}d
      </div>
    </div>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onViewDetails,
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
        <CountdownRing createdAt={item.createdAt} />
      </div>
    </motion.div>
  );
};
