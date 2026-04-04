import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MapPin, 
  Calendar, 
  MessageCircle, 
  MessageSquare,
  Phone, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Share2,
  Heart,
  Tag,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import { MarketplaceItem } from '../../core/types';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  getDoc 
} from 'firebase/firestore';
import { db, auth } from '../../core/firebase';
import { handleFirestoreError, OperationType } from '../../core/utils/errorHandling';
import { BlurImage } from './BlurImage';
import { HapticButton } from './HapticButton';
import { WhatsAppButton } from './WhatsAppButton';

interface ProductDetailsModalProps {
  item: MarketplaceItem | null;
  onClose: () => void;
  onContactSeller: (item: MarketplaceItem) => void;
  onViewProfile: (uid: string) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  item,
  onClose,
  onContactSeller,
  onViewProfile
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language.startsWith('ar');
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = React.useState(false);

  const displayTitle = isRtl 
    ? (item?.titleAr || item?.title) 
    : (item?.titleEn || item?.title);
  
  const displayDescription = isRtl 
    ? (item?.descriptionAr || item?.description) 
    : (item?.descriptionEn || item?.description);

  React.useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!auth.currentUser || !item) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsFavorite(userData.favoriteProducts?.includes(item.id) || false);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };
    checkFavoriteStatus();
  }, [item]);

  const handleToggleFavorite = async () => {
    if (!auth.currentUser || !item || isTogglingFavorite) return;
    
    setIsTogglingFavorite(true);
    const userRef = doc(db, 'users', auth.currentUser.uid);
    
    try {
      if (isFavorite) {
        await updateDoc(userRef, {
          favoriteProducts: arrayRemove(item.id)
        });
        setIsFavorite(false);
      } else {
        await updateDoc(userRef, {
          favoriteProducts: arrayUnion(item.id)
        });
        setIsFavorite(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleShare = async () => {
    if (!item) return;
    
    const shareData = {
      title: displayTitle || '',
      text: displayDescription || '',
      url: `${window.location.origin}?product=${item.id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(shareData.url);
      alert(isRtl ? 'تم نسخ الرابط' : 'Link copied to clipboard');
    }
  };

  if (!item) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-[95%] sm:w-full max-w-5xl h-auto max-h-[90vh] sm:rounded-[32px] rounded-[24px] overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
        >
          {/* Close Button (Mobile) */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/20 backdrop-blur-md hover:bg-black/40 rounded-full text-white transition-all md:hidden"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Image Section */}
          <div className="w-full md:w-3/5 bg-slate-100 relative group aspect-[4/5] md:aspect-auto">
            <div className="w-full h-full relative overflow-hidden md:absolute md:inset-0">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={currentImageIndex}
                  src={item.images[currentImageIndex]} 
                  alt={displayTitle}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
            </div>

            {/* Image Navigation */}
            {item.images.length > 1 && (
              <>
                <button 
                  onClick={() => setCurrentImageIndex(prev => (prev - 1 + item.images.length) % item.images.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setCurrentImageIndex(prev => (prev + 1) % item.images.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                
                {/* Dots */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {item.images.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Badges */}
            <div className="absolute top-6 left-6 flex flex-col gap-2">
              {item.isVerifiedSupplier && (
                <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                  {t('verified_supplier', 'Verified')}
                </div>
              )}
              {item.isHighQuality && (
                <div className="bg-brand-primary text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-brand-primary/20">
                  <Sparkles className="w-4 h-4" />
                  {t('hq_product', 'HQ Product')}
                </div>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="w-full md:w-2/5 p-6 sm:p-10 overflow-y-auto flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-6">
              <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold uppercase tracking-widest">
                {item.categories && item.categories.length > 0 ? item.categories[0] : ''}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={handleShare}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                {auth.currentUser && (
                  <button 
                    onClick={handleToggleFavorite}
                    disabled={isTogglingFavorite}
                    className={`p-2 rounded-full transition-colors ${
                      isFavorite 
                        ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                )}
                <button onClick={onClose} className="hidden sm:block p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2 leading-tight">{displayTitle}</h1>
            <div className="text-4xl font-black text-brand-primary mb-8 flex items-baseline gap-2">
              {item.price}
              <span className="text-lg font-bold text-slate-400">{item.currency}</span>
            </div>

            <div className="space-y-8 mb-10">
              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  {t('item_description', 'Description')}
                </h4>
                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                  {displayDescription}
                </p>
              </div>

              {/* Features (AI Generated) */}
              {item.features && item.features.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-primary" />
                    {t('key_features', 'Key Features')}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {item.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seller Info */}
              <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-2xl border-2 border-white shadow-sm">
                    {item.sellerName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800">{item.sellerName}</h4>
                      {item.isVerifiedSupplier && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{item.sellerRole}</p>
                  </div>
                  <button 
                    onClick={() => onViewProfile(item.sellerId)}
                    className="ml-auto p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-brand-primary"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <MapPin className="w-4 h-4 text-brand-primary" />
                    <span>{item.location || t('unknown_location', 'Unknown Location')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Clock className="w-4 h-4 text-brand-primary" />
                    <span>{new Date(item.createdAt).toLocaleDateString(i18n.language, { dateStyle: 'medium' })}</span>
                  </div>
                  {item.sellerPhone && (
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <Phone className="w-4 h-4 text-brand-primary" />
                      <span>{item.sellerPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {auth.currentUser && item.sellerId !== auth.currentUser.uid && (
              <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex gap-3">
                  <HapticButton 
                    onClick={() => onContactSeller(item)}
                    className="flex-1 flex items-center justify-center gap-3 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-primary-hover transition-all shadow-xl shadow-brand-primary/20"
                  >
                    <MessageSquare className="w-6 h-6" />
                    {t('contact_seller', 'Contact Seller')}
                  </HapticButton>
                  {item.sellerPhone && (
                    <a 
                      href={`tel:${item.sellerPhone}`}
                      className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                    >
                      <Phone className="w-6 h-6" />
                    </a>
                  )}
                </div>
                
                <WhatsAppButton 
                  phoneNumber={item.sellerPhone}
                  productName={displayTitle}
                  productId={item.id}
                  variant="full"
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
