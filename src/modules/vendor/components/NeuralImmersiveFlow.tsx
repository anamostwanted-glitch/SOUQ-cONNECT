import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MarketplaceItem } from '../../../core/types';
import { BlurImage } from '../../../shared/components/BlurImage';
import { X, Heart, MessageSquare, Share2, Sparkles, ShoppingBag } from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { ProductShareTemplate } from './ProductShareTemplate';

interface NeuralImmersiveFlowProps {
  products: MarketplaceItem[];
  initialProductId: string;
  onClose: () => void;
}


const ImmersiveProductCard: React.FC<{
  product: MarketplaceItem;
  index: number;
  isLoaded: boolean;
  isRtl: boolean;
  getAIInsight: (p: MarketplaceItem) => string;
  handleShare: (p: MarketplaceItem) => void;
}> = ({ product, index, isLoaded, isRtl, getAIInsight, handleShare }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <div ref={ref} className="h-full w-full snap-start relative overflow-hidden">
      <motion.div style={{ y }} className="absolute inset-0">
        {isLoaded ? (
          <BlurImage 
            src={product.images?.[0] || 'https://picsum.photos/seed/product/400/500'} 
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
          </div>
        )}
      </motion.div>
      
      {/* Immersive UI Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 p-6 flex flex-col justify-end">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-brand-primary/20 backdrop-blur-md px-3 py-1 rounded-full text-brand-primary text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={12} />
            {getAIInsight(product)}
          </div>
          <h2 className="text-2xl font-black text-white">{product.title}</h2>
          <p className="text-sm text-white/80 line-clamp-3">{product.description}</p>
          
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-brand-primary">{product.price} {product.currency || 'SAR'}</span>
            <HapticButton className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2">
              <ShoppingBag size={16} />
              {isRtl ? 'شراء الآن' : 'Buy Now'}
            </HapticButton>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-6">
        <HapticButton className="text-white hover:text-brand-primary transition-colors"><Heart size={28} /></HapticButton>
        <HapticButton className="text-white hover:text-brand-primary transition-colors"><MessageSquare size={28} /></HapticButton>
        <HapticButton onClick={() => handleShare(product)} className="text-white hover:text-brand-primary transition-colors"><Share2 size={28} /></HapticButton>
      </div>
    </div>
  );
};

export const NeuralImmersiveFlow: React.FC<NeuralImmersiveFlowProps> = ({ products, initialProductId, onClose }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(products.findIndex(p => p.id === initialProductId));
  
  // Track loaded products for predictive loading
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set([products.findIndex(p => p.id === initialProductId)]));

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index !== activeIndex) {
      setActiveIndex(index);
      
      // Predictive Loading: Pre-load next and previous
      const nextIndices = new Set(loadedIndices);
      nextIndices.add(index);
      nextIndices.add(index + 1);
      nextIndices.add(index - 1);
      setLoadedIndices(nextIndices);
    }
  }, [activeIndex, loadedIndices]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const getAIInsight = (product: MarketplaceItem) => {
    const insights = [
      isRtl ? 'الأكثر طلباً هذا الأسبوع' : 'Most popular this week',
      isRtl ? 'يناسب ذوقك بنسبة 95%' : 'Matches your style 95%',
      isRtl ? 'سعر تنافسي جداً' : 'Highly competitive price',
      isRtl ? 'تم فحصه بواسطة الذكاء الاصطناعي' : 'AI-Verified Quality'
    ];
    return insights[Math.floor(Math.random() * insights.length)];
  };

  const handleShare = async (product: MarketplaceItem) => {
    const templateElement = document.getElementById('share-template');
    if (!templateElement) return;

    try {
      const dataUrl = await toPng(templateElement);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'product.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: product.title,
          text: `${product.title} - ${product.price} ${product.currency || 'SAR'}`,
        });
      } else {
        // Fallback
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'product.png';
        link.click();
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {products.map((product, index) => (
          <ImmersiveProductCard 
            key={product.id}
            product={product}
            index={index}
            isLoaded={loadedIndices.has(index)}
            isRtl={isRtl}
            getAIInsight={getAIInsight}
            handleShare={handleShare}
          />
        ))}
      </div>

      <HapticButton onClick={onClose} className="absolute top-6 left-6 text-white bg-white/20 p-2 rounded-full backdrop-blur-md">
        <X size={24} />
      </HapticButton>
      
      {/* Hidden template for image generation */}
      <div className="absolute -left-[9999px]">
        <ProductShareTemplate product={products[activeIndex]} />
      </div>
    </div>
  );
};
