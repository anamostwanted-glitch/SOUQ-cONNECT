import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updatePassword,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../core/firebase';
import { UserRole, UserProfile, Category } from '../../../core/types';
import { motion } from 'motion/react';
import { User, Package, Upload, Phone, MapPin, Apple, Layers, Check, Mail, Sparkles } from 'lucide-react';
import { AICategorySelector } from './AICategorySelector';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { HapticButton } from '../../../shared/components/HapticButton';
import { SocialAuthButtons } from './SocialAuthButtons';
import { toast } from 'sonner';
import { logActivity } from '../../../core/utils/activityLogger';
import { analytics } from '../../../core/services/AnalyticsService';

interface AuthProps {
  onAuthSuccess: (role: UserRole) => void;
  initialRole?: UserRole;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, initialRole }) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'login' | 'register-basic' | 'register-supplier'>('login');
  const [supplierSubStep, setSupplierSubStep] = useState(1);
  const [verificationSent, setVerificationSent] = useState(false);
  const isLogin = step === 'login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole || 'customer');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [supplierType, setSupplierType] = useState<'merchant' | 'service_provider' | 'both'>('merchant');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isBetaInvite, setIsBetaInvite] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ref') === 'beta_invite') {
      setIsBetaInvite(true);
      if (params.get('role') === 'supplier') {
        setRole('supplier');
        setStep('register-supplier');
      }
    }
  }, []);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const getFriendlyErrorMessage = (errorCode: string) => {
    const isAr = i18n.language === 'ar';
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return isAr ? 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.' : 'This email is already registered. Please log in.';
      case 'auth/invalid-email':
        return isAr ? 'البريد الإلكتروني غير صالح.' : 'Invalid email address.';
      case 'auth/weak-password':
        return isAr ? 'كلمة المرور ضعيفة جداً.' : 'Password is too weak.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Incorrect email or password.';
      case 'auth/too-many-requests':
        return isAr ? 'تم حظر المحاولات مؤقتاً بسبب كثرة الطلبات. حاول لاحقاً.' : 'Too many attempts. Please try again later.';
      default:
        return isAr ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' : 'An unexpected error occurred. Please try again.';
    }
  };

  // Calculate progress for suppliers
  const totalSupplierSteps = 3;
  const progress = role === 'supplier' 
    ? Math.round((supplierSubStep / totalSupplierSteps) * 100) 
    : 100;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      const allCats = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      setCategories(allCats.filter(c => c.status === 'active' || !c.status));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories', false);
    });
    return unsub;
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = () => {
    setError('');
    if (supplierSubStep === 1) {
      if (!name || !email || !password) {
        setError(t('fillBasicFields'));
        return false;
      }
      if (password.length < 6) {
        setError(t('passwordTooShort'));
        return false;
      }
    } else if (supplierSubStep === 2) {
      if (!phone || !location) {
        setError(t('fillBusinessData'));
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setSupplierSubStep(prev => prev + 1);
      analytics.trackOnboarding(supplierSubStep + 1);
    }
  };

  const prevStep = () => {
    setSupplierSubStep(prev => prev - 1);
  };

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'supplier' && supplierSubStep < totalSupplierSteps) {
      nextStep();
      return;
    }

    if (!isLogin && role === 'supplier' && !agreedToTerms) {
      setError(t('mustAgreeTerms'));
      return;
    }
    
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        analytics.trackEvent('login', { method: 'email' });
        const docSnap = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (docSnap.exists()) {
          const userData = docSnap.data() as UserProfile;
          // Sync role on login too
          const idToken = await auth.currentUser!.getIdToken();
          await fetch('/api/sync-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ role: userData.role })
          });
          
          await logActivity(
            'login',
            'تم تسجيل الدخول إلى المنصة',
            'Logged in to the platform'
          );

          onAuthSuccess(userData.role);
        }
      } else {
        setUploading(true);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        analytics.trackEvent('registration_complete', { role, method: 'email' });
        
        // Send verification email (non-blocking and resilient)
        sendEmailVerification(user).then(() => {
          console.log('Verification email sent');
        }).catch(e => {
          console.warn('Failed to send verification email:', e);
          // Don't block registration if email verification fails
        });
        
        const profileData: any = {
          uid: user.uid,
          email: user.email,
          name: name,
          role: role,
          createdAt: new Date().toISOString(),
          isVerified: false,
          status: 'active',
          isBeta: isBetaInvite,
          invitedBy: isBetaInvite ? 'admin' : null
        };

        if (role === 'supplier') {
          profileData.phone = phone;
          profileData.location = location;
          profileData.categories = selectedCategoryIds;
          profileData.supplierType = supplierType;
          profileData.onboardingCompleted = true; // Mark onboarding as complete since they filled business info
          if (logoFile) {
            try {
              const logoRef = ref(storage, `logos/${user.uid}`);
              await uploadBytes(logoRef, logoFile);
              profileData.logoUrl = await getDownloadURL(logoRef);
            } catch (logoError) {
              console.warn('Logo upload failed, continuing without logo:', logoError);
            }
          }
        }

        await setDoc(doc(db, 'users', user.uid), profileData);
        
        // Create public profile
        await setDoc(doc(db, 'users_public', user.uid), {
          uid: user.uid,
          name: name,
          role: role,
          isVerified: false,
          supplierType: role === 'supplier' ? supplierType : null,
          categories: role === 'supplier' ? selectedCategoryIds : [],
          logoUrl: profileData.logoUrl || null,
          rating: 0,
          reviewCount: 0,
          isOnline: true,
          averageResponseTime: 0,
          status: 'active'
        });

        // Sync role immediately after registration (non-blocking)
        const idToken = await user.getIdToken();
        fetch('/api/sync-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify({ role })
        }).catch(e => console.error('Role sync failed:', e));
        
        // Send welcome email (non-blocking)
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: user.email, 
            name: name, 
            template: 'welcome',
            language: i18n.language 
          })
        }).catch(e => console.error('Welcome email failed:', e));

        toast.success(i18n.language === 'ar' ? 'تم التسجيل بنجاح!' : 'Registration successful!');
        
        await logActivity(
          'login',
          `تم إنشاء حساب جديد كـ ${role === 'supplier' ? 'مزود خدمة' : 'عميل'}`,
          `Created a new account as a ${role}`
        );

        // Call success callback to redirect user
        onAuthSuccess(role);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const friendlyMessage = getFriendlyErrorMessage(err.code);
      setError(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (err: any) {
      const friendlyMessage = getFriendlyErrorMessage(err.code);
      setError(friendlyMessage);
      toast.error(friendlyMessage);
    }
  };

  if (resetEmailSent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-brand-surface p-8 rounded-3xl shadow-xl border border-brand-border-light text-center">
          <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} className="text-brand-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4">{t('resetLinkSent')}</h2>
          <p className="text-slate-600 mb-8">
            {t('resetInstructions', { email })}
          </p>
          <HapticButton onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }} className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold">
            {t('backToLogin')}
          </HapticButton>
        </motion.div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-brand-surface p-8 rounded-3xl shadow-xl border border-brand-border-light">
          <h2 className="text-2xl font-bold text-center mb-6">{t('resetPassword')}</h2>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-main mb-1">{t('email')}</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                required 
              />
            </div>
            {error && <p className="text-brand-error text-sm bg-brand-error/10 p-3 rounded-lg border border-brand-error/20">{error}</p>}
            <HapticButton type="submit" className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20">
              {t('sendResetLink')}
            </HapticButton>
            <button 
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="w-full text-sm text-slate-500 hover:text-brand-primary transition-colors py-2"
            >
              {t('backToLogin')}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (verificationSent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-brand-surface p-8 rounded-3xl shadow-xl border border-brand-border-light text-center">
          <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} className="text-brand-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-4">{t('verifyEmail')}</h2>
          <p className="text-slate-600 mb-8">{t('verificationEmailSent', { email })}</p>
          <HapticButton onClick={() => setVerificationSent(false)} className="w-full bg-slate-100 text-slate-900 py-3 rounded-xl font-bold">
            {t('backToLogin')}
          </HapticButton>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-brand-surface p-8 rounded-3xl shadow-xl border border-brand-border-light">
        <h2 className="text-3xl font-bold text-center mb-8">{isLogin ? t('login') : t('register')}</h2>
        
        {!isLogin && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>{t('registrationProgress')}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-brand-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {!isLogin && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <HapticButton onClick={() => setRole('customer')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${role === 'customer' ? 'border-brand-primary bg-brand-primary/10' : 'border-brand-border'}`}>
              <User size={24} />
              <span className="text-sm font-medium">{t('customer')}</span>
            </HapticButton>
            <HapticButton onClick={() => setRole('supplier')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${role === 'supplier' ? 'border-brand-primary bg-brand-primary/10' : 'border-brand-border'}`}>
              <Package size={24} />
              <span className="text-sm font-medium">{t('supplier')}</span>
            </HapticButton>
          </div>
        )}

        <SocialAuthButtons onSuccess={onAuthSuccess} role={role} />
        
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300"></div></div>
          <div className="relative flex justify-center text-sm"><span className="bg-brand-surface px-2 text-slate-500">{t('or')}</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {step !== 'login' && role === 'supplier' ? (
            <div className="space-y-4">
              {/* Step 1: Basic Info */}
              {supplierSubStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1">{t('name')}</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      autoComplete="name"
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1">{t('email')}</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      autoComplete="email"
                      inputMode="email"
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1">{t('password')}</label>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      autoComplete="new-password"
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                      required 
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Business Info */}
              {supplierSubStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1">{t('supplierType')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        type="button"
                        onClick={() => setSupplierType('merchant')}
                        className={`py-2 px-1 rounded-xl border text-xs font-medium transition-all ${supplierType === 'merchant' ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-brand-border text-slate-500'}`}
                      >
                        {t('merchant')}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSupplierType('service_provider')}
                        className={`py-2 px-1 rounded-xl border text-xs font-medium transition-all ${supplierType === 'service_provider' ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-brand-border text-slate-500'}`}
                      >
                        {t('service_provider')}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSupplierType('both')}
                        className={`py-2 px-1 rounded-xl border text-xs font-medium transition-all ${supplierType === 'both' ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-brand-border text-slate-500'}`}
                      >
                        {t('both')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1">{t('phone')}</label>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      inputMode="tel"
                      autoComplete="tel"
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1">{t('location')}</label>
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={location} 
                          onChange={(e) => setLocation(e.target.value)} 
                          autoComplete="street-address"
                          className="flex-1 px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                          required 
                        />
                        <HapticButton type="button" onClick={() => {
                            navigator.geolocation.getCurrentPosition((pos) => {
                                setLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`);
                            });
                        }} className="bg-brand-primary text-white px-4 rounded-xl">
                            <MapPin size={20} />
                        </HapticButton>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Branding */}
              {supplierSubStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-brand-border flex items-center justify-center overflow-hidden bg-slate-50 relative group">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload size={32} className="text-slate-400" />
                      )}
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" id="logo-upload" />
                    </div>
                    <label htmlFor="logo-upload" className="text-sm font-bold text-brand-primary cursor-pointer hover:underline">
                      {logoFile ? t('changeLogo') : t('uploadLogo')}
                    </label>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                    <input 
                      type="checkbox" 
                      id="terms-supplier" 
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary/20"
                    />
                    <label htmlFor="terms-supplier" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                      {i18n.language === 'ar' ? (
                        <>
                          أوافق على <a href="#" className="text-brand-primary font-bold hover:underline">شروط الاستخدام</a> و <a href="#" className="text-brand-primary font-bold hover:underline">سياسة الخصوصية</a> الخاصة بالموردين.
                        </>
                      ) : (
                        <>
                          I agree to the <a href="#" className="text-brand-primary font-bold hover:underline">Terms of Use</a> and <a href="#" className="text-brand-primary font-bold hover:underline">Privacy Policy</a> for suppliers.
                        </>
                      )}
                    </label>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-3 pt-4">
                {supplierSubStep > 1 && (
                  <HapticButton type="button" onClick={prevStep} className="flex-1 bg-slate-100 text-slate-900 py-3 rounded-xl font-bold">
                    {t('previous')}
                  </HapticButton>
                )}
                <HapticButton type="submit" className="flex-[2] bg-brand-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20">
                  {supplierSubStep === totalSupplierSteps ? (uploading ? t('processing') : t('completeRegistration')) : t('next')}
                </HapticButton>
              </div>
            </div>
          ) : (
            <>
              {step !== 'login' && (
                <div>
                  <label className="block text-sm font-medium text-brand-text-main mb-1">{t('name')}</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    autoComplete="name"
                    className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                    required 
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-brand-text-main mb-1">{t('email')}</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  autoComplete="email"
                  inputMode="email"
                  className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-main mb-1">{t('password')}</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" 
                  required 
                />
                {isLogin && (
                  <button 
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-brand-primary hover:underline mt-1 block"
                  >
                    {t('forgotPassword')}
                  </button>
                )}
              </div>
              
              {!isLogin && (
                <div className="flex items-start gap-3 py-2">
                  <input 
                    type="checkbox" 
                    id="terms-basic" 
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary/20"
                  />
                  <label htmlFor="terms-basic" className="text-sm text-slate-600 cursor-pointer">
                    {i18n.language === 'ar' ? (
                      <>
                        أوافق على <a href="#" className="text-brand-primary font-bold hover:underline">شروط الاستخدام</a> و <a href="#" className="text-brand-primary font-bold hover:underline">سياسة الخصوصية</a>.
                      </>
                    ) : (
                      <>
                        I agree to the <a href="#" className="text-brand-primary font-bold hover:underline">Terms of Use</a> and <a href="#" className="text-brand-primary font-bold hover:underline">Privacy Policy</a>.
                      </>
                    )}
                  </label>
                </div>
              )}

              {error && <p className="text-brand-error text-sm bg-brand-error/10 p-3 rounded-lg border border-brand-error/20">{error}</p>}
              <HapticButton type="submit" className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20">
                {uploading ? t('processing') : (isLogin ? t('login') : t('register'))}
              </HapticButton>
            </>
          )}
        </form>

        <div className="mt-8 text-center space-y-4">
          <button onClick={() => {
            setStep(isLogin ? 'register-basic' : 'login');
            setSupplierSubStep(1);
            setError('');
          }} className="text-sm text-slate-500 hover:text-brand-primary transition-colors">
            {isLogin ? t('noAccount') : t('hasAccount')}
          </button>

          <div className="pt-4 border-t border-brand-border-light flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <Sparkles size={12} className="text-brand-primary animate-pulse" />
            {i18n.language === 'ar' ? 'فريق النواة - اتصال آمن مشفر' : 'Core Team - Secure Encrypted Connection'}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
