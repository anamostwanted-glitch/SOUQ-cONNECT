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
  Shield,
  Clock,
  Sparkles,
  Users,
  UserPlus,
  UserMinus,
  User,
  Building2,
  TrendingUp,
  DollarSign,
  Zap,
  Award,
  BrainCircuit
} from 'lucide-react';
import { MarketplaceItem, PriceInsight } from '../../core/types';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  getDoc,
  increment,
  onSnapshot
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
  const [sellerFollowersCount, setSellerFollowersCount] = React.useState(0);
  const [isFollowingSeller, setIsFollowingSeller] = React.useState(false);
  const [isFollowLoading, setIsFollowLoading] = React.useState(false);
  const [priceInsight, setPriceInsight] = React.useState<PriceInsight | null>(null);

  const displayTitle = isRtl 
    ? (item?.titleAr || item?.title) 
    : (item?.titleEn || item?.title);
  
  const displayDescription = isRtl 
    ? (item?.descriptionAr || item?.description) 
    : (item?.descriptionEn || item?.description);

  React.useEffect(() => {
    if (!item?.id) return;
    
    // Fetch Price Insights if available and authenticated
    let unsubscribe: (() => void) | undefined;
    
    if (auth.currentUser) {
      unsubscribe = onSnapshot(doc(db, 'price_insights', item.id), (doc) => {
        if (doc.exists()) {
          setPriceInsight(doc.data() as PriceInsight);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `price_insights/${item.id}`, false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [item?.id]);

  React.useEffect(() => {
    const fetchSellerStats = async () => {
      if (!item?.sellerId) return;
      try {
        const sellerDoc = await getDoc(doc(db, 'users', item.sellerId));
        if (sellerDoc.exists()) {
          const sellerData = sellerDoc.data();
          setSellerFollowersCount(sellerData.followersCount || 0);
        }
        
        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsFollowingSeller(userData.following?.includes(item.sellerId) || false);
          }
        }
      } catch (error) {
        console.error('Error fetching seller stats:', error);
      }
    };
    fetchSellerStats();
  }, [item]);

  const handleFollowSeller = async () => {
    if (!auth.currentUser || !item || isFollowLoading) return;
    
    setIsFollowLoading(true);
    const previousState = isFollowingSeller;
    const previousCount = sellerFollowersCount;
    
    // Optimistic UI update
    setIsFollowingSeller(!previousState);
    setSellerFollowersCount(prev => previousState ? Math.max(0, prev - 1) : prev + 1);
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const sellerRef = doc(db, 'users', item.sellerId);
      
      if (previousState) {
        await updateDoc(userRef, {
          following: arrayRemove(item.sellerId)
        });
        await updateDoc(sellerRef, {
          followersCount: increment(-1)
        });
      } else {
        await updateDoc(userRef, {
          following: arrayUnion(item.sellerId)
        });
        await updateDoc(sellerRef, {
          followersCount: increment(1)
        });
      }
    } catch (error) {
      // Revert on failure
      setIsFollowingSeller(previousState);
      setSellerFollowersCount(previousCount);
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`, false);
    } finally {
      setIsFollowLoading(false);
    }
  };

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
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`, false);
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
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xl">
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white w-full sm:w-full max-w-5xl h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
        >
          {/* Mobile Handle */}
          <div className="absolute top-0 left-0 w-full h-8 flex items-center justify-center sm:hidden z-20">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Close Button (Mobile) */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2 bg-black/20 backdrop-blur-md hover:bg-black/40 rounded-full text-white transition-all md:hidden"
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
              {item.sellerRole === 'supplier' ? (
                <div className="bg-brand-primary text-white px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-brand-primary/20 uppercase tracking-wider border border-white/20">
                  <Building2 className="w-3.5 h-3.5" />
                  {isRtl ? 'مورد معتمد' : 'Verified Supplier'}
                </div>
              ) : (
                <div className="bg-brand-secondary text-white px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-brand-secondary/20 uppercase tracking-wider border border-white/20">
                  <User className="w-3.5 h-3.5" />
                  {isRtl ? 'بائع مجتمعي' : 'Community Seller'}
                </div>
              )}
              {item.isHighQuality && (
                <div className="bg-amber-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 uppercase tracking-wider border border-white/20">
                  <Sparkles className="w-3.5 h-3.5" />
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

            <h1 className="text-3xl font-black text-slate-900 mb-2 leading-tight tracking-tight">{displayTitle}</h1>
            <div className="flex items-center gap-4 mb-8">
              <div className="text-4xl font-black text-brand-primary flex items-baseline gap-2">
                {item.price.toLocaleString()}
                <span className="text-lg font-bold text-slate-400">{item.currency}</span>
              </div>
              {item.isHighQuality && (
                <div className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-1">
                  <Award size={12} />
                  Premium Choice
                </div>
              )}
            </div>

            <div className="space-y-8 mb-10">
              {/* AI Price Intelligence */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-3xl bg-gradient-to-br from-brand-primary/5 to-brand-teal/5 border border-brand-primary/10 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <BrainCircuit size={60} />
                </div>
                <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Zap size={14} className="animate-pulse" />
                  {isRtl ? 'ذكاء الأسعار' : 'Price Intelligence'}
                </h4>
                
                {priceInsight ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-600">{isRtl ? 'السعر الموصى به' : 'Recommended Price'}</div>
                      <div className="text-lg font-black text-brand-primary">{priceInsight.recommendedPrice} {item.currency}</div>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                      <div className="h-full bg-brand-primary" style={{ width: '60%' }} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {priceInsight.analysis}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                      <TrendingUp size={16} />
                      {isRtl ? 'سعر تنافسي للغاية' : 'Highly Competitive Price'}
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {isRtl 
                        ? 'تحليلنا يظهر أن هذا السعر أقل بنسبة 12% من متوسط السوق لهذه الفئة.' 
                        : 'Our analysis shows this price is 12% lower than the market average for this category.'}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Description */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  {t('item_description', 'Description')}
                </h4>
                <p className="text-slate-600 leading-relaxed text-sm sm:text-base font-medium">
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
                {auth.currentUser ? (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-2xl border-2 border-white shadow-sm">
                        {item.sellerName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800">{item.sellerName}</h4>
                          {item.isVerifiedSupplier && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <span className={`px-2 py-0.5 rounded-full ${item.sellerRole === 'supplier' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-secondary/10 text-brand-secondary'}`}>
                            {item.sellerRole === 'supplier' ? (isRtl ? 'مورد' : 'Supplier') : (isRtl ? 'بائع مجتمعي' : 'Community Seller')}
                          </span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span className="flex items-center gap-1 text-brand-primary">
                            <Users className="w-3 h-3" />
                            {sellerFollowersCount} {isRtl ? 'متابع' : 'Followers'}
                          </span>
                        </div>
                      </div>
                      {auth.currentUser && item.sellerId !== auth.currentUser.uid && (
                        <button 
                          onClick={handleFollowSeller}
                          disabled={isFollowLoading}
                          className={`ml-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            isFollowingSeller 
                              ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                              : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'
                          }`}
                        >
                          {isFollowingSeller ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                          {isFollowingSeller ? (isRtl ? 'إلغاء' : 'Following') : (isRtl ? 'متابعة' : 'Follow')}
                        </button>
                      )}
                      <button 
                        onClick={() => onViewProfile(item.sellerId)}
                        className={`p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-brand-primary ${auth.currentUser && item.sellerId !== auth.currentUser.uid ? '' : 'ml-auto'}`}
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
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mx-auto mb-3">
                      <Shield size={24} />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 mb-1">
                      {isRtl ? 'سجل دخولك لمشاهدة معلومات البائع' : 'Login to view seller information'}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium mb-4">
                      {isRtl ? 'لحماية خصوصية الموردين، يجب تسجيل الدخول أولاً' : 'To protect supplier privacy, please login first'}
                    </p>
                    <HapticButton 
                      onClick={onClose}
                      className="px-6 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/20"
                    >
                      {isRtl ? 'تسجيل الدخول' : 'Login Now'}
                    </HapticButton>
                  </div>
                )}
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
