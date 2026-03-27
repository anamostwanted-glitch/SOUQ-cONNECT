import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserProfile, Category, AppFeatures } from '../types';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { verifyBeforeUpdateEmail } from 'firebase/auth';
import { NotificationSettings } from './NotificationSettings';
import { User, Building2, Phone, Mail, Globe, MapPin, Tag, ArrowLeft, Edit2, Check, X, Save, Camera, UserPlus, UserMinus } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import imageCompression from 'browser-image-compression';
import { translateText, verifyDocument, optimizeSupplierProfile, generateSupplierLogoImage, suggestSupplierCategories } from '../services/geminiService';
import { Sparkles, ShieldCheck, ShieldAlert, FileText, Wand2, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { HapticButton } from './HapticButton';

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
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'product' | 'service'>('product');
  const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);
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
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${i18n.language}`);
          const data = await response.json();
          const state = data.address?.state || data.address?.region || data.address?.city || data.address?.county;
          if (state) setEditLocation(state);
        } catch (error) {
          console.error("Error fetching location", error);
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
    
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(isRtl ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجابايت)' : 'File too large (max 2MB)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      const storageRef = ref(storage, `logos/${profile.uid}/${Date.now()}`);
      
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);
      
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', null, (error) => reject(error), () => resolve(true));
      });

      const url = await getDownloadURL(storageRef);
      setEditLogoUrl(url);
    } catch (err: any) {
      console.error('Upload error:', err);
      // Fallback to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    const fetchData = async () => {
      if (userId && !initialProfile) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${userId}`);
        }
      }

      try {
        const catsSnap = await getDocs(collection(db, 'categories'));
        const catsData = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(catsData);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'categories');
      }

      // Check following status
      if (auth.currentUser && (userId || initialProfile)) {
        const targetUid = userId || initialProfile?.uid;
        if (targetUid && targetUid !== auth.currentUser.uid) {
          try {
            const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (currentUserDoc.exists()) {
              const data = currentUserDoc.data() as UserProfile;
              setIsFollowing(data.following?.includes(targetUid) || false);
            }
          } catch (error) {
            console.error("Error checking following status:", error);
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [userId, initialProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-brand-text-muted">
        {t('profile_not_found')}
      </div>
    );
  }

  const displayedCategories = isEditing 
    ? categories.filter(c => editCategories.includes(c.id))
    : categories.filter(c => profile.categories?.includes(c.id));

  return (
    <div className="max-w-3xl mx-auto p-6">
      {onBack && (
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-brand-text-muted hover:text-brand-text-main transition-colors"
        >
          <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          <span>{t('back')}</span>
        </button>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-brand-border-light overflow-hidden">
        {/* Header/Cover area */}
        <div className="h-32 bg-gradient-to-r from-brand-primary to-brand-primary-hover"></div>
        
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="relative group flex flex-col items-center">
              <div className="p-1 bg-white rounded-2xl shadow-md relative">
                {editLogoUrl ? (
                  <img 
                    src={editLogoUrl} 
                    alt={profile.name} 
                    className="w-24 h-24 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-brand-surface flex items-center justify-center text-brand-text-muted">
                    <User size={48} />
                  </div>
                )}
                {isEditing && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity m-1">
                    <Camera className="text-white" size={24} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading || isGeneratingLogo} />
                  </label>
                )}
                {(isUploading || isGeneratingLogo) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl m-1">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleGenerateAILogo}
                  disabled={isGeneratingLogo || isUploading}
                  className="mt-3 w-full max-w-[140px] flex items-center justify-center gap-1.5 py-1.5 px-2 bg-zinc-900 hover:bg-black text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  title={isRtl ? 'ابتكر شعاراً فخماً يعكس هوية علامتك التجارية باستخدام الذكاء الاصطناعي' : 'Create a luxurious logo that reflects your brand identity using AI'}
                >
                  <Sparkles size={12} className={isGeneratingLogo ? "animate-pulse text-amber-200" : ""} />
                  {isRtl ? (isGeneratingLogo ? 'جاري الابتكار...' : 'تصميم بالذكاء الاصطناعي') : (isGeneratingLogo ? 'Generating...' : 'AI Design')}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 pb-2">
              {auth.currentUser?.uid === profile.uid && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onBack ? onBack() : null} // This is a bit hacky, I need a way to navigate to 'branding'
                    className="hidden" // I'll actually use a proper navigation if I can pass setView
                  >
                  </button>
                  {/* Since I don't have navigate here, I'll use a custom event or just add it to the Layout if possible. 
                      Actually, ProfileView is called from App.tsx which has navigate. 
                      I'll add an onNavigate prop to ProfileView. */}
                  <button
                    onClick={() => (window as any).navigateApp?.('branding')}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-surface text-brand-text-main rounded-xl font-bold hover:bg-brand-background transition-all border border-brand-border"
                  >
                    <Palette size={18} />
                    <span className="hidden sm:inline">{isRtl ? 'تخصيص الهوية' : 'Branding'}</span>
                  </button>
                  {isEditing && (
                    <HapticButton
                      onClick={handleOptimizeProfile}
                      disabled={isOptimizing}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl font-bold hover:bg-brand-primary/20 transition-all border border-brand-primary/20"
                      title={isRtl ? 'تحسين الملف الشخصي بالذكاء الاصطناعي' : 'Optimize Profile with AI'}
                    >
                      {isOptimizing ? (
                        <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Wand2 size={18} />
                      )}
                      <span className="hidden sm:inline">{isRtl ? 'تحسين بالذكاء الاصطناعي' : 'AI Optimize'}</span>
                    </HapticButton>
                  )}
                  <HapticButton
                    onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                    disabled={isSaving || isUploading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      isEditing 
                      ? 'bg-brand-success text-white hover:bg-brand-success shadow-lg shadow-brand-success/30' 
                      : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'
                    }`}
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : isEditing ? (
                      <Save size={18} />
                    ) : (
                      <Edit2 size={18} />
                    )}
                    <span>{isEditing ? (isRtl ? 'حفظ' : 'Save') : (isRtl ? 'تعديل' : 'Edit')}</span>
                  </HapticButton>
                </div>
              )}
              {auth.currentUser && auth.currentUser.uid !== profile.uid && profile.role === 'supplier' && (
                <HapticButton
                  onClick={handleFollow}
                  disabled={isFollowLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isFollowing 
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                    : 'bg-brand-primary text-white hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/30'
                  }`}
                >
                  {isFollowLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : isFollowing ? (
                    <UserMinus size={18} />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  <span>{isFollowing ? t('following') : t('follow_supplier')}</span>
                </HapticButton>
              )}
              {features.supplierVerification && profile.role === 'supplier' && !isEditing && (
                <div className="flex items-center gap-2">
                  {profile.isVerified ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-success/10 text-brand-success rounded-xl text-xs font-bold border border-brand-success/20">
                      <ShieldCheck size={14} />
                      <span>{isRtl ? 'موثق بالذكاء الاصطناعي' : 'AI Verified'}</span>
                    </div>
                  ) : (
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-warning/10 text-brand-warning rounded-xl text-xs font-bold border border-brand-warning/20 cursor-pointer hover:bg-brand-warning/20 transition-all">
                      {isVerifying ? (
                        <div className="w-3 h-3 border-2 border-brand-warning border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <ShieldAlert size={14} />
                      )}
                      <span>{isRtl ? 'توثيق الحساب' : 'Verify Account'}</span>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleVerifyDocument} disabled={isVerifying} />
                    </label>
                  )}
                </div>
              )}
              {isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(profile.name || '');
                    setEditCompanyName(profile.companyName || '');
                    setEditPhone(profile.phone || '');
                    setEditLocation(profile.location || '');
                    setEditWebsite(profile.website || '');
                    setEditBio(profile.bio || '');
                    setEditLogoUrl(profile.logoUrl || '');
                  }}
                  className="p-2 bg-brand-surface text-brand-text-muted rounded-xl hover:bg-brand-border transition-colors"
                >
                  <X size={20} />
                </button>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                profile.role === 'supplier' ? 'bg-brand-success/20 text-brand-success' : 
                profile.role === 'admin' ? 'bg-brand-warning/20 text-brand-warning' : 'bg-brand-primary/10 text-brand-primary'
              }`}>
                {t(profile.role)}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-bold text-brand-text-main bg-brand-background border-b-2 border-brand-primary outline-none w-full px-2 py-1 rounded-t-lg"
                  placeholder={isRtl ? 'الاسم' : 'Name'}
                />
              ) : (
                <h2 className="text-2xl font-bold text-brand-text-main">{profile.name}</h2>
              )}
              
              {(profile.companyName || isEditing) && (
                <div className="flex items-center gap-2 text-brand-text-muted mt-2">
                  <Building2 size={18} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      className="font-medium bg-brand-background border-b border-brand-border outline-none flex-1 px-2 py-1 rounded-t-lg"
                      placeholder={isRtl ? 'اسم الشركة' : 'Company Name'}
                    />
                  ) : (
                    <span className="font-medium">{profile.companyName}</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(profile.bio || isEditing) && (
                <div className="md:col-span-2 flex flex-col gap-2 p-5 rounded-2xl bg-brand-background border border-brand-border-light">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-lg text-brand-primary shadow-sm">
                        <Building2 size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-brand-text-main uppercase tracking-wider">
                        {isRtl ? 'نبذة' : 'Bio'}
                      </h3>
                    </div>
                    {!isEditing && profile.bio && (
                      <button
                        onClick={handleTranslateBio}
                        disabled={isTranslatingBio}
                        className="p-1.5 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all disabled:opacity-50"
                        title={translatedBio ? (isRtl ? 'عرض النص الأصلي' : 'Show Original') : (isRtl ? 'ترجمة' : 'Translate')}
                      >
                        <Sparkles size={14} className={isTranslatingBio ? 'animate-pulse' : ''} />
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={4}
                      className="text-brand-text-main leading-relaxed text-sm bg-white border border-brand-border rounded-xl p-3 outline-none focus:ring-2 focus:ring-brand-primary"
                      placeholder={isRtl ? 'اكتب نبذة عنك...' : 'Write a bio...'}
                    />
                  ) : (
                    <p className="text-brand-text-main leading-relaxed text-sm whitespace-pre-wrap">
                      {translatedBio || profile.bio}
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-brand-background border border-brand-border-light">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-brand-primary shadow-sm">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-brand-text-muted uppercase font-bold tracking-tighter">{t('email')}</p>
                      <p className="text-sm font-medium text-brand-text-main">{profile.email}</p>
                    </div>
                  </div>
                  {auth.currentUser?.uid === profile.uid && !isChangingEmail && !isEditing && (
                    <button 
                      onClick={() => setIsChangingEmail(true)}
                      className="p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                      title={isRtl ? 'تغيير البريد الإلكتروني' : 'Change Email'}
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
                
                {isChangingEmail && (
                  <div className="mt-3 pt-3 border-t border-brand-border">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder={isRtl ? 'البريد الإلكتروني الجديد' : 'New email address'}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-brand-border focus:ring-2 focus:ring-brand-primary outline-none"
                      />
                      <button
                        onClick={handleEmailChange}
                        disabled={emailChangeStatus === 'loading' || !newEmail}
                        className="p-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 transition-colors"
                      >
                        {emailChangeStatus === 'loading' ? '...' : <Check size={16} />}
                      </button>
                      <button
                        onClick={() => {
                          setIsChangingEmail(false);
                          setEmailChangeMessage('');
                          setEmailChangeStatus('idle');
                        }}
                        className="p-2 bg-brand-border text-brand-text-muted rounded-lg hover:bg-brand-border transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {emailChangeMessage && (
                      <p className={`mt-2 text-xs ${emailChangeStatus === 'success' ? 'text-brand-success' : 'text-brand-error'}`}>
                        {emailChangeMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {(profile.phone || isEditing) && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-background border border-brand-border-light">
                  <div className="p-2 bg-white rounded-lg text-brand-primary shadow-sm">
                    <Phone size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-brand-text-muted uppercase font-bold tracking-tighter">{t('phone')}</p>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="text-sm font-medium text-brand-text-main bg-transparent border-b border-brand-border outline-none w-full"
                        placeholder={isRtl ? 'رقم الهاتف' : 'Phone number'}
                      />
                    ) : (
                      <p className="text-sm font-medium text-brand-text-main">{profile.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {features.supplierVerification && profile.isVerified && profile.verificationDetails && (
                <div className="md:col-span-2 flex flex-col gap-2 p-4 rounded-2xl bg-brand-success/5 border border-brand-success/20">
                  <div className="flex items-center gap-2 text-brand-success">
                    <ShieldCheck size={18} />
                    <h3 className="text-sm font-bold uppercase tracking-wider">
                      {isRtl ? 'تفاصيل التوثيق' : 'Verification Details'}
                    </h3>
                  </div>
                  <p className="text-xs text-brand-text-main leading-relaxed italic">
                    {profile.verificationDetails}
                  </p>
                </div>
              )}

              {(profile.location || isEditing) && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-background border border-brand-border-light">
                  <div className="p-2 bg-white rounded-lg text-brand-primary shadow-sm">
                    <MapPin size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-brand-text-muted uppercase font-bold tracking-tighter">{t('location')}</p>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          className="text-sm font-medium text-brand-text-main bg-transparent border-b border-brand-border outline-none flex-1"
                          placeholder={isRtl ? 'الموقع' : 'Location'}
                        />
                        <button
                          onClick={handleDetectLocation}
                          disabled={isDetectingLocation}
                          className="p-1 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                          title={isRtl ? 'تحديد الموقع تلقائياً' : 'Detect location'}
                        >
                          {isDetectingLocation ? (
                            <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <MapPin size={16} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-brand-text-main">{profile.location}</p>
                    )}
                  </div>
                </div>
              )}

              {(profile.website || isEditing) && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-background border border-brand-border-light">
                  <div className="p-2 bg-white rounded-lg text-brand-primary shadow-sm">
                    <Globe size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-brand-text-muted uppercase font-bold tracking-tighter">{t('website')}</p>
                    {isEditing ? (
                      <input
                        type="url"
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                        className="text-sm font-medium text-brand-text-main bg-transparent border-b border-brand-border outline-none w-full"
                        placeholder={isRtl ? 'الموقع الإلكتروني' : 'Website URL'}
                      />
                    ) : (
                      <a 
                        href={profile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-brand-primary hover:underline"
                      >
                        {profile.website?.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {auth.currentUser?.uid === profile.uid && (
              <NotificationSettings profile={profile} onUpdateProfile={setProfile} />
            )}

            {profile.role === 'supplier' && (displayedCategories.length > 0 || isEditing) && (
              <div className="pt-4 border-t border-brand-border-light">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-brand-text-main font-bold">
                    <Tag size={18} />
                    <h3>{t('categories')}</h3>
                  </div>
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setActiveCategoryTab('product')}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs ${activeCategoryTab === 'product' ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-text-muted hover:bg-brand-border'}`}
                      >
                        {i18n.language === 'ar' ? 'منتجات' : 'Products'}
                      </button>
                      <button 
                        onClick={() => setActiveCategoryTab('service')}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs ${activeCategoryTab === 'service' ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-text-muted hover:bg-brand-border'}`}
                      >
                        {i18n.language === 'ar' ? 'خدمات' : 'Services'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSuggestCategories}
                        disabled={isSuggestingCategories || !editKeywords.length}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 rounded-lg transition-colors disabled:opacity-50 border border-brand-primary/20"
                      >
                        {isSuggestingCategories ? (
                          <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        {isRtl ? 'اقتراح بالذكاء الاصطناعي' : 'Suggest with AI'}
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-4 p-5 bg-brand-background/50 rounded-2xl border border-brand-border max-h-80 overflow-y-auto custom-scrollbar">
                      {categories.filter(c => !c.parentId && (c.categoryType || 'product') === activeCategoryTab).sort((a, b) => {
                        const aSelected = editCategories.includes(a.id);
                        const bSelected = editCategories.includes(b.id);
                        if (aSelected && !bSelected) return -1;
                        if (!aSelected && bSelected) return 1;
                        return (a.order || 0) - (b.order || 0);
                      }).map(parent => {
                        const subs = categories.filter(c => c.parentId === parent.id);
                        const isSelected = editCategories.includes(parent.id);
                        
                        return (
                          <div key={parent.id} className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-brand-surface border-brand-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-brand-background/50'}`}>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      // Deselect main and all its subs
                                      setEditCategories(editCategories.filter(id => id !== parent.id && !subs.find(s => s.id === id)));
                                    } else {
                                      // Select this main
                                      setEditCategories([...editCategories, parent.id]);
                                    }
                                  }}
                                  className={`flex items-center justify-center w-6 h-6 rounded-md border transition-all ${
                                    isSelected ? 'bg-brand-primary border-brand-primary text-white' : 'bg-brand-surface border-brand-border text-transparent hover:border-brand-primary/40'
                                  }`}
                                >
                                  <Check size={14} strokeWidth={3} />
                                </button>
                                <span className={`font-bold ${isSelected ? 'text-brand-primary' : 'text-brand-text-main'}`}>
                                  {isRtl ? parent.nameAr : parent.nameEn}
                                </span>
                              </div>
                              {subs.length > 0 && (
                                <span className="text-xs font-medium text-brand-text-muted bg-brand-background px-2 py-1 rounded-lg">
                                  {subs.filter(s => editCategories.includes(s.id)).length} / {subs.length}
                                </span>
                              )}
                            </div>
                            
                            {subs.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-brand-border-light grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9 rtl:pl-0 rtl:pr-9">
                                {[...subs].sort((a, b) => {
                                  const aSelected = editCategories.includes(a.id);
                                  const bSelected = editCategories.includes(b.id);
                                  if (aSelected && !bSelected) return -1;
                                  if (!aSelected && bSelected) return 1;
                                  return 0;
                                }).map(sub => {
                                  const isSubSelected = editCategories.includes(sub.id);
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => {
                                        if (isSubSelected) {
                                          setEditCategories(editCategories.filter(id => id !== sub.id));
                                        } else {
                                          // Select sub and its parent
                                          setEditCategories([...new Set([...editCategories, sub.id, parent.id])]);
                                        }
                                      }}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-start ${
                                        isSubSelected ? 'bg-brand-primary/10 text-brand-primary-hover font-bold' : 'bg-brand-background text-brand-text-muted hover:bg-brand-surface hover:text-brand-text-main'
                                      }`}
                                    >
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                        isSubSelected ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-brand-border-light text-transparent'
                                      }`}>
                                        <Check size={10} strokeWidth={3} />
                                      </div>
                                      <span className="truncate">{isRtl ? sub.nameAr : sub.nameEn}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {editCategories.length === 0 && (
                      <p className="text-xs text-brand-text-muted italic">
                        {isRtl ? 'لم يتم تحديد أي فئات' : 'No categories selected'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {displayedCategories.map(cat => (
                      <span 
                        key={cat.id}
                        className="px-4 py-2 bg-brand-primary/10 text-brand-primary-hover rounded-xl text-sm font-medium border border-brand-primary/20"
                      >
                        {isRtl ? cat.nameAr : cat.nameEn}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {profile.role === 'supplier' && (editKeywords.length > 0 || isEditing) && (
              <div className="pt-4 border-t border-brand-border-light">
                <div className="flex items-center gap-2 mb-4 text-brand-text-main font-bold">
                  <Tag size={18} className="text-brand-success" />
                  <h3>{i18n.language === 'ar' ? 'الكلمات المفتاحية' : 'Keywords'}</h3>
                </div>
                
                {isEditing && (
                  <div className="mb-4">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={handleAddKeyword}
                      placeholder={isRtl ? 'أضف كلمة مفتاحية واضغط Enter...' : 'Add a keyword and press Enter...'}
                      className="w-full px-4 py-2 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {editKeywords.map((kw) => (
                    <span 
                      key={kw}
                      className="px-3 py-1 bg-brand-success/10 text-brand-success rounded-lg text-xs font-bold border border-brand-success/20 flex items-center gap-1.5"
                    >
                      {kw}
                      {isEditing && (
                        <button 
                          onClick={() => removeKeyword(kw)}
                          className="hover:text-brand-error transition-colors"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {generatedLogoPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-surface rounded-3xl p-6 max-w-lg w-full border border-brand-border shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-brand-text-main">
                {isRtl ? 'تم تصميم شعارك بنجاح!' : 'Logo Generated Successfully!'}
              </h3>
              <button onClick={() => setGeneratedLogoPreview(null)} className="p-2 hover:bg-brand-background rounded-full transition-colors">
                <X size={20} className="text-brand-text-muted" />
              </button>
            </div>
            <div className="aspect-square w-full rounded-2xl overflow-hidden mb-6 border border-brand-border shadow-inner bg-white">
              <img src={generatedLogoPreview} alt="Generated Logo" className="w-full h-full object-contain" />
            </div>
            <button 
              onClick={() => setGeneratedLogoPreview(null)}
              className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-colors"
            >
              {isRtl ? 'رائع، اعتمده' : 'Awesome, keep it'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
