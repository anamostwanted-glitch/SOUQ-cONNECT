import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MarketplaceItem, UserProfile, Category, SiteSettings } from '../../../core/types';
import { Heart, Share2, Info, ShieldCheck, Tag, Star, Zap, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../../../core/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface ProductDiscoveryCanvasProps {
  items: MarketplaceItem[];
  categories: Category[];
  onLike?: (itemId: string) => void;
  onShare?: (item: MarketplaceItem) => void;
  onSelectItem: (item: MarketplaceItem) => void;
}

export const ProductDiscoveryCanvas: React.FC<ProductDiscoveryCanvasProps> = ({
  items,
  categories,
  onLike,
  onShare,
  onSelectItem
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as SiteSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
    });
    return () => unsub();
  }, []);

  const handleItemClick = (item: MarketplaceItem) => {
    onSelectItem(item);
  };

  // Adaptive Grid Logic
  const { cols, itemsWithSpans } = useMemo(() => {
    const isMobile = windowWidth < 768;
    const defaultMobileCols = 2;
    const defaultWebCols = 4;
    
    let currentCols = isMobile ? defaultMobileCols : defaultWebCols;
    
    if (settings?.gridSettings) {
      if (settings.gridSettings.aiAutoPilot) {
        // AI Auto-Pilot: Adjust based on screen size and item count
        if (isMobile) {
          currentCols = items.length > 10 ? 2 : 1;
        } else {
          currentCols = windowWidth > 1400 ? 5 : windowWidth > 1024 ? 4 : 3;
        }
      } else {
        currentCols = isMobile ? settings.gridSettings.mobileCols : settings.gridSettings.webCols;
      }
    }

    // Calculate spans for Bento/Masonry hybrid
    const mappedItems = items.map((item, index) => {
      // AI Logic: Highlight items with high views, likes, or randomly for visual rhythm
      const isFeatured = (item.views && item.views > 100) || index % 7 === 0;
      // On mobile, if cols=1, no span. If cols=2, span 2 occasionally.
      const span = isFeatured && currentCols > 1 ? 2 : 1;
      
      return { ...item, span };
    });

    return { cols: currentCols, itemsWithSpans: mappedItems };
  }, [items, settings, windowWidth]);

  return (
    <div className="w-full h-full pb-20">
      {/* Adaptive Neural Grid */}
      <div 
        className="grid gap-3 p-3" 
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoFlow: 'dense'
        }}
      >
        {itemsWithSpans.map((item, index) => {
          const isSpan2 = item.span === 2;
          
          return (
            <motion.div
              key={item.id}
              layoutId={`product-${item.id}`}
              className={`relative overflow-hidden cursor-pointer group rounded-3xl shadow-lg ${isSpan2 ? 'col-span-2 aspect-[16/10]' : 'col-span-1 aspect-[9/16]'}`}
              onClick={() => handleItemClick(item)}
              whileHover={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <img
                src={item.images?.[0] || 'https://picsum.photos/seed/product/400/600'}
                alt={isRtl ? item.titleAr : item.titleEn}
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              
              {/* Mobile-optimized Overlay */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end">
                <p className="text-white font-black text-base line-clamp-1">
                  {isRtl ? item.titleAr : item.titleEn}
                </p>
                <p className="text-brand-primary font-black text-xl">
                  ${item.price}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
