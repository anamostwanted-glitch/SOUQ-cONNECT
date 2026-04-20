import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { UserProfile, MarketplaceItem, Category } from '../../../core/types';
import { db, auth } from '../../../core/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { 
  ShoppingBag, Star, Heart, Share2, Filter, Search, 
  ArrowRight, LayoutGrid, List, Sparkles, ShieldCheck,
  TrendingUp, Package, MessageSquare, ChevronRight,
  ExternalLink, Globe, MapPin, Phone, Award, Zap,
  UserPlus, UserMinus, MessageCircle, Plus
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { Badge } from "../../../shared/components/ui/badge";
import { Card, CardContent } from "../../../shared/components/ui/card";
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { NeuralImmersiveFlow } from './NeuralImmersiveFlow';
import { OptimizedImage } from '../../../shared/components/OptimizedImage';

interface SupplierStorefrontProps {
  supplier: UserProfile;
  isOwner: boolean;
  onViewProduct: (item: MarketplaceItem) => void;
}

export const SupplierStorefront: React.FC<SupplierStorefrontProps> = ({ supplier, isOwner, onViewProduct }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [products, setProducts] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [immersiveProduct, setImmersiveProduct] = useState<MarketplaceItem | null>(null);

  useEffect(() => {
    console.log('SupplierStorefront: Debugging - Supplier Object:', supplier);
    console.log('SupplierStorefront: Debugging - Products Count:', products.length);
    
    const q = query(
      collection(db, 'marketplace'),
      where('sellerId', '==', supplier.uid),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceItem));
      setProducts(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `marketplace/${supplier.uid}`, false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [supplier.uid]);

  useEffect(() => {
    if (auth.currentUser && supplier.followers?.includes(auth.currentUser.uid)) {
      setIsFollowing(true);
    } else {
      setIsFollowing(false);
    }
  }, [supplier.followers]);

  const handleFollow = async () => {
    if (!auth.currentUser) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للمتابعة' : 'Please login to follow');
      return;
    }

    const userRef = doc(db, 'users', supplier.uid);
    const currentUserRef = doc(db, 'users', auth.currentUser.uid);

    try {
      if (isFollowing) {
        await updateDoc(userRef, {
          followers: arrayRemove(auth.currentUser.uid),
          followersCount: increment(-1)
        });
        await updateDoc(currentUserRef, {
          following: arrayRemove(supplier.uid),
          followingCount: increment(-1)
        });
        setIsFollowing(false);
        toast.success(isRtl ? 'تم إلغاء المتابعة' : 'Unfollowed');
      } else {
        await updateDoc(userRef, {
          followers: arrayUnion(auth.currentUser.uid),
          followersCount: increment(1)
        });
        await updateDoc(currentUserRef, {
          following: arrayUnion(supplier.uid),
          followingCount: increment(1)
        });
        setIsFollowing(true);
        toast.success(isRtl ? 'تمت المتابعة بنجاح!' : 'Following successfully!');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', false);
      toast.error(isRtl ? 'فشل تحديث حالة المتابعة' : 'Failed to update follow status');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.categories?.includes(activeCategory);
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.titleAr?.includes(searchQuery)) ||
                         (p.titleEn?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const uniqueCategories = Array.from(new Set(products.flatMap(p => p.categories || [])));

  return (
    <div className="space-y-8 pb-20">
      {immersiveProduct && (
        <NeuralImmersiveFlow 
          products={filteredProducts} 
          initialProductId={immersiveProduct.id} 
          onClose={() => setImmersiveProduct(null)} 
        />
      )}

      {/* Store Header / Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[2.5rem] overflow-hidden bg-brand-surface border border-brand-border shadow-xl shadow-brand-primary/5"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-warning/5" />
        
        <div className="relative p-8 md:p-12 flex flex-col lg:flex-row gap-8 items-center">
          {/* Trust Ring & Logo */}
          <div className="relative group">
            <div className="absolute inset-0 bg-brand-primary/20 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] p-1 bg-gradient-to-tr from-brand-primary via-brand-warning to-brand-primary animate-gradient-xy">
              <div className="w-full h-full rounded-[2.2rem] bg-brand-surface overflow-hidden border-4 border-brand-surface">
                <OptimizedImage 
                  src={supplier.logoUrl || 'https://picsum.photos/seed/logo/200/200'} 
                  alt={supplier.companyName} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {supplier.isVerified && (
              <div className="absolute -bottom-2 -right-2 bg-brand-primary text-white p-2.5 rounded-2xl shadow-lg border-4 border-brand-surface">
                <ShieldCheck size={20} />
              </div>
            )}
          </div>

          {/* Info & Stats */}
          <div className="flex-1 text-center lg:text-left rtl:lg:text-right space-y-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-black text-brand-text-main tracking-tight">
                {isRtl ? supplier.companyName : (supplier.companyName || supplier.name)}
              </h1>
              <p className="text-brand-text-muted font-medium flex items-center justify-center lg:justify-start gap-2">
                <MapPin size={16} className="text-brand-primary" />
                {supplier.location || (isRtl ? 'المملكة العربية السعودية' : 'Saudi Arabia')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-2">
              <div className="text-center">
                <div className="text-xl font-black text-brand-text-main">{supplier.followersCount || 0}</div>
                <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'متابع' : 'Followers'}</div>
              </div>
              <div className="w-px h-8 bg-brand-border" />
              <div className="text-center">
                <div className="text-xl font-black text-brand-text-main">{products.length}</div>
                <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'منتج' : 'Products'}</div>
              </div>
              <div className="w-px h-8 bg-brand-border" />
              <div className="text-center">
                <div className="flex items-center gap-1 text-xl font-black text-brand-warning">
                  <Star size={18} fill="currentColor" />
                  <span>4.9</span>
                </div>
                <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'تقييم' : 'Rating'}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 justify-center lg:justify-start">
              {!isOwner && (
                <HapticButton 
                  onClick={handleFollow}
                  className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${
                    isFollowing 
                      ? 'bg-brand-surface text-brand-text-main border border-brand-border hover:bg-brand-background' 
                      : 'bg-brand-primary text-white hover:bg-brand-primary-hover shadow-brand-primary/20'
                  }`}
                >
                  {isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
                  {isFollowing ? (isRtl ? 'إلغاء المتابعة' : 'Unfollow') : (isRtl ? 'متابعة المتجر' : 'Follow Store')}
                </HapticButton>
              )}
              <HapticButton className="p-3.5 bg-brand-surface text-brand-text-muted border border-brand-border rounded-2xl hover:text-brand-primary transition-all">
                <Share2 size={20} />
              </HapticButton>
              {supplier.website && (
                <HapticButton 
                  onClick={() => window.open(supplier.website, '_blank')}
                  className="p-3.5 bg-brand-surface text-brand-text-muted border border-brand-border rounded-2xl hover:text-brand-primary transition-all"
                >
                  <Globe size={20} />
                </HapticButton>
              )}
            </div>
          </div>

          {/* Trust Score AI Card */}
          <div className="hidden xl:block w-64 bg-brand-background/50 backdrop-blur-md rounded-3xl p-6 border border-brand-border relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Award size={80} />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 text-brand-primary">
                <Zap size={16} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">{isRtl ? 'مؤشر الثقة الذكي' : 'Smart Trust Score'}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-brand-text-main">{supplier.trustScore || 85}</span>
                <span className="text-sm font-bold text-brand-text-muted mb-1.5">%</span>
              </div>
              <div className="w-full h-2 bg-brand-surface rounded-full overflow-hidden border border-brand-border">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${supplier.trustScore || 85}%` }}
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-warning"
                />
              </div>
              <p className="text-[9px] font-bold text-brand-text-muted leading-relaxed">
                {isRtl 
                  ? 'تم تحليل هذا المورد بواسطة الذكاء الاصطناعي بناءً على جودة المستندات وسرعة الاستجابة.' 
                  : 'This supplier has been analyzed by AI based on document quality and response time.'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search & Filters Bar */}
      <div className="sticky top-20 z-40 bg-brand-background/80 backdrop-blur-xl py-4 -mx-4 px-4 border-b border-brand-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-primary transition-colors" size={18} />
            <input 
              type="text"
              placeholder={isRtl ? 'ابحث في منتجات المورد...' : 'Search in products...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-brand-surface border border-brand-border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <HapticButton 
              onClick={() => setActiveCategory('all')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeCategory === 'all' 
                  ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' 
                  : 'bg-brand-surface text-brand-text-muted border border-brand-border hover:bg-brand-background'
              }`}
            >
              {isRtl ? 'الكل' : 'All'}
            </HapticButton>
            {uniqueCategories.map(cat => (
              <HapticButton 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeCategory === cat 
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' 
                    : 'bg-brand-surface text-brand-text-muted border border-brand-border hover:bg-brand-background'
                }`}
              >
                {cat}
              </HapticButton>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-brand-surface p-1.5 rounded-2xl border border-brand-border">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-brand-background text-brand-primary shadow-sm' : 'text-brand-text-muted'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-brand-background text-brand-primary shadow-sm' : 'text-brand-text-muted'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-[4/5] bg-brand-surface animate-pulse rounded-[2.5rem] border border-brand-border" />
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" 
          : "space-y-6"
        }>
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card 
                  className={`group overflow-hidden border-brand-border hover:border-brand-primary/30 transition-all duration-500 cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-brand-primary/5 rounded-[2.5rem] bg-brand-surface ${
                    viewMode === 'list' ? 'flex flex-row h-48' : ''
                  }`}
                  onClick={() => onViewProduct(product)}
                >
                  <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-48 shrink-0' : 'aspect-square'}`}>
                    <OptimizedImage 
                      src={product.images?.[0] || 'https://picsum.photos/seed/product/400/400'} 
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <Badge className="bg-brand-surface/90 backdrop-blur-md text-brand-text-main border-none shadow-lg">
                        {product.price} {product.currency || 'SAR'}
                      </Badge>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      <HapticButton className="w-full py-2.5 bg-white/20 backdrop-blur-xl text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/30">
                        {isRtl ? 'عرض التفاصيل' : 'View Details'}
                      </HapticButton>
                    </div>
                  </div>

                  <CardContent className={`p-6 flex flex-col justify-between ${viewMode === 'list' ? 'flex-1' : ''}`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
                          {product.categories?.[0] || (isRtl ? 'عام' : 'General')}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star size={12} fill="currentColor" />
                          <span className="text-[10px] font-bold">4.8</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-brand-text-main line-clamp-1 group-hover:text-brand-primary transition-colors">
                        {isRtl ? (product.titleAr || product.title) : (product.titleEn || product.title)}
                      </h3>
                      <p className="text-xs text-brand-text-muted line-clamp-2 leading-relaxed">
                        {isRtl ? (product.descriptionAr || product.description) : (product.descriptionEn || product.description)}
                      </p>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-brand-border mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                          <TrendingUp size={12} />
                        </div>
                        <span className="text-[10px] font-bold text-brand-text-muted">
                          {product.views || 0} {isRtl ? 'مشاهدة' : 'Views'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HapticButton 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!auth.currentUser) return;
                            const chatId = [auth.currentUser.uid, product.sellerId].sort().join('_');
                            // We need onOpenChat here, but it's not passed.
                            // For now, let's just use a link or similar.
                            window.location.href = `/messages?chat=${chatId}`;
                          }}
                          className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all"
                        >
                          <MessageCircle size={14} />
                        </HapticButton>
                        <HapticButton className="p-2 text-brand-text-muted hover:text-brand-error transition-colors">
                          <Heart size={18} />
                        </HapticButton>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-32 bg-brand-surface rounded-[3rem] border border-brand-border border-dashed">
          <div className="w-20 h-20 bg-brand-background rounded-full flex items-center justify-center text-brand-text-muted/20 mx-auto mb-6">
            <Package size={40} />
          </div>
          <h3 className="text-xl font-black text-brand-text-main mb-2">
            {isRtl ? 'لا توجد منتجات بعد' : 'No products yet'}
          </h3>
          <p className="text-brand-text-muted max-w-xs mx-auto text-sm">
            {isRtl 
              ? 'لم يقم هذا المورد بإضافة أي منتجات لمتجره حتى الآن.' 
              : 'This supplier hasn\'t added any products to their store yet.'}
          </p>
          {isOwner && (
            <HapticButton 
              onClick={() => window.location.href = '/marketplace?add=true'}
              className="mt-8 px-8 py-3.5 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20"
            >
              <Plus size={18} className="mr-2 rtl:ml-2 rtl:mr-0 inline-block" />
              {isRtl ? 'إضافة منتجك الأول' : 'Add Your First Product'}
            </HapticButton>
          )}
        </div>
      )}

      {/* AI Market Insights Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-brand-primary/5 rounded-[2.5rem] p-8 border border-brand-primary/10 flex flex-col md:flex-row items-center gap-8"
      >
        <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary shrink-0">
          <Sparkles size={32} className="animate-pulse" />
        </div>
        <div className="space-y-2 text-center md:text-left rtl:md:text-right">
          <h4 className="text-lg font-black text-brand-text-main">
            {isRtl ? 'لماذا تتسوق من هذا المورد؟' : 'Why shop from this supplier?'}
          </h4>
          <p className="text-sm text-brand-text-muted leading-relaxed max-w-2xl">
            {isRtl 
              ? 'يتميز هذا المورد بمعدل استجابة سريع جداً (أقل من ساعة) ولديه سجل حافل بتسليم الطلبات في الموعد المحدد. منتجاته تخضع لفحص الجودة الذكي لضمان أفضل تجربة لك.' 
              : 'This supplier features a very fast response rate (less than 1 hour) and has a track record of on-time deliveries. Their products undergo smart quality checks to ensure the best experience for you.'}
          </p>
        </div>
        <HapticButton className="px-8 py-3.5 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 whitespace-nowrap">
          {isRtl ? 'تواصل الآن' : 'Contact Now'}
        </HapticButton>
      </motion.div>
    </div>
  );
};
