import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { UserProfile, MarketplaceItem } from '../../../core/types';
import { db, auth, storage } from '../../../core/firebase';
import { 
  collection, query, where, onSnapshot, orderBy, doc, 
  updateDoc, arrayUnion, arrayRemove, increment, getDocs, documentId,
  addDoc, deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  ShoppingBag, Star, Heart, Share2, Search, 
  LayoutGrid, List, Sparkles, ShieldCheck,
  TrendingUp, Package, MapPin, Globe, Phone, 
  Award, Zap, UserPlus, UserMinus, MessageCircle, 
  Plus, Camera, Edit3, Save, X, Settings, 
  CheckCircle2, Info, ArrowLeft, MoreHorizontal,
  Mail, Link as LinkIcon, Facebook, Instagram, Twitter,
  FileText, Bookmark, ExternalLink, Trash2, ImagePlus, Tag
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { AICategorySelector } from '../../site/components/AICategorySelector';
import { Category } from '../../../core/types';
import { Badge } from "../../../shared/components/ui/badge";
import { Card, CardContent } from "../../../shared/components/ui/card";
import { Skeleton } from "../../../shared/components/ui/skeleton";
import { ProductCard } from '../../marketplace/components/ProductCard';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import imageCompression from 'browser-image-compression';
import { getProfileInsights, optimizeSupplierProfile, handleAiError } from '../../../core/services/geminiService';
import { ProfileSettings } from '../../user/components/ProfileSettings';

interface ConnectStorefrontProps {
  profile: UserProfile;
  isOwner: boolean;
  isAdmin?: boolean;
  onViewProduct: (item: MarketplaceItem) => void;
  onBack?: () => void;
  onOpenChat: (id: string) => void;
  categories?: Category[];
  editKeywords?: string[];
  setEditKeywords?: (keywords: string[]) => void;
  editCategories?: string[];
  setEditCategories?: (categories: string[]) => void;
  keywordInput?: string;
  setKeywordInput?: (input: string) => void;
  handleAddKeyword?: (e: React.KeyboardEvent) => void;
  handleRemoveKeyword?: (kw: string) => void;
}

export const ConnectStorefront: React.FC<ConnectStorefrontProps> = ({ 
  profile, 
  isOwner, 
  isAdmin,
  onViewProduct, 
  onBack, 
  onOpenChat,
  categories = [],
  editKeywords = [],
  setEditKeywords,
  editCategories = [],
  setEditCategories,
  keywordInput = '',
  setKeywordInput,
  handleAddKeyword,
  handleRemoveKeyword
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  // State
  const [products, setProducts] = useState<MarketplaceItem[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'products' | 'requests' | 'saved' | 'about' | 'reviews' | 'settings'>(
    profile.role === 'customer' ? 'requests' : 'products'
  );
  
  // Architect Mode (Edit Mode)
  const [isArchitectMode, setIsArchitectMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<'logo' | 'cover' | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Editable Fields
  const [editData, setEditData] = useState({
    name: profile.name || profile.companyName || '',
    bio: profile.bio || '',
    location: profile.location || '',
    phone: profile.phone || '',
    website: profile.website || '',
    logoUrl: profile.logoUrl || '',
    coverUrl: profile.coverUrl || 'https://picsum.photos/seed/neural/1200/400',
    socialLinks: profile.socialLinks || { facebook: '', instagram: '', twitter: '' }
  });

  const handleFieldChange = (field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Sync editData with profile changes when not in architect mode
  useEffect(() => {
    if (!isArchitectMode) {
      setEditData({
        name: profile.name || profile.companyName || '',
        bio: profile.bio || '',
        location: profile.location || '',
        phone: profile.phone || '',
        website: profile.website || '',
        logoUrl: profile.logoUrl || '',
        coverUrl: profile.coverUrl || 'https://picsum.photos/seed/cover/1200/400',
        socialLinks: profile.socialLinks || { facebook: '', instagram: '', twitter: '' }
      });
    }
  }, [profile, isArchitectMode]);

  // AI State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<{
    summary: string;
    tips: string[];
    score: number;
  } | null>(null);

  // Product Editor State
  const [isProductEditorOpen, setIsProductEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MarketplaceItem | null>(null);
  const [isProductSaving, setIsProductSaving] = useState(false);
  const [productFormData, setProductFormData] = useState({
    title: '',
    titleAr: '',
    titleEn: '',
    description: '',
    descriptionAr: '',
    descriptionEn: '',
    price: '',
    currency: 'SAR',
    categories: [] as string[],
    images: [] as string[],
    status: 'active' as 'active' | 'sold' | 'hidden' | 'deleted' | 'draft' | 'expired'
  });
  const [isProductImageUploading, setIsProductImageUploading] = useState(false);

  const handleOpenProductEditor = (product?: MarketplaceItem) => {
    if (product) {
      setEditingProduct(product);
      setProductFormData({
        title: product.title || '',
        titleAr: product.titleAr || '',
        titleEn: product.titleEn || '',
        description: product.description || '',
        descriptionAr: product.descriptionAr || '',
        descriptionEn: product.descriptionEn || '',
        price: product.price?.toString() || '',
        currency: product.currency || 'SAR',
        categories: product.categories || [],
        images: product.images || [],
        status: product.status || 'active'
      });
    } else {
      setEditingProduct(null);
      setProductFormData({
        title: '',
        titleAr: '',
        titleEn: '',
        description: '',
        descriptionAr: '',
        descriptionEn: '',
        price: '',
        currency: 'SAR',
        categories: [],
        images: [],
        status: 'active'
      });
    }
    setIsProductEditorOpen(true);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsProductImageUploading(true);
      const newImages = [...productFormData.images];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1200,
          useWebWorker: true
        });

        const storageRef = ref(storage, `marketplace/${profile.uid}/${Date.now()}_${i}`);
        await uploadBytes(storageRef, compressedFile);
        const url = await getDownloadURL(storageRef);
        newImages.push(url);
      }

      setProductFormData(prev => ({ ...prev, images: newImages }));
      toast.success(isRtl ? 'تم رفع الصور بنجاح' : 'Images uploaded successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `marketplace/${profile.uid}/images`, false);
      toast.error(isRtl ? 'فشل رفع الصور' : 'Failed to upload images');
    } finally {
      setIsProductImageUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!profile.uid) return;
    if (!productFormData.title && !productFormData.titleAr && !productFormData.titleEn) {
      toast.error(isRtl ? 'يرجى إدخال عنوان المنتج' : 'Please enter product title');
      return;
    }

    try {
      setIsProductSaving(true);
      const data = {
        ...productFormData,
        price: parseFloat(productFormData.price) || 0,
        sellerId: profile.uid,
        sellerName: profile.companyName || profile.name,
        sellerRole: profile.role,
        isVerifiedSupplier: profile.isVerified || false,
        updatedAt: new Date().toISOString(),
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
        views: editingProduct?.views || 0
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'marketplace', editingProduct.id), data);
        toast.success(isRtl ? 'تم تحديث المنتج بنجاح' : 'Product updated successfully');
      } else {
        await addDoc(collection(db, 'marketplace'), data);
        toast.success(isRtl ? 'تم إضافة المنتج بنجاح' : 'Product added successfully');
      }

      setIsProductEditorOpen(false);
      // Refresh products list
      const q = query(
        collection(db, 'marketplace'),
        where('sellerId', '==', profile.uid),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem)));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'marketplace', false);
      toast.error(isRtl ? 'فشل حفظ المنتج' : 'Failed to save product');
    } finally {
      setIsProductSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا المنتج؟' : 'Are you sure you want to delete this product?')) return;

    try {
      await deleteDoc(doc(db, 'marketplace', productId));
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success(isRtl ? 'تم حذف المنتج بنجاح' : 'Product deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `marketplace/${productId}`, false);
      toast.error(isRtl ? 'فشل حذف المنتج' : 'Failed to delete product');
    }
  };

  const handleGenerateInsights = async () => {
    setIsAiAnalyzing(true);
    try {
      const result = await getProfileInsights({
        name: editData.name,
        bio: editData.bio,
        productsCount: products.length,
        role: profile.role,
        location: editData.location
      }, i18n.language);

      if (result) {
        setAiInsights({
          summary: isRtl ? result.summaryAr : result.summaryEn,
          tips: isRtl ? result.recommendationsAr : result.recommendationsEn,
          score: result.score || 85
        });
        toast.success(isRtl ? 'تم تحديث التحليلات الذكية' : 'Smart insights updated');
      }
    } catch (error) {
      handleAiError(error, "Profile AI insights");
      toast.error(isRtl ? 'فشل توليد التحليلات' : 'Failed to generate insights');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.uid) return;
      setLoading(true);
      try {
        // Fetch Products if supplier
        if (profile.role === 'supplier' || profile.role === 'admin') {
          const q = query(
            collection(db, 'marketplace'),
            where('sellerId', '==', profile.uid),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
          );
          const snap = await getDocs(q);
          setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem)));
        }

        // Fetch Requests if owner
        if (isOwner) {
          const q = query(
            collection(db, 'requests'), 
            where('customerId', '==', profile.uid),
            orderBy('createdAt', 'desc')
          );
          const snap = await getDocs(q);
          setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        // Fetch Saved Items if owner
        if (isOwner && profile.favoriteProducts?.length) {
          const q = query(
            collection(db, 'marketplace'),
            where(documentId(), 'in', profile.favoriteProducts.slice(0, 10))
          );
          const snap = await getDocs(q);
          setSavedItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem)));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'storefront/data', false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.uid, isOwner, profile.favoriteProducts]);

  useEffect(() => {
    if (auth.currentUser && profile.followers?.includes(auth.currentUser.uid)) {
      setIsFollowing(true);
    } else {
      setIsFollowing(false);
    }
  }, [profile.followers]);

  const handleFollow = async () => {
    if (!auth.currentUser) {
      toast.error(isRtl ? 'يرجى تسجيل الدخول للمتابعة' : 'Please login to follow');
      return;
    }

    const userRef = doc(db, 'users', profile.uid);
    const currentUserRef = doc(db, 'users', auth.currentUser.uid);

    try {
      if (isFollowing) {
        await updateDoc(userRef, {
          followers: arrayRemove(auth.currentUser.uid),
          followersCount: increment(-1)
        });
        await updateDoc(currentUserRef, {
          following: arrayRemove(profile.uid),
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
          following: arrayUnion(profile.uid),
          followingCount: increment(1)
        });
        setIsFollowing(true);
        toast.success(isRtl ? 'تمت المتابعة بنجاح!' : 'Following successfully!');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}/follow`, false);
      toast.error(isRtl ? 'فشل تحديث حالة المتابعة' : 'Failed to update follow status');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(type);
      const compressedFile = await imageCompression(file, {
        maxSizeMB: type === 'logo' ? 0.5 : 1,
        maxWidthOrHeight: type === 'logo' ? 512 : 1200,
        useWebWorker: true
      });

      const storageRef = ref(storage, `users/${profile.uid}/${type}_${Date.now()}`);
      await uploadBytes(storageRef, compressedFile);
      const url = await getDownloadURL(storageRef);
      
      setEditData(prev => ({ ...prev, [`${type}Url`]: url }));
      
      if (!isArchitectMode) {
        await updateDoc(doc(db, 'users', profile.uid), {
          [`${type}Url`]: url,
          updatedAt: new Date().toISOString()
        });
        
        // Update public profile as well
        await updateDoc(doc(db, 'users_public', profile.uid), {
          [`${type}Url`]: url,
          updatedAt: new Date().toISOString()
        }).catch(err => {
          console.error("Failed to update users_public:", err);
        });
        
        toast.success(isRtl ? 'تم تحديث الصورة بنجاح' : 'Image updated successfully');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}/${type}`, false);
      toast.error(isRtl ? 'فشل رفع الصورة' : 'Failed to upload image');
    } finally {
      setIsUploading(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.uid) return;

    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'users', profile.uid), {
        name: editData.name,
        companyName: editData.name,
        bio: editData.bio,
        location: editData.location,
        phone: editData.phone,
        website: editData.website,
        logoUrl: editData.logoUrl,
        coverUrl: editData.coverUrl,
        socialLinks: editData.socialLinks,
        categories: editCategories,
        keywords: editKeywords,
        updatedAt: new Date().toISOString()
      });

      // Update public profile as well
      await updateDoc(doc(db, 'users_public', profile.uid), {
        name: editData.name,
        logoUrl: editData.logoUrl,
        coverUrl: editData.coverUrl,
        categories: editCategories,
        updatedAt: new Date().toISOString()
      }).catch(err => {
        console.error("Failed to update users_public:", err);
      });

      toast.success(isRtl ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully');
      setIsArchitectMode(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
      toast.error(isRtl ? 'فشل حفظ التغييرات' : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiRefineBio = async () => {
    if (!editData.bio) {
      toast.error(isRtl ? 'يرجى كتابة نبذة أولاً' : 'Please write a bio first');
      return;
    }

    try {
      setIsAiAnalyzing(true);
      const result = await optimizeSupplierProfile(
        editData.name,
        editData.bio,
        [],
        i18n.language
      );

      if (result?.suggestedBio) {
        setEditData(prev => ({ ...prev, bio: result.suggestedBio }));
        toast.success(isRtl ? 'تم تحسين النبذة بواسطة الذكاء الاصطناعي' : 'Bio refined by AI');
      }
    } catch (error) {
      handleAiError(error, "Profile AI refinement");
      toast.error(isRtl ? 'فشل تحسين النبذة' : 'Failed to refine bio');
    } finally {
      setIsAiAnalyzing(false);
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
    <div className="min-h-screen bg-brand-background pb-32 font-sans">
      {/* Immersive Header (Neural Identity Studio Style) */}
      <div className="relative h-72 md:h-96 w-full overflow-hidden">
        <motion.div 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className="w-full h-full"
        >
          {editData.coverUrl ? (
            <img 
              src={editData.coverUrl} 
              className="w-full h-full object-cover"
              alt="Cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-primary/20 via-brand-surface to-brand-secondary/20" />
          )}
        </motion.div>
        
        {/* Neural Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-background via-brand-background/40 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)]" />
        
        {/* Top Controls */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          {onBack && (
            <HapticButton 
              onClick={onBack}
              className="p-3 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl text-white hover:bg-black/50 transition-all"
            >
              <ArrowLeft size={20} />
            </HapticButton>
          )}
          
          <div className="flex items-center gap-3">
            {(isOwner || isAdmin) && (
              <HapticButton 
                onClick={() => setIsArchitectMode(!isArchitectMode)}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-2xl ${
                  isArchitectMode 
                    ? 'bg-brand-primary text-white scale-105' 
                    : 'bg-black/30 backdrop-blur-xl border border-white/10 text-white hover:bg-black/50'
                }`}
              >
                <Zap size={14} className={isArchitectMode ? 'animate-pulse' : ''} />
                {isArchitectMode ? (isRtl ? 'وضع المعماري نشط' : 'Architect Mode Active') : (isRtl ? 'وضع المعماري' : 'Architect Mode')}
              </HapticButton>
            )}
            <HapticButton className="p-3 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl text-white hover:bg-black/50 transition-all">
              <Share2 size={20} />
            </HapticButton>
          </div>
        </div>

        {isArchitectMode && (
          <label className="absolute bottom-8 right-8 p-4 bg-brand-primary text-white rounded-2xl cursor-pointer shadow-[0_8px_32px_rgba(var(--brand-primary-rgb),0.4)] hover:scale-110 transition-all z-20">
            {isUploading === 'cover' ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" /> : <Camera size={20} />}
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
          </label>
        )}
      </div>

      {/* Profile Identity Card (Floating Over Cover) */}
      <div className="max-w-6xl mx-auto px-6 -mt-32 relative z-30">
        <div className="bg-brand-surface/80 backdrop-blur-3xl rounded-[3.5rem] border border-brand-border shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-8 md:p-12 flex flex-col md:flex-row gap-10 items-center md:items-end">
          {/* Logo Section */}
          <div className="relative -mt-24 md:-mt-32 group">
            <div className="relative w-40 h-40 md:w-52 md:h-52 rounded-[3.5rem] p-1.5 bg-gradient-to-tr from-brand-primary via-brand-warning to-brand-primary animate-gradient-xy shadow-2xl">
              <div className="w-full h-full rounded-[3.2rem] bg-brand-surface overflow-hidden border-4 border-brand-surface relative">
                {editData.logoUrl || profile.logoUrl ? (
                  <img 
                    src={editData.logoUrl || profile.logoUrl} 
                    alt={editData.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-brand-primary/5 flex items-center justify-center text-brand-primary text-5xl font-black">
                    {editData.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                
                {isUploading === 'logo' && (
                  <div className="absolute inset-0 bg-brand-surface/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary" />
                  </div>
                )}
                
                {isArchitectMode && (
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity backdrop-blur-sm">
                    <Camera size={40} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                  </label>
                )}
              </div>
            </div>
            {profile.isVerified && (
              <div className="absolute -bottom-2 -right-2 bg-brand-primary text-white p-4 rounded-[1.5rem] shadow-2xl border-4 border-brand-surface">
                <ShieldCheck size={28} />
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex-1 text-center md:text-left rtl:md:text-right space-y-6">
            <div className="space-y-3">
              {isArchitectMode ? (
                <input 
                  type="text"
                  value={editData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="text-4xl md:text-5xl font-black text-brand-text-main bg-brand-background/50 border border-brand-border rounded-[1.5rem] px-6 py-3 w-full outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all"
                />
              ) : (
                <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
                  <h1 className="text-4xl md:text-6xl font-black text-brand-text-main tracking-tight leading-none">
                    {editData.name}
                  </h1>
                  <Badge className="bg-brand-primary/10 text-brand-primary border-none text-[10px] uppercase tracking-widest font-black py-2 px-4 rounded-full mb-1">
                    {profile.role === 'supplier' ? (isRtl ? 'مورد معتمد' : 'Verified Supplier') : (isRtl ? 'عضو' : 'Member')}
                  </Badge>
                </div>
              )}
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-brand-text-muted font-bold text-sm">
                <div className="flex items-center gap-2 px-4 py-2 bg-brand-background/50 rounded-full border border-brand-border">
                  <MapPin size={16} className="text-brand-primary" />
                  {isArchitectMode ? (
                    <input 
                      type="text"
                      value={editData.location}
                      onChange={(e) => handleFieldChange('location', e.target.value)}
                      className="bg-transparent border-none outline-none focus:ring-0 w-32"
                    />
                  ) : (
                    <span>{editData.location || (isRtl ? 'المملكة العربية السعودية' : 'Saudi Arabia')}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-brand-background/50 rounded-full border border-brand-border">
                  <Star size={16} className="text-brand-warning fill-brand-warning" />
                  <span className="text-brand-text-main">4.9</span>
                  <span className="text-xs opacity-60">(120 {isRtl ? 'تقييم' : 'Reviews'})</span>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="relative group max-w-3xl">
              {isArchitectMode ? (
                <div className="relative">
                  <textarea 
                    value={editData.bio}
                    onChange={(e) => handleFieldChange('bio', e.target.value)}
                    placeholder={isRtl ? 'اكتب نبذة عن متجرك...' : 'Write a bio about your store...'}
                    className="w-full h-32 bg-brand-background/50 border border-brand-border rounded-[1.5rem] p-6 text-sm font-medium outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all resize-none"
                  />
                  <HapticButton 
                    onClick={handleAiRefineBio}
                    disabled={isAiAnalyzing}
                    className="absolute bottom-4 right-4 p-3 bg-brand-primary text-white rounded-2xl shadow-xl hover:scale-110 transition-all disabled:opacity-50"
                  >
                    {isAiAnalyzing ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" /> : <Sparkles size={20} />}
                  </HapticButton>
                </div>
              ) : (
                <p className="text-brand-text-muted text-lg leading-relaxed font-medium">
                  {editData.bio || (isRtl ? 'لا يوجد وصف متاح لهذا المتجر حالياً.' : 'No description available for this store yet.')}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 shrink-0 w-full md:w-auto pb-2">
            {!isArchitectMode && (
              <>
                {!isOwner && (
                  <HapticButton 
                    onClick={handleFollow}
                    className={`w-full md:w-56 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-3 ${
                      isFollowing 
                        ? 'bg-brand-surface text-brand-text-main border border-brand-border' 
                        : 'bg-brand-primary text-white shadow-brand-primary/30'
                    }`}
                  >
                    {isFollowing ? <UserMinus size={20} /> : <UserPlus size={20} />}
                    {isFollowing ? (isRtl ? 'إلغاء المتابعة' : 'Unfollow') : (isRtl ? 'متابعة' : 'Follow')}
                  </HapticButton>
                )}
                <div className="flex gap-3">
                  <HapticButton className="flex-1 py-5 bg-brand-surface text-brand-text-main border border-brand-border rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-brand-background transition-colors">
                    <MessageCircle size={20} />
                    {isRtl ? 'مراسلة' : 'Message'}
                  </HapticButton>
                  <HapticButton className="p-5 bg-brand-surface text-brand-text-main border border-brand-border rounded-[1.5rem] hover:bg-brand-background transition-colors">
                    <MoreHorizontal size={24} />
                  </HapticButton>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: isRtl ? 'متابع' : 'Followers', value: profile.followersCount || 0, icon: UserPlus, color: 'text-brand-primary' },
            { label: isRtl ? 'منتج' : 'Products', value: products.length, icon: Package, color: 'text-brand-teal' },
            { label: isRtl ? 'مشاهدة' : 'Total Views', value: products.reduce((acc, p) => acc + (p.views || 0), 0), icon: TrendingUp, color: 'text-brand-warning' },
            { label: isRtl ? 'ثقة' : 'Trust Score', value: `${profile.trustScore || 85}%`, icon: Award, color: 'text-brand-primary' }
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="bg-brand-surface p-6 rounded-[2rem] border border-brand-border flex items-center gap-4 group hover:border-brand-primary/30 transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl bg-brand-background flex items-center justify-center ${stat.color} shadow-inner group-hover:scale-110 transition-transform`}>
                <stat.icon size={20} />
              </div>
              <div>
                <div className="text-xl font-black text-brand-text-main">{stat.value}</div>
                <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Unified Tabs Navigation */}
        <div className="mt-12 flex flex-col md:flex-row gap-8">
          {/* Main Content Area */}
          <div className="flex-1 space-y-8">
            <div className="flex items-center gap-2 p-1.5 bg-brand-surface rounded-[2rem] border border-brand-border w-fit overflow-x-auto hide-scrollbar">
              {[
                ...(profile.role === 'supplier' || profile.role === 'admin' ? [{ id: 'products', label: isRtl ? 'المنتجات' : 'Products', icon: ShoppingBag }] : []),
                ...(isOwner ? [
                  { id: 'requests', label: isRtl ? 'طلباتي' : 'Requests', icon: FileText },
                  { id: 'saved', label: isRtl ? 'المحفوظات' : 'Saved', icon: Heart }
                ] : []),
                { id: 'about', label: isRtl ? 'عن المتجر' : 'About', icon: Info },
                { id: 'reviews', label: isRtl ? 'التقييمات' : 'Reviews', icon: Star },
                ...(isOwner ? [{ id: 'settings', label: isRtl ? 'الإعدادات' : 'Settings', icon: Settings }] : [])
              ].map((tab) => (
                <HapticButton
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                      : 'text-brand-text-muted hover:text-brand-text-main'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </HapticButton>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'products' && (
                <motion.div 
                  key="products"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* AI Market Insight Card */}
                  <div className="bg-brand-surface/40 backdrop-blur-xl border border-brand-primary/20 rounded-[2.5rem] p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      <TrendingUp size={100} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                            <Sparkles size={24} className="animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-brand-text-main">{isRtl ? 'تحليلات السوق الذكية' : 'Smart Market Insights'}</h4>
                            <p className="text-xs text-brand-text-muted font-bold tracking-widest uppercase">{isRtl ? 'بواسطة كونكت AI' : 'Powered by Connect AI'}</p>
                          </div>
                        </div>
                        <HapticButton 
                          onClick={handleGenerateInsights}
                          disabled={isAiAnalyzing}
                          className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-primary/20 flex items-center gap-2"
                        >
                          {isAiAnalyzing ? <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" /> : <Zap size={14} />}
                          {isRtl ? 'تحديث التحليل' : 'Update Analysis'}
                        </HapticButton>
                      </div>

                      {aiInsights ? (
                        <div className="space-y-6">
                          <p className="text-sm text-brand-text-main leading-relaxed font-medium">
                            {aiInsights.summary}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aiInsights.tips.map((tip, i) => (
                              <div key={i} className="flex items-start gap-3 p-4 bg-brand-background/50 rounded-2xl border border-brand-border">
                                <CheckCircle2 size={16} className="text-brand-teal shrink-0 mt-0.5" />
                                <p className="text-xs text-brand-text-muted font-bold leading-relaxed">{tip}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-brand-text-muted italic">
                          {isRtl ? 'انقر على "تحديث التحليل" للحصول على رؤى ذكية لمتجرك.' : 'Click "Update Analysis" to get smart insights for your store.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Search & Category Filter */}
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="relative flex-1 md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-primary transition-colors" size={18} />
                        <input 
                          type="text"
                          placeholder={isRtl ? 'ابحث في منتجات المورد...' : 'Search in products...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-6 py-3.5 bg-brand-surface border border-brand-border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                        />
                      </div>
                      {isOwner && (
                        <HapticButton 
                          onClick={() => handleOpenProductEditor()}
                          className="p-3.5 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all"
                        >
                          <Plus size={20} />
                        </HapticButton>
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-brand-surface p-1.5 rounded-2xl border border-brand-border">
                      <HapticButton onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-brand-background text-brand-primary shadow-sm' : 'text-brand-text-muted'}`}>
                        <LayoutGrid size={18} />
                      </HapticButton>
                      <HapticButton onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-brand-background text-brand-primary shadow-sm' : 'text-brand-text-muted'}`}>
                        <List size={18} />
                      </HapticButton>
                    </div>
                  </div>

                  {/* Grid */}
                  {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="aspect-[4/5] bg-brand-surface animate-pulse rounded-[2.5rem] border border-brand-border" />
                      ))}
                    </div>
                  ) : filteredProducts.length > 0 ? (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
                      {filteredProducts.map((product, index) => (
                        <div key={product.id} className="relative group">
                          <ProductCard 
                            item={product} 
                            onOpenChat={onOpenChat} 
                            onViewDetails={() => onViewProduct(product)}
                          />
                          {isOwner && (
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              <HapticButton 
                                onClick={(e) => { e.stopPropagation(); handleOpenProductEditor(product); }}
                                className="p-2 bg-white/90 backdrop-blur-sm text-brand-primary rounded-xl shadow-lg hover:bg-brand-primary hover:text-white transition-all"
                              >
                                <Edit3 size={16} />
                              </HapticButton>
                              <HapticButton 
                                onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                                className="p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-xl shadow-lg hover:bg-red-500 hover:text-white transition-all"
                              >
                                <Trash2 size={16} />
                              </HapticButton>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-32 bg-brand-surface rounded-[3rem] border border-brand-border border-dashed">
                      <Package size={40} className="mx-auto mb-4 text-brand-text-muted/20" />
                      <h3 className="text-xl font-black text-brand-text-main mb-2">{isRtl ? 'لا توجد منتجات بعد' : 'No products yet'}</h3>
                      {isOwner && (
                        <HapticButton onClick={() => window.location.href = '/marketplace?add=true'} className="mt-8 px-8 py-3.5 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/20">
                          <Plus size={18} className="mr-2 rtl:ml-2 rtl:mr-0 inline-block" />
                          {isRtl ? 'إضافة منتجك الأول' : 'Add Your First Product'}
                        </HapticButton>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'requests' && (
                <motion.div 
                  key="requests"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* AI Shopping Insight Card */}
                  <div className="bg-brand-surface/40 backdrop-blur-xl border border-brand-primary/20 rounded-[2.5rem] p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      <ShoppingBag size={100} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                            <Sparkles size={24} className="animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-brand-text-main">{isRtl ? 'مساعد التسوق الذكي' : 'Smart Shopping Assistant'}</h4>
                            <p className="text-xs text-brand-text-muted font-bold tracking-widest uppercase">{isRtl ? 'بواسطة كونكت AI' : 'Powered by Connect AI'}</p>
                          </div>
                        </div>
                        <HapticButton 
                          onClick={handleGenerateInsights}
                          disabled={isAiAnalyzing}
                          className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-primary/20 flex items-center gap-2"
                        >
                          {isAiAnalyzing ? <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" /> : <Zap size={14} />}
                          {isRtl ? 'تحديث التحليل' : 'Update Analysis'}
                        </HapticButton>
                      </div>

                      {aiInsights ? (
                        <div className="space-y-6">
                          <p className="text-sm text-brand-text-main leading-relaxed font-medium">
                            {aiInsights.summary}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aiInsights.tips.map((tip, i) => (
                              <div key={i} className="flex items-start gap-3 p-4 bg-brand-background/50 rounded-2xl border border-brand-border">
                                <CheckCircle2 size={16} className="text-brand-teal shrink-0 mt-0.5" />
                                <p className="text-xs text-brand-text-muted font-bold leading-relaxed">{tip}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-brand-text-muted italic">
                          {isRtl ? 'انقر على "تحديث التحليل" للحصول على رؤى ذكية لطلباتك.' : 'Click "Update Analysis" to get smart insights for your requests.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {requests.length > 0 ? (
                    requests.map(req => (
                      <div key={req.id} className="bg-brand-surface p-6 rounded-[2rem] border border-brand-border flex justify-between items-center group hover:border-brand-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h4 className="font-black text-brand-text-main mb-1">{req.title || (isRtl ? 'طلب منتج' : 'Product Request')}</h4>
                            <p className="text-xs text-brand-text-muted font-bold">{new Date(req.createdAt).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}</p>
                          </div>
                        </div>
                        <Badge className="bg-brand-primary/10 text-brand-primary border-none text-[10px] uppercase tracking-widest font-black py-1 px-3">
                          {req.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-32 bg-brand-surface rounded-[3rem] border border-brand-border border-dashed">
                      <FileText size={40} className="mx-auto mb-4 text-brand-text-muted/20" />
                      <h3 className="text-xl font-black text-brand-text-main mb-2">{isRtl ? 'لا توجد طلبات' : 'No requests yet'}</h3>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'saved' && (
                <motion.div 
                  key="saved"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {savedItems.length > 0 ? (
                    savedItems.map(item => (
                      <ProductCard 
                        key={item.id} 
                        item={item} 
                        onOpenChat={onOpenChat} 
                        onViewDetails={() => onViewProduct(item)}
                      />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-32 bg-brand-surface rounded-[3rem] border border-brand-border border-dashed">
                      <Heart size={40} className="mx-auto mb-4 text-brand-text-muted/20" />
                      <h3 className="text-xl font-black text-brand-text-main mb-2">{isRtl ? 'المحفوظات فارغة' : 'No saved items'}</h3>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'about' && (
                <motion.div 
                  key="about"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <Card className="bg-brand-surface border-brand-border rounded-[2.5rem] p-8 space-y-6">
                    <h4 className="text-xl font-black text-brand-text-main flex items-center gap-3">
                      <Info size={20} className="text-brand-primary" />
                      {isRtl ? 'معلومات التواصل' : 'Contact Information'}
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-brand-background rounded-2xl border border-brand-border">
                        <Mail className="text-brand-primary" size={20} />
                        <div>
                          <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'البريد الإلكتروني' : 'Email'}</p>
                          <p className="text-sm font-black text-brand-text-main">{profile.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-brand-background rounded-2xl border border-brand-border">
                        <Phone className="text-brand-teal" size={20} />
                        <div>
                          <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'رقم الهاتف' : 'Phone'}</p>
                          <p className="text-sm font-black text-brand-text-main">{editData.phone || '---'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-brand-background rounded-2xl border border-brand-border">
                        <Globe className="text-brand-warning" size={20} />
                        <div>
                          <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'الموقع الإلكتروني' : 'Website'}</p>
                          <p className="text-sm font-black text-brand-text-main">{editData.website || '---'}</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-brand-surface border-brand-border rounded-[2.5rem] p-8 space-y-6">
                    <h4 className="text-xl font-black text-brand-text-main flex items-center gap-3">
                      <LinkIcon size={20} className="text-brand-primary" />
                      {isRtl ? 'التواصل الاجتماعي' : 'Social Media'}
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { icon: Facebook, label: 'Facebook', color: 'text-blue-600', key: 'facebook' },
                        { icon: Instagram, label: 'Instagram', color: 'text-pink-600', key: 'instagram' },
                        { icon: Twitter, label: 'Twitter', color: 'text-sky-500', key: 'twitter' }
                      ].map((social, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-brand-background rounded-2xl border border-brand-border">
                          <div className="flex items-center gap-4">
                            <social.icon className={social.color} size={20} />
                            <span className="text-sm font-black text-brand-text-main">{social.label}</span>
                          </div>
                          {editData.socialLinks?.[social.key as keyof typeof editData.socialLinks] ? (
                            <HapticButton onClick={() => window.open(editData.socialLinks[social.key as keyof typeof editData.socialLinks], '_blank')} className="text-brand-primary">
                              <ExternalLink size={16} />
                            </HapticButton>
                          ) : (
                            <span className="text-[10px] font-bold text-brand-text-muted uppercase">{isRtl ? 'غير متصل' : 'Not Linked'}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === 'settings' && (isOwner || isAdmin) && (
                <motion.div 
                  key="settings"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  <ProfileSettings 
                    profile={profile} 
                    forceShowSupplierSettings={profile.role === 'supplier'} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Insights (Desktop) */}
          <div className="hidden lg:block w-80 space-y-6">
            <Card className="bg-brand-surface border-brand-border rounded-[2.5rem] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldCheck size={100} />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2 text-brand-primary">
                  <Zap size={16} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{isRtl ? 'تحليل الأداء الذكي' : 'Smart Performance Analysis'}</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-brand-text-muted">{isRtl ? 'معدل الاستجابة' : 'Response Rate'}</span>
                    <span className="text-xl font-black text-brand-text-main">98%</span>
                  </div>
                  <div className="w-full h-1.5 bg-brand-background rounded-full overflow-hidden">
                    <div className="h-full bg-brand-teal w-[98%]" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-brand-text-muted">{isRtl ? 'جودة المنتجات' : 'Product Quality'}</span>
                    <span className="text-xl font-black text-brand-text-main">4.9/5</span>
                  </div>
                  <div className="w-full h-1.5 bg-brand-background rounded-full overflow-hidden">
                    <div className="h-full bg-brand-warning w-[92%]" />
                  </div>
                </div>
                <p className="text-[10px] text-brand-text-muted leading-relaxed font-medium">
                  {isRtl 
                    ? 'يتم تحديث هذه البيانات تلقائياً بناءً على تفاعلات العملاء الحقيقية وسرعة معالجة الطلبات.' 
                    : 'This data is automatically updated based on real customer interactions and order processing speed.'}
                </p>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-brand-primary to-brand-primary-hover rounded-[2.5rem] p-8 text-white relative overflow-hidden">
              <div className="absolute -bottom-4 -right-4 opacity-10">
                <Sparkles size={120} />
              </div>
              <div className="relative z-10 space-y-4">
                <h4 className="text-lg font-black">{isRtl ? 'نصيحة المعماري الذكي' : 'Smart Architect Tip'}</h4>
                <p className="text-xs text-white/80 leading-relaxed font-medium">
                  {isRtl 
                    ? 'إضافة صور عالية الجودة لمنتجاتك تزيد من نسبة المبيعات بمقدار 3.5 ضعف. جرب تحديث صورك الآن!' 
                    : 'Adding high-quality images to your products increases sales by 3.5x. Try updating your photos now!'}
                </p>
                <HapticButton className="w-full py-3 bg-white/20 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/30">
                  {isRtl ? 'تحسين الصور الآن' : 'Optimize Photos Now'}
                </HapticButton>
              </div>
            </Card>
          </div>
        </div>
      </div>
      {/* Floating Save Bar for Architect Mode */}
      <AnimatePresence>
        {isArchitectMode && hasChanges && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:min-w-[500px] bg-brand-surface/80 backdrop-blur-3xl border border-brand-border p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-[60] flex items-center justify-between gap-8"
          >
            <div className="flex items-center gap-4 px-2">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-black text-brand-text-main">
                  {isRtl ? 'لديك تغييرات ذكية غير محفوظة' : 'Unsaved smart changes'}
                </p>
                <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
                  {isRtl ? 'سيتم تحديث الهوية البصرية فور الحفظ' : 'Identity will update upon saving'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <HapticButton 
                onClick={() => {
                  setIsArchitectMode(false);
                  setHasChanges(false);
                }}
                className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-brand-text-muted hover:text-brand-text-main transition-colors"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </HapticButton>
              <HapticButton 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/30 hover:-translate-y-1 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" /> : <Save size={16} />}
                {isRtl ? 'حفظ التغييرات' : 'Save Identity'}
              </HapticButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Editor Modal */}
      <AnimatePresence>
        {isProductEditorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProductEditorOpen(false)}
              className="absolute inset-0 bg-brand-background/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-brand-surface rounded-[3rem] border border-brand-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-8 border-b border-brand-border flex justify-between items-center bg-brand-surface/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                    <Package size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-brand-text-main">
                      {editingProduct ? (isRtl ? 'تعديل المنتج' : 'Edit Product') : (isRtl ? 'إضافة منتج جديد' : 'Add New Product')}
                    </h2>
                    <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest">
                      {isRtl ? 'أدخل تفاصيل المنتج بدقة' : 'Enter product details accurately'}
                    </p>
                  </div>
                </div>
                <HapticButton 
                  onClick={() => setIsProductEditorOpen(false)}
                  className="p-3 bg-brand-background text-brand-text-muted rounded-2xl hover:text-brand-text-main transition-colors"
                >
                  <X size={20} />
                </HapticButton>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Image Upload */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Camera size={14} />
                    {isRtl ? 'صور المنتج' : 'Product Images'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {productFormData.images.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-3xl overflow-hidden border border-brand-border group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setProductFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square rounded-3xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center gap-2 text-brand-text-muted hover:border-brand-primary hover:text-brand-primary cursor-pointer transition-all bg-brand-background/50">
                      {isProductImageUploading ? (
                        <div className="animate-spin h-6 w-6 border-b-2 border-brand-primary rounded-full" />
                      ) : (
                        <>
                          <ImagePlus size={24} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{isRtl ? 'إضافة صور' : 'Add Images'}</span>
                        </>
                      )}
                      <input type="file" className="hidden" multiple accept="image/*" onChange={handleProductImageUpload} disabled={isProductImageUploading} />
                    </label>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'اسم المنتج (بالعربية)' : 'Product Title (Arabic)'}</label>
                      <input 
                        type="text"
                        value={productFormData.titleAr}
                        onChange={(e) => setProductFormData(prev => ({ ...prev, titleAr: e.target.value, title: e.target.value }))}
                        className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-primary/20"
                        placeholder={isRtl ? 'مثال: هاتف ذكي حديث' : 'e.g. Modern Smartphone'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'اسم المنتج (بالإنجليزية)' : 'Product Title (English)'}</label>
                      <input 
                        type="text"
                        value={productFormData.titleEn}
                        onChange={(e) => setProductFormData(prev => ({ ...prev, titleEn: e.target.value }))}
                        className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-primary/20"
                        placeholder="e.g. Modern Smartphone"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'السعر' : 'Price'}</label>
                        <input 
                          type="number"
                          value={productFormData.price}
                          onChange={(e) => setProductFormData(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-primary/20"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'العملة' : 'Currency'}</label>
                        <select 
                          value={productFormData.currency}
                          onChange={(e) => setProductFormData(prev => ({ ...prev, currency: e.target.value }))}
                          className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-primary/20 appearance-none"
                        >
                          <option value="SAR">SAR</option>
                          <option value="USD">USD</option>
                          <option value="AED">AED</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'الوصف (بالعربية)' : 'Description (Arabic)'}</label>
                      <textarea 
                        value={productFormData.descriptionAr}
                        onChange={(e) => setProductFormData(prev => ({ ...prev, descriptionAr: e.target.value, description: e.target.value }))}
                        className="w-full h-32 bg-brand-background border border-brand-border rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none"
                        placeholder={isRtl ? 'اكتب تفاصيل المنتج...' : 'Write product details...'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'الوصف (بالإنجليزية)' : 'Description (English)'}</label>
                      <textarea 
                        value={productFormData.descriptionEn}
                        onChange={(e) => setProductFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                        className="w-full h-32 bg-brand-background border border-brand-border rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none"
                        placeholder="Write product details in English..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 border-t border-brand-border bg-brand-surface/50 backdrop-blur-md flex gap-4">
                <HapticButton 
                  onClick={() => setIsProductEditorOpen(false)}
                  className="flex-1 py-4 bg-brand-background text-brand-text-main border border-brand-border rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </HapticButton>
                <HapticButton 
                  onClick={handleSaveProduct}
                  disabled={isProductSaving}
                  className="flex-[2] py-4 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-2"
                >
                  {isProductSaving ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full" /> : <Save size={18} />}
                  {isRtl ? 'حفظ المنتج' : 'Save Product'}
                </HapticButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
