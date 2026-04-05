import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserProfile, Category, AppFeatures, MarketplaceItem } from '../../../core/types';
import { db, auth } from '../../../core/firebase';
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove, query, where, increment } from 'firebase/firestore';
import { verifyBeforeUpdateEmail } from 'firebase/auth';
import { NotificationSettings } from '../../../shared/components/NotificationSettings';
import { CustomerProfileLayout, SupplierProfileLayout, AdminProfileLayout } from './ProfileLayouts';
import { ProductDetailsModal } from '../../../shared/components/ProductDetailsModal';
import { 
  User, Building2, Phone, Mail, Globe, MapPin, Tag, ArrowLeft, Edit2, 
  Check, X, Save, Camera, UserPlus, UserMinus, Sparkles, ShieldCheck, 
  ShieldAlert, FileText, Wand2, Palette, Link as LinkIcon, Calendar,
  MessageSquare, Heart, Share2, MoreHorizontal, Settings, Activity,
  ShoppingBag, Star, TrendingUp, Award, RefreshCw, Lightbulb,
  LayoutDashboard, Package, Bookmark, Receipt, BarChart2,
  Hammer, Zap, Droplets, Wrench, Briefcase, Cpu, Layers, Monitor, ChevronRight, Plus
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../core/firebase';
import imageCompression from 'browser-image-compression';
import { 
  translateText, verifyDocument, optimizeSupplierProfile, 
  generateSupplierLogo, suggestSupplierCategories, getProfileInsights 
} from '../../../core/services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { AICategorySelector } from './AICategorySelector';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter 
} from "../../../shared/components/ui/dialog";
import { Button } from "../../../shared/components/ui/button";
import { toast } from 'sonner';

// shadcn/ui components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../shared/components/ui/tabs";
import { Badge } from "../../../shared/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../../shared/components/ui/avatar";
import { Separator } from "../../../shared/components/ui/separator";
import { ScrollArea } from "../../../shared/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../shared/components/ui/card";
import { Skeleton } from "../../../shared/components/ui/skeleton";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../../shared/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../shared/components/ui/tooltip";

interface ProfileViewProps {
  userId?: string;
  profile?: UserProfile | null;
  features: AppFeatures;
  onBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ userId, profile: initialProfile, features, onBack }) => {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [loading, setLoading] = useState(!initialProfile);
  const [categories, setCategories] = useState<Category[]>([]);
  const isRtl = i18n.language === 'ar';

  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeStatus, setEmailChangeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailChangeMessage, setEmailChangeMessage] = useState('');

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCoordinates, setEditCoordinates] = useState<{latitude: number, longitude: number} | null>(null);
  const [editWebsite, setEditWebsite] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'product' | 'service'>('product');
  const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isTranslatingBio, setIsTranslatingBio] = useState(false);
  const [translatedBio, setTranslatedBio] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogoPreview, setGeneratedLogoPreview] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [supplierProducts, setSupplierProducts] = useState<MarketplaceItem[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [productFilter, setProductFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupplierProducts = async () => {
      if (!profile?.uid || profile.role !== 'supplier') return;
      try {
        const q = query(collection(db, 'marketplace'), where('sellerId', '==', profile.uid));
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceItem));
        setSupplierProducts(products);
      } catch (error) {
        console.error('Error fetching supplier products:', error);
      }
    };

    fetchSupplierProducts();
  }, [profile?.uid]);

  const getCategoryIcon = (category: Category) => {
    const name = (category.nameEn || '').toLowerCase();
    if (name.includes('construct') || name.includes('build') || name.includes('hammer')) return <Hammer size={16} />;
    if (name.includes('electr') || name.includes('power') || name.includes('zap')) return <Zap size={16} />;
    if (name.includes('plumb') || name.includes('water') || name.includes('drop')) return <Droplets size={16} />;
    if (name.includes('tech') || name.includes('it') || name.includes('computer')) return <Monitor size={16} />;
    if (name.includes('service') || name.includes('consult') || name.includes('briefcase')) return <Briefcase size={16} />;
    if (name.includes('manufact') || name.includes('factor') || name.includes('cpu')) return <Cpu size={16} />;
    if (name.includes('layer') || name.includes('design') || name.includes('stack')) return <Layers size={16} />;
    if (name.includes('maintenance') || name.includes('repair') || name.includes('wrench')) return <Wrench size={16} />;
    return <ShoppingBag size={16} />;
  };

  const getCategoryProductCount = (categoryId: string) => {
    return supplierProducts.filter(p => p.categories.includes(categoryId)).length;
  };

  const getAICategoryDescription = (category: Category) => {
    const name = isRtl ? category.nameAr : category.nameEn;
    if (isRtl) {
      return `مورد متخصص في ${name}، يقدم حلولاً مبتكرة ومنتجات عالية الجودة تلبي احتياجات السوق المحلي بكفاءة عالية.`;
    }
    return `Specialized supplier in ${name}, providing innovative solutions and high-quality products that efficiently meet local market needs.`;
  };

  const handleCategoryToggle = (categoryId: string) => {
    setEditCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCategoryClick = (categoryId: string) => {
    setProductFilter(categoryId);
    setActiveTab('products');
    document.querySelector('main')?.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleShareProfile = () => {
    setIsShareModalOpen(true);
  };

  const handleNativeShare = async () => {
    if (!profile) return;
    const shareUrl = `${window.location.origin}/profile/${profile.uid}`;
    const shareTitle = isRtl ? `ملف ${profile.companyName || profile.name} على سوق كونكت` : `${profile.companyName || profile.name}'s Profile on Souq Connect`;
    const shareText = isRtl ? `اكتشف منتجات وخدمات ${profile.companyName || profile.name} على منصة سوق كونكت.` : `Check out ${profile.companyName || profile.name}'s products and services on Souq Connect.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    if (!profile) return;
    const shareUrl = `${window.location.origin}/profile/${profile.uid}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(isRtl ? 'تم نسخ رابط الملف الشخصي!' : 'Profile link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error(isRtl ? 'فشل نسخ الرابط' : 'Failed to copy link');
    }
  };

  const handleGenerateInsights = async () => {
    if (!profile) return;
    setIsGeneratingInsights(true);
    try {
      const insights = await getProfileInsights(profile, i18n.language);
      if (insights) {
        const updatedProfile = {
          ...profile,
          aiInsights: {
            ...insights,
            lastUpdated: new Date().toISOString()
          }
        };
        await updateDoc(doc(db, 'users', profile.uid), {
          aiInsights: updatedProfile.aiInsights
        });
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleRefreshInsights = async () => {
    if (!profile || !isSupplier) return;
    
    setIsRefreshingInsights(true);
    try {
      const insights = await getProfileInsights(profile, isRtl ? 'ar' : 'en');
      if (insights) {
        const updatedProfile = { 
          ...profile, 
          aiInsights: {
            ...insights,
            lastUpdated: new Date().toISOString()
          } 
        };
        
        // Update local state
        setProfile(updatedProfile);
        
        // Update Firestore
        const profileRef = doc(db, 'users', profile.uid);
        await updateDoc(profileRef, {
          aiInsights: updatedProfile.aiInsights
        });
      }
    } catch (error) {
      console.error('Error refreshing insights:', error);
    } finally {
      setIsRefreshingInsights(false);
    }
  };

  const handleFollow = async () => {
    if (!auth.currentUser || !profile) return;
    
    // Optimistic UI update
    const previousState = isFollowing;
    const previousCount = profile.followersCount || 0;
    
    setIsFollowing(!previousState);
    setProfile({
      ...profile,
      followersCount: previousState ? Math.max(0, previousCount - 1) : previousCount + 1
    });
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const targetRef = doc(db, 'users', profile.uid);
      
      if (previousState) {
        await updateDoc(userRef, {
          following: arrayRemove(profile.uid)
        });
        await updateDoc(targetRef, {
          followersCount: increment(-1)
        });
      } else {
        await updateDoc(userRef, {
          following: arrayUnion(profile.uid)
        });
        await updateDoc(targetRef, {
          followersCount: increment(1)
        });
      }
    } catch (error) {
      // Revert on failure
      setIsFollowing(previousState);
      setProfile({
        ...profile,
        followersCount: previousCount
      });
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const handleOptimizeProfile = async () => {
    if (!profile) return;
    setIsOptimizing(true);
    try {
      const result = await optimizeSupplierProfile(
        profile.companyName || '',
        editBio || profile.bio || '',
        editKeywords || profile.keywords || [],
        i18n.language
      );

      if (result.suggestedBio) setEditBio(result.suggestedBio);
      if (result.suggestedKeywords) setEditKeywords(result.suggestedKeywords);
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleVerifyDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      const base64Content = base64Data.split(',')[1];

      const result = await verifyDocument(base64Content, file.type);

      if (result.isLegit) {
        const storageRef = ref(storage, `verification/${profile.uid}/${Date.now()}`);
        await uploadBytesResumable(storageRef, file);
        const url = await getDownloadURL(storageRef);

        await updateDoc(doc(db, 'users', profile.uid), {
          verificationDocUrl: url,
          isVerified: true,
          verificationDetails: result.details,
          companyName: result.companyName || profile.companyName
        });

        setProfile({
          ...profile,
          verificationDocUrl: url,
          isVerified: true,
          verificationDetails: result.details,
          companyName: result.companyName || profile.companyName
        });
      } else {
        setVerificationError(isRtl ? 'لم نتمكن من التحقق من هذا المستند. يرجى التأكد من أنه سجل تجاري أو شهادة ضريبية صالحة.' : 'Could not verify this document. Please ensure it is a valid commercial registration or tax certificate.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError(isRtl ? 'حدث خطأ أثناء التحقق.' : 'An error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTranslateBio = async () => {
    if (translatedBio) {
      setTranslatedBio(null);
      return;
    }
    if (!profile?.bio) return;

    setIsTranslatingBio(true);
    try {
      const targetLang = i18n.language === 'ar' ? 'Arabic' : 'English';
      const translation = await translateText(profile.bio, targetLang);
      setTranslatedBio(translation);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslatingBio(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditCompanyName(profile.companyName || '');
      setEditPhone(profile.phone || '');
      setEditLocation(profile.location || '');
      setEditCoordinates(profile.coordinates || null);
      setEditWebsite(profile.website || '');
      setEditBio(profile.bio || '');
      setEditLogoUrl(profile.logoUrl || '');
      setEditCoverUrl(profile.coverUrl || '');
      setEditKeywords(profile.keywords || []);
      setEditCategories(profile.categories || []);
    }
  }, [profile]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setEditCoordinates({ latitude, longitude });
          const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=${i18n.language}`);
          if (!response.ok) throw new Error('Network response was not ok');
          const data = await response.json();
          const state = data.principalSubdivision || data.city || data.locality;
          if (state) {
            setEditLocation(state);
          } else {
            setEditLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (error) {
          console.error("Error fetching location", error);
          setEditLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        setIsDetectingLocation(false);
      }
    );
  };

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      if (!editKeywords.includes(keywordInput.trim())) {
        setEditKeywords([...editKeywords, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setEditKeywords(editKeywords.filter(k => k !== kw));
  };

  const handleGenerateAILogo = async () => {
    if (!profile) return;
    
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let currentUsage = profile.logoGenerationUsage || { count: 0, month: currentMonth };
    
    if (currentUsage.month !== currentMonth) {
      currentUsage = { count: 0, month: currentMonth };
    }

    if (profile.role === 'supplier' && currentUsage.count >= 2) {
      setUploadError(isRtl ? 'لقد استنفدت الحد الأقصى لتوليد الشعار هذا الشهر (مرتين).' : 'You have reached the maximum logo generations for this month (2 times).');
      return;
    }

    const companyName = editCompanyName || profile.companyName || profile.name || 'Company';
    const categoryName = 'General Business'; // We don't have categories in ProfileView directly, but we can use keywords or just general
    
    setIsGeneratingLogo(true);
    setUploadError(null);

    try {
      const result = await generateSupplierLogo(companyName, categoryName, i18n.language);
      
      // Convert base64 to blob
      const response = await fetch(result.logoUrl);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `logos/${profile.uid}/ai_${Date.now()}.png`);
      const metadata = {
        contentType: 'image/png',
      };
      
      const uploadTask = uploadBytesResumable(storageRef, blob, metadata);
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', null, (error) => reject(error), () => resolve(true));
      });
      
      const url = await getDownloadURL(storageRef);
      setEditLogoUrl(url);
      setGeneratedLogoPreview(url);

      if (profile.role === 'supplier') {
        const newUsage = { count: currentUsage.count + 1, month: currentMonth };
        await updateDoc(doc(db, 'users', profile.uid), {
          logoGenerationUsage: newUsage
        });
      }
    } catch (error) {
      console.error("AI Logo generation failed:", error);
      setUploadError(isRtl ? 'فشل توليد الشعار، يرجى المحاولة مرة أخرى' : 'Failed to generate logo, please try again');
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    setIsUploading(true);
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const storageRef = ref(storage, `logos/${profile.uid}/${Date.now()}`);
      await uploadBytesResumable(storageRef, compressedFile);
      const url = await getDownloadURL(storageRef);
      
      if (!isEditing) {
        await updateDoc(doc(db, 'users', profile.uid), { logoUrl: url });
        setProfile({ ...profile, logoUrl: url });
        toast.success(isRtl ? 'تم تحديث الصورة الشخصية!' : 'Profile picture updated!');
      } else {
        setEditLogoUrl(url);
        toast.info(isRtl ? 'تم رفع الصورة، احفظ التغييرات للتأكيد' : 'Picture uploaded, save changes to confirm');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(isRtl ? 'فشل رفع الصورة' : 'Failed to upload picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    setIsUploading(true);
    try {
      const options = { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const storageRef = ref(storage, `covers/${profile.uid}/${Date.now()}`);
      await uploadBytesResumable(storageRef, compressedFile);
      const url = await getDownloadURL(storageRef);
      
      if (!isEditing) {
        await updateDoc(doc(db, 'users', profile.uid), { coverUrl: url });
        setProfile({ ...profile, coverUrl: url });
        toast.success(isRtl ? 'تم تحديث الغلاف بنجاح!' : 'Cover updated successfully!');
      } else {
        setEditCoverUrl(url);
        toast.info(isRtl ? 'تم رفع الغلاف، احفظ التغييرات للتأكيد' : 'Cover uploaded, save changes to confirm');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(isRtl ? 'فشل رفع الغلاف' : 'Failed to upload cover');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSuggestCategories = async () => {
    if (!profile || editKeywords.length === 0) return;
    setIsSuggestingCategories(true);
    try {
      const suggested = await suggestSupplierCategories(
        { name: editName, companyName: editCompanyName, keywords: editKeywords, bio: editBio },
        categories,
        i18n.language
      );
      if (suggested && suggested.length > 0) {
        setEditCategories(Array.from(new Set([...editCategories, ...suggested])));
      }
    } catch (error) {
      console.error("Error suggesting categories:", error);
    } finally {
      setIsSuggestingCategories(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updateData: any = {
        name: editName,
        phone: editPhone,
        location: editLocation,
        ...(editCoordinates ? { coordinates: editCoordinates } : {}),
        website: editWebsite,
        bio: editBio,
        logoUrl: editLogoUrl,
        coverUrl: editCoverUrl,
        keywords: editKeywords,
        categories: editCategories
      };
      
      if (profile.role === 'supplier' || profile.role === 'admin') {
        updateData.companyName = editCompanyName;
      }

      await updateDoc(doc(db, 'users', profile.uid), updateData);
      setProfile({ ...profile, ...updateData });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail || !auth.currentUser) return;
    
    setEmailChangeStatus('loading');
    setEmailChangeMessage('');
    
    try {
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
      setEmailChangeStatus('success');
      setEmailChangeMessage(isRtl 
        ? 'تم إرسال رابط التحقق إلى بريدك الجديد. يرجى التحقق منه لتأكيد التغيير.' 
        : 'Verification link sent to your new email. Please check it to confirm the change.');
      
      // Note: We don't update Firestore yet because the email isn't officially changed 
      // until they click the link. Firebase Auth will handle the actual change.
      // A cloud function or a check on next login would sync it to Firestore.
    } catch (error: any) {
      setEmailChangeStatus('error');
      if (error.code === 'auth/requires-recent-login') {
        setEmailChangeMessage(isRtl 
          ? 'يرجى تسجيل الخروج والدخول مجدداً لأسباب أمنية قبل تغيير البريد الإلكتروني.' 
          : 'Please log out and log back in for security reasons before changing your email.');
      } else {
        setEmailChangeMessage(error.message);
      }
    }
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId && !initialProfile) return;
      
      setLoading(true);
      try {
        const targetUid = userId || initialProfile?.uid;
        if (!targetUid) return;

        const docRef = doc(db, 'users', targetUid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        }

        // Fetch categories
        const catSnap = await getDocs(collection(db, 'categories'));
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
        setCategories(cats);

        // Check if current user is following this profile
        if (auth.currentUser && targetUid !== auth.currentUser.uid) {
          const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (currentUserDoc.exists()) {
            const following = currentUserDoc.data().following || [];
            setIsFollowing(following.includes(targetUid));
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId, initialProfile]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
          <User size={32} className="text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isRtl ? 'الملف الشخصي غير موجود' : 'Profile Not Found'}
        </h2>
        <p className="text-muted-foreground mb-6">
          {isRtl ? 'عذراً، لم نتمكن من العثور على هذا الملف الشخصي.' : 'Sorry, we could not find this profile.'}
        </p>
        {onBack && (
          <HapticButton onClick={onBack} className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium">
            {isRtl ? 'العودة' : 'Go Back'}
          </HapticButton>
        )}
      </div>
    );
  }

  const isOwner = auth.currentUser?.uid === profile.uid;
  const isSupplier = profile.role === 'supplier';
  const displayedCategories = categories.filter(c => profile.categories?.includes(c.id));

  const layoutProps = {
    profile, isOwner, isEditing, setIsEditing, isSaving, handleSaveProfile,
    isUploading, handleCoverUpload, handleLogoUpload, handleGenerateAILogo,
    isGeneratingLogo, editCoverUrl, editLogoUrl, editName, setEditName,
    editCompanyName, setEditCompanyName, editBio, setEditBio, isTranslatingBio,
    handleTranslateBio, isOptimizing, handleOptimizeProfile, handleFollow,
    isFollowing, handleShareProfile, onBack, t, i18n, supplierProducts,
    categories, displayedCategories, editLocation, setEditLocation,
    editWebsite, setEditWebsite, editPhone, setEditPhone,
    editKeywords, setEditKeywords, keywordInput, setKeywordInput,
    handleAddKeyword, handleRemoveKeyword,
    editCategories, setEditCategories, activeCategoryTab, setActiveCategoryTab,
    handleCategoryToggle, isSuggestingCategories, handleSuggestCategories,
    isVerifying, handleVerifyDocument, verificationError,
    isGeneratingInsights, handleGenerateInsights,
    activeTab, setActiveTab, productFilter, setProductFilter,
    getCategoryIcon, getCategoryProductCount, getAICategoryDescription,
    handleCategoryClick,
    isChangingEmail, setIsChangingEmail, newEmail, setNewEmail,
    emailChangeStatus, emailChangeMessage, handleEmailChange,
    onViewProduct: setSelectedItem
  };

  return (
    <TooltipProvider>
      {profile.role === 'customer' && <CustomerProfileLayout {...layoutProps} />}
      {profile.role === 'supplier' && <SupplierProfileLayout {...layoutProps} />}
      {profile.role === 'admin' && <AdminProfileLayout {...layoutProps} />}
      
      <AnimatePresence>
        {selectedItem && (
          <ProductDetailsModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onContactSeller={() => {
              setSelectedItem(null);
            }}
            onViewProfile={(uid) => {
              if (uid === userId) {
                setSelectedItem(null);
              } else {
                // Navigate to another profile if needed
              }
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Generated Logo Preview Modal */}
        {/* Generated Logo Preview Modal */}
        <AnimatePresence>
          {generatedLogoPreview && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-card rounded-[2rem] p-8 max-w-md w-full border border-border/40 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-background"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-light text-foreground tracking-tight">
                    {isRtl ? 'تم تصميم شعارك بنجاح!' : 'Logo Generated Successfully!'}
                  </h3>
                  <button onClick={() => setGeneratedLogoPreview(null)} className="p-2 hover:bg-muted/50 rounded-full transition-colors">
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="aspect-square w-full rounded-3xl overflow-hidden mb-8 border border-border/40 shadow-sm bg-muted/10 flex items-center justify-center p-4">
                  <img src={generatedLogoPreview} alt="Generated Logo" className="w-full h-full object-contain rounded-2xl" />
                </div>
                <HapticButton 
                  onClick={() => setGeneratedLogoPreview(null)}
                  className="w-full py-3.5 bg-foreground text-background rounded-full font-medium hover:bg-foreground/90 transition-all shadow-sm"
                >
                  {isRtl ? 'رائع، اعتمده' : 'Awesome, keep it'}
                </HapticButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Share Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              {isRtl ? 'مشاركة الملف الشخصي' : 'Share Profile'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {isRtl ? 'شارك ملفك الشخصي مع الآخرين لزيادة وصولك' : 'Share your profile with others to increase your reach'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-6 space-y-6">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-border/40">
              <QRCodeCanvas 
                value={`${window.location.origin}/profile/${profile.uid}`} 
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div className="w-full grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="flex items-center gap-2 h-12 rounded-xl"
                onClick={handleCopyLink}
              >
                <LinkIcon size={18} />
                {isRtl ? 'نسخ الرابط' : 'Copy Link'}
              </Button>
              
              <Button 
                className="flex items-center gap-2 h-12 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white border-none"
                onClick={() => {
                  const url = `https://wa.me/?text=${encodeURIComponent((isRtl ? 'اكتشف ملفي الشخصي على سوق كونكت: ' : 'Check out my profile on Souq Connect: ') + window.location.origin + '/profile/' + profile.uid)}`;
                  window.open(url, '_blank');
                }}
              >
                <MessageSquare size={18} />
                {isRtl ? 'واتساب' : 'WhatsApp'}
              </Button>
            </div>

            {navigator.share && (
              <Button 
                variant="secondary"
                className="w-full flex items-center gap-2 h-12 rounded-xl"
                onClick={handleNativeShare}
              >
                <Share2 size={18} />
                {isRtl ? 'خيارات إضافية' : 'More Options'}
              </Button>
            )}
          </div>
          
          <DialogFooter className="sm:justify-center">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsShareModalOpen(false)}
              className="rounded-full"
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
