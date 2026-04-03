import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, ShieldCheck, Star, MapPin, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { MarketplaceItem } from '../../../core/types';
import { BlurImage } from '../../../shared/components/BlurImage';
import { WhatsAppButton } from '../../../shared/components/WhatsAppButton';
import { useTranslation } from 'react-i18next';

interface ProductCardProps {
  item: MarketplaceItem;
  onOpenChat: (sellerId: string) => void;
  onViewDetails: (item: MarketplaceItem) => void;
  isOwner?: boolean;
  onEdit?: (item: MarketplaceItem) => void;
  onDelete?: (item: MarketplaceItem) => void;
  isAdmin?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onOpenChat,
  onViewDetails,
  isOwner,
  onEdit,
  onDelete,
  isAdmin
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [showMenu, setShowMenu] = useState(false);

  const mainImage = item.images && item.images.length > 0 
    ? item.images[0] 
    : 'https://picsum.photos/seed/product/400/500';

  const glassClass = "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-sm";

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={`relative rounded-3xl overflow-hidden cursor-pointer group ${glassClass}`}
      onClick={() => onViewDetails(item)}
    >
      {/* Image Section (4:5 Aspect Ratio) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <BlurImage 
          src={mainImage}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
          <div className="flex flex-col gap-2">
            {item.isHighQuality && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white text-xs font-bold shadow-lg">
                <Star size={12} className="fill-current" />
                HQ
              </span>
            )}
            {item.isVerifiedSupplier && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/90 backdrop-blur-md text-white text-xs font-bold shadow-lg">
                <ShieldCheck size={12} />
                {isRtl ? 'موثق' : 'Verified'}
              </span>
            )}
          </div>

          {/* Admin / Owner Actions */}
          {(isOwner || isAdmin) && (
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className={`absolute top-full mt-2 ${isRtl ? 'left-0' : 'right-0'} w-36 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-20`}
                  >
                    {onEdit && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onEdit(item);
                        }}
                        className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
                      >
                        <Edit2 size={14} />
                        {isRtl ? 'تعديل' : 'Edit'}
                      </button>
                    )}
                    {onDelete && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onDelete(item);
                        }}
                        className="w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-700"
                      >
                        <Trash2 size={14} />
                        {isRtl ? 'حذف' : 'Delete'}
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Product Info (Below Image) */}
      <div className="p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <span className="inline-block px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary text-[10px] font-bold mb-1.5 uppercase tracking-wider">
              {item.category}
            </span>
            <h3 className="text-brand-text-main font-bold text-base leading-tight truncate group-hover:text-brand-primary transition-colors">
              {item.title}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <div className="text-brand-primary font-black text-lg">
              {item.price > 0 ? (
                <>
                  <span className="text-xs font-medium opacity-80 mr-1">{item.currency || '$'}</span>
                  {item.price.toLocaleString()}
                </>
              ) : (
                <span className="text-xs uppercase tracking-wider">{isRtl ? 'حسب الطلب' : 'On Demand'}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-brand-text-muted text-xs">
          <MapPin size={12} />
          <span className="truncate">{item.location || (isRtl ? 'غير محدد' : 'Not specified')}</span>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="p-3 flex items-center justify-between gap-2 bg-white/40 dark:bg-slate-900/40">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
            {item.sellerName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-brand-text-main truncate">
            {item.sellerName}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat(item.sellerId);
            }}
            className="w-9 h-9 rounded-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white flex items-center justify-center transition-colors"
            title={isRtl ? 'محادثة' : 'Chat'}
          >
            <MessageCircle size={18} />
          </button>
          
          <WhatsAppButton 
            phoneNumber={item.sellerPhone || ''}
            productName={item.title}
            productId={item.id}
            className="w-9 h-9 !p-0 rounded-full flex items-center justify-center"
          />
        </div>
      </div>
    </motion.div>
  );
};
