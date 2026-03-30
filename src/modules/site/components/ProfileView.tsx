import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserProfile, Category, AppFeatures, MarketplaceItem } from '../../../core/types';
import { db, auth } from '../../../core/firebase';
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove, query, where } from 'firebase/firestore';
import { verifyBeforeUpdateEmail } from 'firebase/auth';
import { NotificationSettings } from '../../../shared/components/NotificationSettings';
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
  generateSupplierLogoImage, suggestSupplierCategories, getProfileInsights 
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
    return supplierProducts.filter(p => p.category === categoryId).length;
  };

  const getAICategoryDescription = (category: Category) => {
    const name = isRtl ? category.nameAr : category.nameEn;
    if (isRtl) {
      return `مورد متخصص في ${name}، يقدم حلولاً مبتكرة ومنتجات عالية الجودة تلبي احتياجات السوق المحلي بكفاءة عالية.`;
    }
    return `Specialized supplier in ${name}, providing innovative solutions and high-quality products that efficiently meet local market needs.`;
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
    setIsFollowing(!previousState);
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      if (previousState) {
        await updateDoc(userRef, {
          following: arrayRemove(profile.uid)
        });
      } else {
        await updateDoc(userRef, {
          following: arrayUnion(profile.uid)
        });
      }
    } catch (error) {
      // Revert on failure
      setIsFollowing(previousState);
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

  const removeKeyword = (kw: string) => {
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
      const base64Image = await generateSupplierLogoImage(companyName, categoryName, i18n.language);
      
      // Convert base64 to blob
      const response = await fetch(base64Image);
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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-32 md:pb-12">
        {/* Cover Image Area */}
        <div 
          className="relative h-64 md:h-80 w-full bg-muted/30 overflow-hidden bg-cover bg-center group"
          style={{ backgroundImage: (isEditing ? editCoverUrl : profile.coverUrl) ? `url(${isEditing ? editCoverUrl : profile.coverUrl})` : undefined }}
        >
          {/* Subtle gradient overlay instead of noisy pattern */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-background/80" />
          
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute top-6 left-6 z-40 p-3 bg-background/50 backdrop-blur-xl rounded-full hover:bg-background/80 transition-colors shadow-sm"
            >
              <ArrowLeft size={20} className="text-foreground" />
            </button>
          )}

          {isOwner && (
            <div className="absolute inset-0 z-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]">
              <label className="flex items-center gap-2 px-6 py-3 bg-background/90 backdrop-blur-xl text-foreground rounded-full text-sm font-semibold shadow-lg hover:bg-background transition-all cursor-pointer transform hover:scale-105 active:scale-95">
                {isUploading ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <Camera size={20} />
                )}
                {isRtl ? 'تغيير صورة الغلاف' : 'Change Cover Photo'}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleCoverUpload} 
                  className="hidden" 
                  disabled={isUploading}
                />
              </label>
            </div>
          )}
        </div>

        {/* Main Profile Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-30">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col md:flex-row gap-8 items-start"
          >
            
            {/* Avatar & Quick Info Sidebar */}
            <div className="w-full md:w-1/3 flex flex-col items-center md:items-start">
              <div className="relative group">
                <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background shadow-sm bg-muted/30 relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
                  <AvatarImage src={isEditing ? editLogoUrl : profile.logoUrl || ''} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-muted/50 text-muted-foreground">
                    {isSupplier ? <Building2 size={40} /> : <User size={40} />}
                  </AvatarFallback>
                </Avatar>
                
                {isOwner && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                    <label className="flex flex-col items-center justify-center cursor-pointer mb-2 hover:text-white/80 transition-colors">
                      {isUploading ? (
                        <RefreshCw size={24} className="animate-spin mb-1" />
                      ) : (
                        <Camera size={24} className="mb-1" />
                      )}
                      <span className="text-[10px] font-medium tracking-wider uppercase">{isRtl ? 'رفع صورة' : 'Upload'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleLogoUpload} 
                        disabled={isUploading} 
                      />
                    </label>
                    <div className="w-8 h-[1px] bg-white/20 my-1" />
                    <button 
                      onClick={handleGenerateAILogo} 
                      disabled={isGeneratingLogo}
                      className="flex flex-col items-center justify-center cursor-pointer mt-1 hover:text-white/80 transition-colors"
                    >
                      {isGeneratingLogo ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                      ) : (
                        <Sparkles size={24} className="mb-1 animate-pulse" />
                      )}
                      <span className="text-[10px] font-medium tracking-wider uppercase">{isRtl ? 'توليد ذكي' : 'AI Logo'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="w-full mt-8 space-y-3">
                {isOwner ? (
                  isEditing ? (
                    <div className="flex gap-3">
                      <HapticButton 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 min-h-[48px] bg-foreground text-background rounded-full font-medium shadow-sm hover:bg-foreground/90 transition-all"
                      >
                        {isSaving ? <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" /> : <Save size={18} />}
                        {isRtl ? 'حفظ التعديلات' : 'Save Changes'}
                      </HapticButton>
                      <HapticButton 
                        onClick={() => setIsEditing(false)}
                        className="flex-1 flex items-center justify-center gap-2 min-h-[48px] bg-muted/50 text-foreground rounded-full font-medium hover:bg-muted transition-all"
                      >
                        <X size={18} />
                        {isRtl ? 'إلغاء' : 'Cancel'}
                      </HapticButton>
                    </div>
                  ) : (
                    <HapticButton 
                      onClick={() => setIsEditing(true)}
                      className="w-full flex items-center justify-center gap-2 min-h-[48px] bg-foreground text-background rounded-full font-medium shadow-sm hover:bg-foreground/90 transition-all"
                    >
                      <Edit2 size={18} />
                      {isRtl ? 'تعديل الملف الشخصي' : 'Edit Profile'}
                    </HapticButton>
                  )
                ) : (
                  <div className="flex gap-3">
                    <HapticButton 
                      onClick={handleFollow}
                      className={`flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-full font-medium shadow-sm transition-all ${
                        isFollowing 
                          ? 'bg-muted/50 text-foreground hover:bg-muted' 
                          : 'bg-foreground text-background hover:bg-foreground/90'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus size={18} />
                          {isRtl ? 'إلغاء المتابعة' : 'Unfollow'}
                        </>
                      ) : (
                        <>
                          <UserPlus size={18} />
                          {isRtl ? 'متابعة' : 'Follow'}
                        </>
                      )}
                    </HapticButton>
                    <HapticButton className="flex-1 flex items-center justify-center gap-2 min-h-[48px] bg-muted/50 text-foreground rounded-full font-medium shadow-sm hover:bg-muted transition-all">
                      <MessageSquare size={18} />
                      {isRtl ? 'مراسلة' : 'Message'}
                    </HapticButton>
                  </div>
                )}
                
                {!isEditing && (
                  <div className="flex gap-3">
                    <HapticButton 
                      onClick={handleShareProfile}
                      className="flex-1 flex items-center justify-center gap-2 min-h-[44px] bg-transparent border border-border/40 text-muted-foreground rounded-full text-sm font-medium hover:bg-muted/30 transition-all"
                    >
                      <Share2 size={16} />
                      {isRtl ? 'مشاركة' : 'Share'}
                    </HapticButton>
                    <HapticButton className="w-[44px] flex items-center justify-center bg-transparent border border-border/40 text-muted-foreground rounded-full hover:bg-muted/30 transition-all">
                      <MoreHorizontal size={16} />
                    </HapticButton>
                  </div>
                )}
              </div>

              {/* Stats Row - Minimalist */}
              <div className="w-full mt-8 flex justify-between items-center px-2">
                <div className="flex flex-col items-center cursor-pointer group">
                  <span className="text-2xl font-light text-foreground tracking-tight group-hover:text-primary transition-colors">1.2k</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{isRtl ? 'متابع' : 'Followers'}</span>
                </div>
                <div className="w-[1px] h-8 bg-border/40" />
                <div className="flex flex-col items-center cursor-pointer group">
                  <span className="text-2xl font-light text-foreground tracking-tight group-hover:text-primary transition-colors">348</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{isRtl ? 'يتابع' : 'Following'}</span>
                </div>
                <div className="w-[1px] h-8 bg-border/40" />
                <div className="flex flex-col items-center cursor-pointer group">
                  <span className="text-2xl font-light text-foreground tracking-tight flex items-center gap-1 group-hover:text-amber-500 transition-colors">
                    4.9 <Star size={14} className="fill-amber-400 text-amber-400 mb-1" />
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{isRtl ? 'التقييم' : 'Rating'}</span>
                </div>
              </div>

              {/* Contact Info (Desktop Sidebar) */}
              <div className="w-full mt-6 space-y-4 hidden md:block">
                <h3 className="font-semibold text-foreground">{isRtl ? 'معلومات التواصل' : 'Contact Info'}</h3>
                <div className="space-y-3 text-sm">
                  {(profile.location || isEditing) && (
                    <div className="flex items-start gap-3 text-muted-foreground">
                      <MapPin size={18} className="shrink-0 mt-0.5 text-primary/70" />
                      {isEditing ? (
                        <div className="flex-1 flex gap-2">
                          <input 
                            type="text" 
                            value={editLocation} 
                            onChange={e => setEditLocation(e.target.value)} 
                            className="flex-1 bg-background border border-input rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-ring"
                            placeholder={isRtl ? 'الموقع' : 'Location'}
                          />
                          <button 
                            onClick={handleDetectLocation} 
                            disabled={isDetectingLocation}
                            className="p-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
                          >
                            {isDetectingLocation ? (
                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <MapPin size={14} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span>{profile.location}</span>
                      )}
                    </div>
                  )}
                  
                  {(profile.website || isEditing) && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Globe size={18} className="shrink-0 text-primary/70" />
                      {isEditing ? (
                        <input 
                          type="url" 
                          value={editWebsite} 
                          onChange={e => setEditWebsite(e.target.value)} 
                          className="flex-1 bg-background border border-input rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-ring"
                          placeholder="https://"
                        />
                      ) : (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors truncate">
                          {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>
                  )}

                  {(profile.phone || isEditing) && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Phone size={18} className="shrink-0 text-primary/70" />
                      {isEditing ? (
                        <input 
                          type="tel" 
                          value={editPhone} 
                          onChange={e => setEditPhone(e.target.value)} 
                          className="flex-1 bg-background border border-input rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-ring"
                          placeholder={isRtl ? 'رقم الهاتف' : 'Phone Number'}
                        />
                      ) : (
                        <a href={`tel:${profile.phone}`} className="hover:text-primary transition-colors">
                          {profile.phone}
                        </a>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar size={18} className="shrink-0 text-primary/70" />
                    <span>{isRtl ? 'انضم في' : 'Joined'} {new Date(profile.createdAt || Date.now()).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>

                  {isSupplier && displayedCategories.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-border/40">
                      <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-3">
                        {isRtl ? 'التخصصات' : 'Specialties'}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {displayedCategories.map(cat => (
                          <button 
                            key={cat.id} 
                            onClick={() => handleCategoryClick(cat.id)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/5 text-primary text-[10px] font-medium border border-primary/10 hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            {getCategoryIcon(cat)}
                            {isRtl ? cat.nameAr : cat.nameEn}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full mt-6 md:mt-24">
              {/* AI Insights Card (Luxury Tech Feature) */}
              {isSupplier && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8"
                >
                  <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/10 via-background to-secondary/10 shadow-2xl relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Sparkles size={120} className="text-primary" />
                    </div>
                    <CardHeader className="pb-2 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Sparkles size={20} className="text-primary animate-pulse" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold tracking-tight">
                              {isRtl ? 'رؤى الذكاء الاصطناعي' : 'AI Strategic Insights'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {isRtl ? 'تحليل ذكي لأداء ملفك الشخصي' : 'Intelligent analysis of your profile performance'}
                            </CardDescription>
                          </div>
                        </div>
                        {isOwner && (
                          <HapticButton 
                            onClick={handleGenerateInsights}
                            disabled={isGeneratingInsights}
                            className="text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full font-medium transition-all flex items-center gap-1.5"
                          >
                            {isGeneratingInsights ? (
                              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            ) : (
                              <Activity size={14} />
                            )}
                            {isRtl ? 'تحديث' : 'Refresh'}
                          </HapticButton>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      {profile.aiInsights ? (
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground leading-relaxed italic">
                            "{isRtl ? profile.aiInsights.summaryAr : profile.aiInsights.summaryEn}"
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-primary/80 flex items-center gap-1.5">
                                <Award size={14} />
                                {isRtl ? 'نقاط القوة' : 'Key Strengths'}
                              </h4>
                              <ul className="space-y-1">
                                {(isRtl ? profile.aiInsights.strengthsAr : profile.aiInsights.strengthsEn).map((s, idx) => (
                                  <li key={idx} className="text-xs flex items-center gap-2">
                                    <div className="w-1 h-1 bg-primary rounded-full" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-secondary/80 flex items-center gap-1.5">
                                <TrendingUp size={14} />
                                {isRtl ? 'توصيات للنمو' : 'Growth Recommendations'}
                              </h4>
                              <ul className="space-y-1">
                                {(isRtl ? profile.aiInsights.recommendationsAr : profile.aiInsights.recommendationsEn).map((r, idx) => (
                                  <li key={idx} className="text-xs flex items-center gap-2">
                                    <div className="w-1 h-1 bg-secondary rounded-full" />
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center space-y-3">
                          <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                            <Sparkles size={24} className="text-primary/30" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {isRtl ? 'لم يتم توليد رؤى بعد. اضغط على تحديث للبدء.' : 'No insights generated yet. Click refresh to start.'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Header Info */}
              <div className="mb-10 text-center md:text-start mt-8 md:mt-0">
                {isEditing ? (
                  <div className="space-y-4 mb-6">
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="w-full text-3xl md:text-4xl font-light bg-transparent border-b border-border/40 px-0 py-2 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50"
                      placeholder={isRtl ? 'الاسم الكامل' : 'Full Name'}
                    />
                    {isSupplier && (
                      <input 
                        type="text" 
                        value={editCompanyName} 
                        onChange={e => setEditCompanyName(e.target.value)} 
                        className="w-full text-xl text-muted-foreground bg-transparent border-b border-border/40 px-0 py-2 focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50"
                        placeholder={isRtl ? 'اسم الشركة' : 'Company Name'}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl md:text-4xl font-light text-foreground tracking-tight flex items-center justify-center md:justify-start gap-3">
                      {profile.name}
                      {profile.isVerified && (
                        <Tooltip>
                          <TooltipTrigger>
                            <ShieldCheck size={22} className="text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isRtl ? 'حساب موثق' : 'Verified Account'}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </h1>
                    {isSupplier && profile.companyName && (
                      <p className="text-lg text-muted-foreground font-light mt-2 flex items-center justify-center md:justify-start gap-2">
                        <Building2 size={18} className="opacity-50" />
                        {profile.companyName}
                      </p>
                    )}
                  </>
                )}
                
                {/* Badges - Minimalist */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-6">
                  <span className="px-4 py-1.5 rounded-full bg-muted/50 text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {isSupplier ? (isRtl ? 'مورد' : 'Supplier') : (isRtl ? 'مستخدم' : 'User')}
                  </span>
                  {profile.isVerified && (
                    <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium tracking-wide uppercase flex items-center">
                      <ShieldCheck size={14} className="mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                      {isRtl ? 'موثق' : 'Verified'}
                    </span>
                  )}
                  {isSupplier && (
                    <span className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium tracking-wide uppercase flex items-center">
                      <Award size={14} className="mr-1.5 rtl:ml-1.5 rtl:mr-0" />
                      {isRtl ? 'بائع مميز' : 'Top Seller'}
                    </span>
                  )}
                  {isSupplier && displayedCategories.slice(0, 2).map(cat => (
                    <span key={cat.id} className="px-4 py-1.5 rounded-full bg-primary/5 text-primary text-[10px] font-bold tracking-widest uppercase border border-primary/10">
                      {isRtl ? cat.nameAr : cat.nameEn}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tabs Section - Clear & Simple */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="relative mb-8">
                  <TabsList className="w-full justify-start bg-transparent h-auto p-0 space-x-6 rtl:space-x-reverse overflow-x-auto hide-scrollbar flex-nowrap border-b border-border/40 rounded-none inline-flex">
                    <TabsTrigger 
                      value="overview" 
                      className="rounded-none px-1 py-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all whitespace-nowrap flex items-center gap-2 border-b-2 border-transparent"
                    >
                      <LayoutDashboard size={16} />
                      {isRtl ? 'نظرة عامة' : 'Overview'}
                    </TabsTrigger>
                    {isSupplier && (
                      <TabsTrigger 
                        value="products" 
                        className="rounded-none px-1 py-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all whitespace-nowrap flex items-center gap-2 border-b-2 border-transparent"
                      >
                        <Package size={16} />
                        {isRtl ? 'المنتجات' : 'Products'}
                      </TabsTrigger>
                    )}
                    {!isSupplier && (
                      <TabsTrigger 
                        value="saved" 
                        className="rounded-none px-1 py-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all whitespace-nowrap flex items-center gap-2 border-b-2 border-transparent"
                      >
                        <Bookmark size={16} />
                        {isRtl ? 'المحفوظات' : 'Saved'}
                      </TabsTrigger>
                    )}
                    {!isSupplier && (
                      <TabsTrigger 
                        value="purchases" 
                        className="rounded-none px-1 py-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all whitespace-nowrap flex items-center gap-2 border-b-2 border-transparent"
                      >
                        <Receipt size={16} />
                        {isRtl ? 'المشتريات' : 'Purchases'}
                      </TabsTrigger>
                    )}
                    {isSupplier && isOwner && (
                      <TabsTrigger 
                        value="analytics" 
                        className="rounded-none px-1 py-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all whitespace-nowrap flex items-center gap-2 border-b-2 border-transparent"
                      >
                        <BarChart2 size={16} />
                        {isRtl ? 'التحليلات' : 'Analytics'}
                      </TabsTrigger>
                    )}
                    <TabsTrigger 
                      value="reviews" 
                      className="rounded-none px-1 py-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all whitespace-nowrap flex items-center gap-2 border-b-2 border-transparent"
                    >
                      <Star size={16} />
                      {isRtl ? 'التقييمات' : 'Reviews'}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="activity" 
                      className="rounded-none px-1 py-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all whitespace-nowrap flex items-center gap-2 border-b-2 border-transparent"
                    >
                      <Activity size={16} />
                      {isRtl ? 'النشاط' : 'Activity'}
                    </TabsTrigger>
                    {isOwner && (
                      <TabsTrigger 
                        value="settings" 
                        className="rounded-none px-1 py-4 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all whitespace-nowrap flex items-center gap-2 border-b-2 border-transparent"
                      >
                        <Settings size={16} />
                        {isRtl ? 'الإعدادات' : 'Settings'}
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-8 outline-none mt-0">
                  
                  {/* Bio Section */}
                  <section className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <FileText size={18} className="text-primary" />
                        </div>
                        {isRtl ? 'نبذة تعريفية' : 'Executive Summary'}
                      </h3>
                      <div className="flex gap-2">
                        {isOwner && (
                          <HapticButton 
                            onClick={handleOptimizeProfile}
                            disabled={isOptimizing}
                            className="text-[10px] px-3 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary rounded-full flex items-center gap-1.5 transition-all border border-primary/10"
                          >
                            {isOptimizing ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Sparkles size={14} />}
                            {isRtl ? 'تحسين ذكي' : 'AI Enhance'}
                          </HapticButton>
                        )}
                        <HapticButton 
                          onClick={handleTranslateBio}
                          disabled={isTranslatingBio}
                          className="text-[10px] px-3 py-1.5 bg-secondary/5 hover:bg-secondary/10 text-secondary rounded-full flex items-center gap-1.5 transition-all border border-secondary/10"
                        >
                          <Globe size={14} />
                          {isTranslatingBio ? '...' : (isRtl ? 'English' : 'العربية')}
                        </HapticButton>
                      </div>
                    </div>
                    
                    <Card className="overflow-hidden border-none bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-xl relative group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 transition-all duration-700 group-hover:bg-primary/10" />
                      <CardContent className="p-6 relative z-10">
                        {isEditing ? (
                          <div className="relative">
                            <textarea
                              value={editBio}
                              onChange={(e) => setEditBio(e.target.value)}
                              className="w-full min-h-[160px] p-4 bg-background/50 border border-input rounded-2xl focus:ring-2 focus:ring-ring resize-none text-sm leading-relaxed transition-all"
                              placeholder={isRtl ? 'اكتب نبذة عنك أو عن شركتك...' : 'Write something about yourself or your company...'}
                            />
                            <div className="absolute bottom-4 right-4">
                              <Badge variant="secondary" className="text-[10px] opacity-50">
                                {editBio.length} {isRtl ? 'حرف' : 'chars'}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">
                              {translatedBio || profile.bio || (isRtl ? 'لا توجد نبذة حتى الآن.' : 'No bio provided yet.')}
                            </p>
                            {translatedBio && (
                              <button 
                                onClick={() => setTranslatedBio(null)}
                                className="mt-4 text-[10px] uppercase tracking-widest font-bold text-primary hover:text-primary/80 transition-colors"
                              >
                                {isRtl ? 'عرض النص الأصلي' : 'Show Original'}
                              </button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </section>

                  {/* AI Strategic Insights - Supplier Only */}
                  {isSupplier && (
                    <section className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Sparkles size={18} className="text-primary" />
                          </div>
                          {isRtl ? 'تحليلات استراتيجية ذكية' : 'AI Strategic Insights'}
                        </h3>
                        <HapticButton 
                          onClick={handleRefreshInsights}
                          disabled={isRefreshingInsights}
                          className="text-[10px] px-3 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary rounded-full flex items-center gap-1.5 transition-all border border-primary/10"
                        >
                          <RefreshCw size={14} className={isRefreshingInsights ? 'animate-spin' : ''} />
                          {isRtl ? 'تحديث' : 'Refresh'}
                        </HapticButton>
                      </div>
                      
                      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/5 via-background/40 to-secondary/5 backdrop-blur-xl shadow-xl relative group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-3xl rounded-full -mr-24 -mt-24 transition-all duration-700 group-hover:bg-primary/20" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 blur-3xl rounded-full -ml-24 -mb-24 transition-all duration-700 group-hover:bg-secondary/20" />
                        
                        <CardContent className="p-6 relative z-10">
                          {isRefreshingInsights ? (
                            <div className="space-y-4 py-4">
                              <Skeleton className="h-4 w-3/4 bg-primary/10" />
                              <Skeleton className="h-4 w-full bg-primary/10" />
                              <Skeleton className="h-4 w-5/6 bg-primary/10" />
                              <div className="grid grid-cols-2 gap-4 pt-4">
                                <Skeleton className="h-20 rounded-2xl bg-primary/5" />
                                <Skeleton className="h-20 rounded-2xl bg-secondary/5" />
                              </div>
                            </div>
                          ) : profile.aiInsights ? (
                            <div className="space-y-6">
                              <p className="text-sm text-muted-foreground leading-relaxed italic">
                                "{isRtl ? profile.aiInsights.summaryAr : profile.aiInsights.summaryEn}"
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                  <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <TrendingUp size={12} />
                                    {isRtl ? 'نقاط القوة' : 'Key Strengths'}
                                  </h4>
                                  <ul className="space-y-1.5">
                                    {(isRtl ? profile.aiInsights.strengthsAr : profile.aiInsights.strengthsEn).map((s, i) => (
                                      <li key={i} className="text-xs text-foreground flex items-center gap-2">
                                        <div className="w-1 h-1 bg-primary rounded-full" />
                                        {s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                
                                <div className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                                  <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Lightbulb size={12} />
                                    {isRtl ? 'توصيات ذكية' : 'AI Recommendations'}
                                  </h4>
                                  <ul className="space-y-1.5">
                                    {(isRtl ? profile.aiInsights.recommendationsAr : profile.aiInsights.recommendationsEn).map((r, i) => (
                                      <li key={i} className="text-xs text-foreground flex items-center gap-2">
                                        <div className="w-1 h-1 bg-secondary rounded-full" />
                                        {r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                <Sparkles size={32} className="text-primary/40" />
                              </div>
                              <p className="text-sm text-muted-foreground max-w-xs mb-4">
                                {isRtl 
                                  ? 'احصل على تحليلات استراتيجية لملفك الشخصي باستخدام الذكاء الاصطناعي' 
                                  : 'Get strategic insights for your profile using AI analysis'}
                              </p>
                              <HapticButton 
                                onClick={handleRefreshInsights}
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium shadow-md hover:bg-primary/90 transition-all"
                              >
                                {isRtl ? 'توليد التحليلات' : 'Generate Insights'}
                              </HapticButton>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </section>
                  )}

                  {/* Categories & Keywords (Supplier only) */}
                  {isSupplier && (
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border/40">
                      {/* Categories */}
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                          <ShoppingBag size={16} className="opacity-70" />
                          {isRtl ? 'الفئات' : 'Categories'}
                        </h3>
                        {isEditing ? (
                          <div className="bg-muted/10 rounded-2xl p-4 border border-border/40">
                            <AICategorySelector
                              categories={categories}
                              selectedCategoryIds={editCategories}
                              onChange={setEditCategories}
                              isRtl={isRtl}
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {displayedCategories.length > 0 ? displayedCategories.map(cat => {
                              const productCount = getCategoryProductCount(cat.id);
                              return (
                                <div 
                                  key={cat.id} 
                                  onClick={() => handleCategoryClick(cat.id)}
                                  className="group relative flex flex-col p-5 rounded-2xl bg-background border border-border/50 shadow-sm hover:border-primary/30 transition-all hover:shadow-xl cursor-pointer overflow-hidden"
                                >
                                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                                  
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 transform group-hover:scale-110 shadow-sm">
                                      {getCategoryIcon(cat)}
                                    </div>
                                    <Badge variant="secondary" className="bg-muted/30 text-muted-foreground font-mono text-[10px] px-2 py-0.5 rounded-full border-none">
                                      {productCount} {isRtl ? 'منتج' : 'Products'}
                                    </Badge>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                                      {isRtl ? cat.nameAr : cat.nameEn}
                                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-primary" />
                                    </h4>
                                    <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2 font-light italic">
                                      {getAICategoryDescription(cat)}
                                    </p>
                                  </div>

                                  <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-2">
                                    <div className="flex -space-x-2 rtl:space-x-reverse">
                                      {[1, 2, 3].map(i => (
                                        <div key={i} className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center overflow-hidden">
                                          <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                                            <Package size={8} className="text-primary/40" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      {isRtl ? 'تصفح التشكيلة' : 'Browse collection'}
                                    </span>
                                  </div>
                                </div>
                              );
                            }) : (
                              <span className="text-sm text-muted-foreground/70 italic font-light">{isRtl ? 'لم يتم تحديد فئات' : 'No categories selected'}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Keywords */}
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Tag size={16} className="opacity-70" />
                          {isRtl ? 'الكلمات المفتاحية' : 'Keywords'}
                        </h3>
                        {isEditing && (
                          <div className="mb-4">
                            <input
                              type="text"
                              value={keywordInput}
                              onChange={(e) => setKeywordInput(e.target.value)}
                              onKeyDown={handleAddKeyword}
                              placeholder={isRtl ? 'أضف كلمة مفتاحية واضغط Enter...' : 'Add keyword & press Enter...'}
                              className="w-full px-4 py-2.5 bg-transparent border-b border-border/40 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/50"
                            />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {editKeywords.length > 0 ? editKeywords.map((kw) => (
                            <span key={kw} className="px-3 py-1.5 rounded-lg bg-muted/30 text-foreground text-sm font-medium border border-border/50 flex items-center gap-1.5 transition-colors hover:bg-muted/50">
                              <span className="text-muted-foreground opacity-50">#</span>
                              {kw}
                              {isEditing && (
                                <button onClick={() => removeKeyword(kw)} className="hover:text-destructive opacity-70 hover:opacity-100 transition-opacity ml-1">
                                  <X size={14} />
                                </button>
                              )}
                            </span>
                          )) : (
                            <span className="text-sm text-muted-foreground/70 italic font-light">{isRtl ? 'لا توجد كلمات مفتاحية' : 'No keywords added'}</span>
                          )}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Mobile Contact Info (Visible only on small screens) */}
                  <section className="md:hidden space-y-4 pt-8 border-t border-border/40">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">{isRtl ? 'معلومات التواصل' : 'Contact Info'}</h3>
                    <div className="space-y-4 text-sm">
                      {(profile.location || isEditing) && (
                        <div className="flex items-center gap-3 text-foreground">
                          <MapPin size={18} className="shrink-0 opacity-50" />
                          {isEditing ? (
                            <div className="flex-1 flex gap-2">
                              <input 
                                type="text" 
                                value={editLocation} 
                                onChange={e => setEditLocation(e.target.value)} 
                                className="flex-1 bg-transparent border-b border-border/40 px-0 py-1.5 text-sm focus:outline-none focus:border-foreground transition-colors"
                                placeholder={isRtl ? 'الموقع' : 'Location'}
                              />
                              <button 
                                onClick={handleDetectLocation} 
                                disabled={isDetectingLocation}
                                className="p-2 bg-muted/50 text-foreground rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                              >
                                {isDetectingLocation ? (
                                  <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                                ) : (
                                  <MapPin size={16} />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="font-light">{profile.location}</span>
                          )}
                        </div>
                      )}
                      {(profile.website || isEditing) && (
                        <div className="flex items-center gap-3 text-foreground">
                          <Globe size={18} className="shrink-0 opacity-50" />
                          {isEditing ? (
                            <input 
                              type="url" 
                              value={editWebsite} 
                              onChange={e => setEditWebsite(e.target.value)} 
                              className="flex-1 bg-transparent border-b border-border/40 px-0 py-1.5 text-sm focus:outline-none focus:border-foreground transition-colors"
                              placeholder={isRtl ? 'الموقع الإلكتروني' : 'Website'}
                            />
                          ) : (
                            <span className="truncate font-light">{profile.website}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                </TabsContent>

                {/* Products/Services Tab */}
                {isSupplier && (
                  <TabsContent value="products" className="outline-none mt-0">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium text-foreground">
                            {isRtl ? 'منتجات المورد' : 'Supplier Products'}
                          </h3>
                          {productFilter && (
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 flex items-center gap-1">
                              {isRtl ? 'تصفية حسب الفئة' : 'Filtered by category'}
                              <button onClick={() => setProductFilter(null)} className="hover:text-destructive transition-colors">
                                <X size={12} />
                              </button>
                            </Badge>
                          )}
                        </div>
                        {isOwner && (
                          <HapticButton className="px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium shadow-sm hover:bg-primary/90 transition-all text-xs flex items-center gap-2">
                            <Plus size={14} />
                            {isRtl ? 'إضافة منتج' : 'Add Product'}
                          </HapticButton>
                        )}
                      </div>

                      {supplierProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {supplierProducts
                            .filter(p => !productFilter || p.category === productFilter)
                            .map(product => (
                              <Card key={product.id} className="overflow-hidden border-border/40 hover:shadow-lg transition-all group rounded-2xl">
                                <div className="aspect-square bg-muted relative overflow-hidden">
                                  {product.images && product.images[0] ? (
                                    <img 
                                      src={product.images[0]} 
                                      alt={product.title} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                      <Package size={32} strokeWidth={1} />
                                    </div>
                                  )}
                                  <div className="absolute top-3 right-3">
                                    <Badge className="bg-background/80 backdrop-blur-md text-foreground border-none shadow-sm">
                                      {product.price} {product.currency}
                                    </Badge>
                                  </div>
                                </div>
                                <CardHeader className="p-4 pb-2">
                                  <CardTitle className="text-sm font-semibold line-clamp-1">{product.title}</CardTitle>
                                  <CardDescription className="text-xs line-clamp-2 min-h-[2.5rem]">
                                    {product.description}
                                  </CardDescription>
                                </CardHeader>
                                <CardFooter className="p-4 pt-0 flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Tag size={10} />
                                    <span>{product.category}</span>
                                  </div>
                                  <HapticButton className="p-2 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all">
                                    <ChevronRight size={14} />
                                  </HapticButton>
                                </CardFooter>
                              </Card>
                            ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-muted/20 border border-border/30">
                          <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-6 shadow-sm border border-border/40">
                            <ShoppingBag size={24} className="text-muted-foreground" />
                          </div>
                          <h3 className="text-xl font-light text-foreground mb-2 tracking-tight">
                            {isRtl ? 'لا توجد منتجات' : 'No Products Found'}
                          </h3>
                          <p className="text-muted-foreground/70 max-w-sm mx-auto mb-8 font-light text-sm">
                            {isRtl ? 'لم يقم هذا المورد بإضافة أي منتجات بعد.' : 'This supplier hasn\'t added any products yet.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}

                {/* Saved Items Tab */}
                {!isSupplier && (
                  <TabsContent value="saved" className="outline-none mt-0">
                    <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-muted/20 border border-border/30">
                      <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-6 shadow-sm border border-border/40">
                        <Heart size={24} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-light text-foreground mb-2 tracking-tight">
                        {isRtl ? 'العناصر المحفوظة' : 'Saved Items'}
                      </h3>
                      <p className="text-muted-foreground/70 max-w-sm mx-auto font-light text-sm">
                        {isRtl ? 'لم تقم بحفظ أي عناصر بعد.' : 'You haven\'t saved any items yet.'}
                      </p>
                    </div>
                  </TabsContent>
                )}

                {/* Purchase History Tab */}
                {!isSupplier && (
                  <TabsContent value="purchases" className="outline-none mt-0">
                    <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-muted/20 border border-border/30">
                      <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-6 shadow-sm border border-border/40">
                        <ShoppingBag size={24} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-light text-foreground mb-2 tracking-tight">
                        {isRtl ? 'سجل المشتريات' : 'Purchase History'}
                      </h3>
                      <p className="text-muted-foreground/70 max-w-sm mx-auto font-light text-sm">
                        {isRtl ? 'لم تقم بأي عمليات شراء بعد.' : 'You haven\'t made any purchases yet.'}
                      </p>
                    </div>
                  </TabsContent>
                )}

                {/* Analytics Tab */}
                {isSupplier && isOwner && (
                  <TabsContent value="analytics" className="outline-none mt-0">
                    <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-muted/20 border border-border/30">
                      <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-6 shadow-sm border border-border/40">
                        <Sparkles size={24} className="text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-light text-foreground mb-2 tracking-tight">
                        {isRtl ? 'لوحة التحليلات' : 'Analytics Dashboard'}
                      </h3>
                      <p className="text-muted-foreground/70 max-w-sm mx-auto font-light text-sm">
                        {isRtl ? 'سيتم عرض إحصائيات متجرك هنا قريباً.' : 'Your store statistics will be displayed here soon.'}
                      </p>
                    </div>
                  </TabsContent>
                )}

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="outline-none mt-0">
                  <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-muted/20 border border-border/30">
                    <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-6 shadow-sm border border-border/40">
                      <Star size={24} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-light text-foreground mb-2 tracking-tight">
                      {isRtl ? 'التقييمات والمراجعات' : 'Ratings & Reviews'}
                    </h3>
                    <p className="text-muted-foreground/70 max-w-sm mx-auto font-light text-sm">
                      {isRtl ? 'لا توجد تقييمات حتى الآن.' : 'No reviews available yet.'}
                    </p>
                  </div>
                </TabsContent>

                {/* Activity Feed Tab */}
                <TabsContent value="activity" className="outline-none mt-0">
                  <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-muted/20 border border-border/30">
                    <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mb-6 shadow-sm border border-border/40">
                      <Activity size={24} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-light text-foreground mb-2 tracking-tight">
                      {isRtl ? 'سجل النشاط' : 'Activity Feed'}
                    </h3>
                    <p className="text-muted-foreground/70 max-w-sm mx-auto font-light text-sm">
                      {isRtl ? 'لا يوجد نشاط حديث لعرضه.' : 'No recent activity to display.'}
                    </p>
                  </div>
                </TabsContent>

                {/* Settings Tab */}
                {isOwner && (
                  <TabsContent value="settings" className="space-y-6 outline-none mt-0">
                    <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
                      <CardHeader className="pb-4 border-b border-border/40">
                        <CardTitle className="flex items-center gap-2 text-lg font-medium">
                          <Settings size={18} className="opacity-70" />
                          {isRtl ? 'إعدادات الحساب' : 'Account Settings'}
                        </CardTitle>
                        <CardDescription className="text-sm font-light">
                          {isRtl ? 'إدارة تفضيلات حسابك والأمان' : 'Manage your account preferences and security'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8 pt-6">
                        
                        {/* Email Settings */}
                        <div className="space-y-4">
                          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</label>
                          <div className="flex gap-3">
                            <input 
                              type="email" 
                              value={isChangingEmail ? newEmail : (auth.currentUser?.email || '')}
                              onChange={(e) => {
                                if (!isChangingEmail) setIsChangingEmail(true);
                                setNewEmail(e.target.value);
                              }}
                              disabled={emailChangeStatus === 'loading'}
                              className="flex-1 bg-transparent border-b border-border/40 px-0 py-2 text-sm focus:outline-none focus:border-foreground transition-colors disabled:opacity-50"
                            />
                            {isChangingEmail && (
                              <HapticButton 
                                onClick={handleEmailChange}
                                disabled={emailChangeStatus === 'loading'}
                                className="px-6 py-2 bg-foreground text-background rounded-full text-sm font-medium hover:bg-foreground/90 transition-all disabled:opacity-50"
                              >
                                {emailChangeStatus === 'loading' ? <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> : (isRtl ? 'تحديث' : 'Update')}
                              </HapticButton>
                            )}
                          </div>
                          {emailChangeMessage && (
                            <p className={`text-sm ${emailChangeStatus === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                              {emailChangeMessage}
                            </p>
                          )}
                        </div>

                        <Separator className="bg-border/40" />

                        {/* Notification Settings */}
                        <div>
                          <NotificationSettings profile={profile} onUpdateProfile={setProfile} />
                        </div>

                        <Separator className="bg-border/40" />

                        {/* Branding Settings Link */}
                        {isSupplier && (
                          <div className="flex items-center justify-between p-5 bg-muted/20 rounded-2xl border border-border/40">
                            <div>
                              <h4 className="font-medium text-foreground flex items-center gap-2 text-sm">
                                <Palette size={16} className="opacity-70" />
                                {isRtl ? 'تخصيص العلامة التجارية' : 'Brand Customization'}
                              </h4>
                              <p className="text-sm text-muted-foreground/70 mt-1 font-light">
                                {isRtl ? 'تخصيص الألوان والخطوط لمتجرك' : 'Customize colors and typography for your storefront'}
                              </p>
                            </div>
                            <HapticButton 
                              onClick={() => (window as any).navigateApp?.('branding')}
                              className="px-6 py-2 bg-background border border-border/40 text-foreground rounded-full text-sm font-medium hover:bg-muted/50 transition-colors shadow-sm"
                            >
                              {isRtl ? 'تخصيص' : 'Customize'}
                            </HapticButton>
                          </div>
                        )}

                      </CardContent>
                    </Card>

                    {/* Verification Section */}
                    {isSupplier && !profile.isVerified && (
                      <Card className="border-amber-200/50 bg-amber-50/30 shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="pb-4 border-b border-amber-200/30">
                          <CardTitle className="flex items-center gap-2 text-amber-800 text-lg font-medium">
                            <ShieldAlert size={18} />
                            {isRtl ? 'توثيق الحساب' : 'Account Verification'}
                          </CardTitle>
                          <CardDescription className="text-amber-700/70 text-sm font-light">
                            {isRtl ? 'قم برفع السجل التجاري لتوثيق حسابك وزيادة الموثوقية.' : 'Upload your commercial register to verify your account and build trust.'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <label className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-amber-100/50 text-amber-800 border border-amber-200/50 rounded-full font-medium cursor-pointer hover:bg-amber-100 transition-colors text-sm">
                              {isVerifying ? (
                                <div className="w-4 h-4 border-2 border-amber-800/30 border-t-amber-800 rounded-full animate-spin" />
                              ) : (
                                <>
                                  <FileText size={16} />
                                  {isRtl ? 'اختر ملف (PDF/صورة)' : 'Select File (PDF/Image)'}
                                </>
                              )}
                              <input 
                                type="file" 
                                accept=".pdf,image/*" 
                                className="hidden" 
                                onChange={handleVerifyDocument}
                                disabled={isVerifying}
                              />
                            </label>
                          </div>
                          {verificationError && (
                            <p className="mt-4 text-sm text-destructive font-medium">{verificationError}</p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </motion.div>
        </div>

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
                className="bg-card rounded-[2rem] p-8 max-w-md w-full border border-border/40 shadow-2xl"
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
      </div>

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
