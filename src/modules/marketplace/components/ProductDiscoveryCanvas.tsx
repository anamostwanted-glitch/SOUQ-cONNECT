import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MarketplaceItem, UserProfile, Category, SiteSettings } from '../../../core/types';
import { Heart, Share2, Info, ShieldCheck, Tag, Star, Zap, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../../../core/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

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
    <div className="w-full">
      {/* Adaptive Neural Grid */}
      <div 
        className="grid gap-2 p-2" 
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
              className={`relative overflow-hidden cursor-pointer group rounded-2xl ${isSpan2 ? 'col-span-2 aspect-[16/10]' : 'col-span-1 aspect-[8/10]'}`}
              onClick={() => handleItemClick(item)}
              whileHover={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <img
                src={item.images?.[0] || 'https://picsum.photos/seed/product/400/600'}
                alt={isRtl ? item.titleAr : item.titleEn}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              
              {/* Glassmorphism Overlay - Hidden on mobile */}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex flex-col justify-end">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-white font-bold text-sm line-clamp-1">
                      {isRtl ? item.titleAr : item.titleEn}
                    </p>
                    <p className="text-brand-primary font-black text-lg">
                      ${item.price}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onLike?.(item.id); }}
                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-brand-primary hover:text-white transition-colors"
                  >
                    <Heart size={14} />
                  </button>
                </div>
                
                {/* Status Badge */}
                {item.status === 'active' && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-300 text-[10px] font-bold uppercase tracking-wider">
                    {isRtl ? 'متاح' : 'Available'}
                  </div>
                )}
                {isSpan2 && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-brand-primary/20 backdrop-blur-md border border-brand-primary/30 text-brand-primary text-[10px] font-bold flex items-center gap-1">
                    <Zap size={10} />
                    {isRtl ? 'مميز' : 'Featured'}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
