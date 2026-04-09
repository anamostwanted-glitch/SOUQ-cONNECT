import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updatePassword,
  ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../core/firebase';
import { UserRole, UserProfile, Category } from '../../../core/types';
import { motion } from 'motion/react';
import { User, Package, Upload, Phone, Building2, Layers, Check, MapPin, Apple } from 'lucide-react';
import SmartCategorySelector from '../../../shared/components/SmartCategorySelector';
import { useEffect } from 'react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { HapticButton } from '../../../shared/components/HapticButton';
import { isAdmin } from '../../../core/utils/rbac';

interface AuthProps {
  onAuthSuccess: (role: UserRole) => void;
  initialRole?: UserRole;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, initialRole }) => {
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(!initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole || 'customer');
  const [companyName, setCompanyName] = useState('');
  const [commercialRegistration, setCommercialRegistration] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{latitude: number, longitude: number} | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const processReferral = async () => {
    const refCode = localStorage.getItem('referralCode');
    if (refCode) {
      try {
        // Find user with this referral code
        const { query, where, getDocs, limit } = await import('firebase/firestore');
        const q = query(collection(db, 'users'), where('referralCode', '==', refCode), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const referrerDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, 'users', referrerDoc.id), {
            referralPoints: increment(10)
          });
          localStorage.removeItem('referralCode');
        }
      } catch (e) {
        console.error("Referral processing failed:", e);
      }
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone) {
      setError(i18n.language === 'ar' ? 'يرجى إدخال رقم الهاتف' : 'Please enter your phone number');
      return;
    }
    
    try {
      setUploading(true);
      
      // Check if phone number exists in our database
      const { query, where, getDocs, limit } = await import('firebase/firestore');
      const q = query(collection(db, 'users'), where('phone', '==', phone), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError(i18n.language === 'ar' ? 'رقم الهاتف غير مسجل لدينا' : 'Phone number not registered');
        setUploading(false);
        return;
      }

      const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
      const confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);
      setVerificationId(confirmation);
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message);
      // Reset recaptcha if it fails
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp) {
      setError(i18n.language === 'ar' ? 'يرجى إدخال رمز التحقق' : 'Please enter the verification code');
      return;
    }
    if (!verificationId) return;

    try {
      setUploading(true);
      await verificationId.confirm(otp);
      setShowNewPasswordForm(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError(i18n.language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError(i18n.language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    try {
      setUploading(true);
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setResetSent(true);
        setShowNewPasswordForm(false);
      } else {
        setError('User session lost. Please try again.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError(i18n.language === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email address');
      return;
    }
    try {
      setUploading(true);
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDetectLocation = () => {
    setIsDetectingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ latitude, longitude });
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${i18n.language}`);
            const data = await response.json();
            const state = data.address?.state || data.address?.region || data.address?.city || data.address?.county;
            if (state) {
              setLocation(state);
            } else {
              setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
            }
          } catch (error) {
            setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
          setIsDetectingLocation(false);
        },
        () => {
          setError(i18n.language === 'ar' ? 'تعذر تحديد الموقع' : 'Unable to detect location');
          setIsDetectingLocation(false);
        }
      );
    } else {
      setError(i18n.language === 'ar' ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation not supported');
      setIsDetectingLocation(false);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories', false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (role === 'supplier' && !location) {
      handleDetectLocation();
    }
  }, [role]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && role === 'supplier') {
      if (!companyName || !phone || !location || !selectedCategoryId) {
        setError('Please fill all supplier details');
        return;
      }
      if (logoFile && logoFile.size > 500 * 1024) {
        setError('Logo file size must be less than 500KB');
        return;
      }
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // For login, we need to fetch the profile to know the role
        let docSnap = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        
        // If user document doesn't exist by UID, check if it exists by email (pre-created by admin)
        if (!docSnap.exists()) {
          try {
            const emailDocSnap = await getDoc(doc(db, 'users', email.toLowerCase()));
            if (emailDocSnap.exists()) {
              const emailData = emailDocSnap.data() as UserProfile;
              const newUserData = { ...emailData, uid: auth.currentUser!.uid, email: email.toLowerCase() };
              
              await setDoc(doc(db, 'users', auth.currentUser!.uid), newUserData);
              await updateDoc(doc(db, 'users', email.toLowerCase()), { status: 'deleted', deletedAt: new Date().toISOString() });
              
              docSnap = await getDoc(doc(db, 'users', auth.currentUser!.uid));
            }
          } catch (error) {
            console.error("Error migrating pre-created user:", error);
          }
        }
        
        if (docSnap.exists()) {
          onAuthSuccess((docSnap.data() as UserProfile).role);
        } else {
          // Recreate missing user document
          const newRole = (auth.currentUser!.email === 'anamostwanted@gmail.com') ? 'admin' : 'customer';
          const newProfileData: any = {
            uid: auth.currentUser!.uid,
            email: auth.currentUser!.email || email,
            name: auth.currentUser!.displayName || 'User',
            role: newRole,
            referralCode: auth.currentUser!.uid.substring(0, 6).toUpperCase(),
            referralPoints: 0,
            createdAt: new Date().toISOString()
          };
          try {
            await setDoc(doc(db, 'users', auth.currentUser!.uid), newProfileData);
          } catch (error) {
            console.error("Failed to recreate missing user document:", error);
          }
          onAuthSuccess(newRole);
        }
      } else {
        setUploading(true);
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        try {
          await sendEmailVerification(user);
        } catch (verifyErr) {
          console.error("Failed to send verification email:", verifyErr);
        }

        let logoUrl = '';
        if (logoFile) {
          try {
            const storageRef = ref(storage, `logos/${user.uid}_${Date.now()}_${logoFile.name}`);
            await uploadBytes(storageRef, logoFile);
            logoUrl = await getDownloadURL(storageRef);
          } catch (uploadErr) {
            console.error('Storage upload failed, falling back to base64', uploadErr);
            const base64Promise = new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(logoFile);
            });
            logoUrl = await base64Promise;
          }
        }

        // Allow the admin email to be a supplier if they choose, otherwise default to admin
        let assignedRole = role;
        if (email === 'anamostwanted@gmail.com' && role !== 'supplier') {
          assignedRole = 'admin';
        }

        const profileData: any = {
          uid: user.uid,
          email: user.email,
          name: name,
          role: assignedRole,
          referralCode: user.uid.substring(0, 6).toUpperCase(),
          referralPoints: 0,
          loyaltyPoints: assignedRole === 'customer' ? 50 : 0, // Welcome points
          createdAt: new Date().toISOString()
        };

        if (assignedRole === 'supplier') {
          profileData.companyName = companyName;
          profileData.commercialRegistration = commercialRegistration;
          profileData.phone = phone;
          profileData.location = location;
          if (coordinates) {
            profileData.coordinates = coordinates;
          }
          profileData.logoUrl = logoUrl;
          profileData.categories = [selectedCategoryId];
        }

        try {
          await setDoc(doc(db, 'users', user.uid), profileData);
          await processReferral();
          
          // Send welcome email
          try {
            await fetch('/api/send-welcome-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, name: name }),
            });
          } catch (emailErr) {
            console.error("Failed to send welcome email:", emailErr);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`, false);
        }
        onAuthSuccess(assignedRole);
      }
    } catch (err: any) {
      let errorMessage = err.message;
      
      if (err.code === 'auth/email-already-in-use' || (err.message && err.message.includes('auth/email-already-in-use'))) {
        errorMessage = i18n.language === 'ar' ? 'البريد الإلكتروني مستخدم بالفعل.' : 'Email is already in use.';
      } else if (err.code === 'auth/weak-password' || (err.message && err.message.includes('auth/weak-password'))) {
        errorMessage = i18n.language === 'ar' ? 'كلمة المرور ضعيفة جداً.' : 'Password is too weak.';
      } else if (err.code === 'auth/invalid-email' || (err.message && err.message.includes('auth/invalid-email'))) {
        errorMessage = i18n.language === 'ar' ? 'البريد الإلكتروني غير صالح.' : 'Invalid email address.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || (err.message && (err.message.includes('auth/user-not-found') || err.message.includes('auth/wrong-password') || err.message.includes('auth/invalid-credential')))) {
        errorMessage = i18n.language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.';
      } else {
        try {
          const errorInfo = JSON.parse(err.message);
          if (errorInfo.error) {
            if (errorInfo.error.includes('permission') || errorInfo.error.includes('insufficient')) {
              errorMessage = i18n.language === 'ar' ? 'عذراً، ليس لديك صلاحية للقيام بهذا الإجراء.' : 'Sorry, you do not have permission to perform this action.';
            } else {
              errorMessage = errorInfo.error;
            }
          }
        } catch (e) {
          // Not JSON, keep original message
        }
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleSocialSignIn = async (provider: GoogleAuthProvider | FacebookAuthProvider | OAuthProvider) => {
    setError('');
    
    if (!isLogin && role === 'supplier') {
      if (!companyName || !phone || !location || !selectedCategoryId) {
        setError(i18n.language === 'ar' ? 'يرجى تعبئة جميع تفاصيل المورد' : 'Please fill all supplier details');
        return;
      }
      if (logoFile && logoFile.size > 500 * 1024) {
        setError(i18n.language === 'ar' ? 'يجب أن يكون حجم الشعار أقل من 500 كيلوبايت' : 'Logo file size must be less than 500KB');
        return;
      }
    }

    setUploading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user already exists to preserve role
      let docSnap;
      try {
        docSnap = await getDoc(doc(db, 'users', user.uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`, false);
      }
      
      let assignedRole: UserRole = 'customer';
      let extraData: Partial<UserProfile> = {};
      
      if (docSnap && docSnap.exists()) {
        assignedRole = (docSnap.data() as UserProfile).role;
        // Force admin role for master email if not supplier
        if (user.email === 'anamostwanted@gmail.com' && assignedRole !== 'supplier') {
          assignedRole = 'admin';
        }
      } else if (user.email) {
        // Check if there's a pre-created user document by email
        try {
          const emailDocSnap = await getDoc(doc(db, 'users', user.email.toLowerCase()));
          if (emailDocSnap.exists()) {
            const emailData = emailDocSnap.data() as UserProfile;
            assignedRole = emailData.role;
            extraData = { ...emailData };
            delete extraData.uid;
            delete extraData.email;
            delete extraData.role;
            
            // Soft delete the old document since we are creating a new one with the correct UID
            await updateDoc(doc(db, 'users', user.email.toLowerCase()), { status: 'deleted', deletedAt: new Date().toISOString() });
          } else if (user.email === 'anamostwanted@gmail.com' && role !== 'supplier') {
            assignedRole = 'admin';
          } else {
            // New user, use the currently selected role in the UI if we are on the register tab
            assignedRole = isLogin ? 'customer' : role;
            
            // If it's a supplier registration, we can include the fields from the form
            if (!isLogin && assignedRole === 'supplier') {
              let logoUrl = '';
              if (logoFile) {
                try {
                  const storageRef = ref(storage, `logos/${user.uid}_${Date.now()}_${logoFile.name}`);
                  await uploadBytes(storageRef, logoFile);
                  logoUrl = await getDownloadURL(storageRef);
                } catch (uploadErr) {
                  console.error('Storage upload failed, falling back to base64', uploadErr);
                  const base64Promise = new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(logoFile);
                  });
                  logoUrl = await base64Promise;
                }
              }

              extraData = {
                companyName,
                phone,
                location,
                ...(coordinates ? { coordinates } : {}),
                logoUrl,
                categories: selectedCategoryId ? [selectedCategoryId] : []
              };
            }
          }
        } catch (error) {
          console.error("Error checking pre-created user:", error);
          assignedRole = isLogin ? 'customer' : role;
        }
      } else {
        assignedRole = isLogin ? 'customer' : role;
      }
      
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name: extraData.name || user.displayName || name || 'User',
          role: assignedRole,
          referralCode: user.uid.substring(0, 6).toUpperCase(),
          referralPoints: docSnap?.exists() ? (docSnap.data().referralPoints || 0) : 0,
          ...extraData,
          createdAt: docSnap?.exists() ? docSnap.data().createdAt : (extraData.createdAt || new Date().toISOString())
        }, { merge: true });
        
        if (!docSnap?.exists()) {
          await processReferral();
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`, false);
      }
      onAuthSuccess(assignedRole);
    } catch (err: any) {
      let errorMessage = err.message;
      
      // Handle specific Firebase Auth errors for popups
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = i18n.language === 'ar' ? 'تم إغلاق النافذة المنبثقة قبل إتمام العملية.' : 'The popup was closed before completing the sign-in.';
      } else if (err.code === 'auth/cancelled-by-user') {
        errorMessage = i18n.language === 'ar' ? 'تم إلغاء العملية من قبل المستخدم.' : 'The operation was cancelled by the user.';
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = i18n.language === 'ar' ? 'تم حظر النافذة المنبثقة من قبل المتصفح.' : 'The popup was blocked by the browser.';
      } else {
        try {
          const errorInfo = JSON.parse(err.message);
          if (errorInfo.error) {
            if (errorInfo.error.includes('permission') || errorInfo.error.includes('insufficient')) {
              errorMessage = i18n.language === 'ar' ? 'عذراً، ليس لديك صلاحية للقيام بهذا الإجراء.' : 'Sorry, you do not have permission to perform this action.';
            } else {
              errorMessage = errorInfo.error;
            }
          }
        } catch (e) {
          // Not JSON, keep original message
        }
      }
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-surface p-6 sm:p-8 rounded-3xl shadow-xl border border-brand-border-light max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-brand-primary/20 scrollbar-track-brand-surface"
      >
        <h2 className="text-3xl font-bold text-center mb-8">
          {isForgotPassword ? (i18n.language === 'ar' ? 'استعادة كلمة المرور' : 'Reset Password') : (isLogin ? t('login') : t('register'))}
        </h2>

        {isForgotPassword ? (
          <div className="space-y-4">
            {resetSent ? (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center">
                {i18n.language === 'ar' 
                  ? 'تمت العملية بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.' 
                  : 'Success! You can now login with your new password.'}
              </div>
            ) : showNewPasswordForm ? (
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <p className="text-sm text-brand-text-muted text-center mb-4">
                  {i18n.language === 'ar' 
                    ? 'أدخل كلمة المرور الجديدة' 
                    : 'Enter your new password'}
                </p>
                <div>
                  <label className="block text-sm font-medium text-brand-text-main mb-1">{t('password')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-text-main mb-1">
                    {i18n.language === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                    required
                  />
                </div>
                {error && <p className="text-brand-error text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/30 mt-4 disabled:opacity-70"
                >
                  {uploading ? '...' : (i18n.language === 'ar' ? 'تحديث كلمة المرور' : 'Update Password')}
                </button>
              </form>
            ) : (
              <>
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => {
                      setResetMethod('email');
                      setError('');
                    }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${resetMethod === 'email' ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-text-muted hover:bg-brand-primary/10'}`}
                  >
                    {i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </button>
                  <button
                    onClick={() => {
                      setResetMethod('phone');
                      setError('');
                    }}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${resetMethod === 'phone' ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-text-muted hover:bg-brand-primary/10'}`}
                  >
                    {i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </button>
                </div>

                {resetMethod === 'email' ? (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <p className="text-sm text-brand-text-muted text-center mb-4">
                      {i18n.language === 'ar' 
                        ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.' 
                        : 'Enter your email address and we will send you a link to reset your password.'}
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-brand-text-main mb-1">{t('email')}</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                        required
                      />
                    </div>
                    {error && <p className="text-brand-error text-sm">{error}</p>}
                    <button
                      type="submit"
                      disabled={uploading}
                      className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/30 mt-4 disabled:opacity-70"
                    >
                      {uploading ? '...' : (i18n.language === 'ar' ? 'إرسال الرابط' : 'Send Reset Link')}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {!otpSent ? (
                      <form onSubmit={handleSendOTP} className="space-y-4">
                        <p className="text-sm text-brand-text-muted text-center mb-4">
                          {i18n.language === 'ar' 
                            ? 'أدخل رقم هاتفك وسنرسل لك رمز تحقق.' 
                            : 'Enter your phone number and we will send you a verification code.'}
                        </p>
                        <div>
                          <label className="block text-sm font-medium text-brand-text-main mb-1">{i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+9627XXXXXXXX"
                            className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                            required
                          />
                        </div>
                        <div id="recaptcha-container"></div>
                        {error && <p className="text-brand-error text-sm">{error}</p>}
                        <button
                          type="submit"
                          disabled={uploading}
                          className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/30 mt-4 disabled:opacity-70"
                        >
                          {uploading ? '...' : (i18n.language === 'ar' ? 'إرسال الرمز' : 'Send Code')}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <p className="text-sm text-brand-text-muted text-center mb-4">
                          {i18n.language === 'ar' 
                            ? 'أدخل رمز التحقق المرسل إلى هاتفك.' 
                            : 'Enter the verification code sent to your phone.'}
                        </p>
                        <div>
                          <label className="block text-sm font-medium text-brand-text-main mb-1">{i18n.language === 'ar' ? 'رمز التحقق' : 'Verification Code'}</label>
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                            required
                          />
                        </div>
                        {error && <p className="text-brand-error text-sm">{error}</p>}
                        <button
                          type="submit"
                          disabled={uploading}
                          className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/30 mt-4 disabled:opacity-70"
                        >
                          {uploading ? '...' : (i18n.language === 'ar' ? 'تحقق' : 'Verify')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="w-full text-xs text-center text-brand-primary hover:underline"
                        >
                          {i18n.language === 'ar' ? 'تغيير رقم الهاتف' : 'Change Phone Number'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setResetSent(false);
                setOtpSent(false);
                setShowNewPasswordForm(false);
                setError('');
              }}
              className="w-full text-sm text-center text-brand-text-muted hover:text-brand-primary transition-colors mt-4"
            >
              {i18n.language === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-brand-text-main mb-1">{t('name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text-main mb-2">{t('role')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${role === 'customer' ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-brand-border-light bg-brand-surface text-brand-text-muted hover:border-brand-border'}`}
                  >
                    <User size={24} />
                    <span className="text-xs font-bold uppercase tracking-wider">{t('customer')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('supplier')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${role === 'supplier' ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-brand-border-light bg-brand-surface text-brand-text-muted hover:border-brand-border'}`}
                  >
                    <Package size={24} />
                    <span className="text-xs font-bold uppercase tracking-wider">{t('supplier')}</span>
                  </button>
                </div>
              </div>

              {!isLogin && role === 'supplier' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-2 border-t border-brand-border-light"
                >
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1 flex items-center gap-2">
                      <Building2 size={16} className="text-brand-primary" />
                      {i18n.language === 'ar' ? 'اسم الشركة' : 'Company Name'}
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1 flex items-center gap-2">
                      <Building2 size={16} className="text-brand-primary" />
                      {i18n.language === 'ar' ? 'رقم السجل التجاري' : 'Commercial Registration No.'}
                    </label>
                    <input
                      type="text"
                      value={commercialRegistration}
                      onChange={(e) => setCommercialRegistration(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1 flex items-center gap-2">
                      <Phone size={16} className="text-brand-primary" />
                      {i18n.language === 'ar' ? 'رقم التواصل' : 'Contact Number'}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1 flex items-center gap-2">
                      <MapPin size={16} className="text-brand-primary" />
                      {i18n.language === 'ar' ? 'الموقع / المدينة' : 'Location / City'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                        placeholder={i18n.language === 'ar' ? 'مثال: عمان، الأردن' : 'e.g. Amman, Jordan'}
                        required
                      />
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isDetectingLocation}
                        className="px-4 py-3 bg-brand-surface rounded-xl text-brand-primary hover:bg-brand-primary/10 transition-all flex items-center justify-center"
                        title={i18n.language === 'ar' ? 'تحديد موقعي تلقائياً' : 'Detect my location'}
                      >
                        {isDetectingLocation ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-primary"></div>
                        ) : (
                          <MapPin size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1 flex items-center gap-2">
                      <Layers size={16} className="text-brand-primary" />
                      {i18n.language === 'ar' ? 'فئة العمل' : 'Business Category'}
                    </label>
                    <SmartCategorySelector 
                      categories={categories}
                      selectedCategoryId={selectedCategoryId}
                      onSelect={setSelectedCategoryId}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1 flex items-center gap-2">
                      <Upload size={16} className="text-brand-primary" />
                      {i18n.language === 'ar' ? 'شعار الشركة' : 'Company Logo'}
                    </label>
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label 
                        htmlFor="logo-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-brand-border rounded-2xl cursor-pointer hover:border-brand-primary hover:bg-brand-primary/10 transition-all"
                      >
                        {logoFile ? (
                          <div className="flex flex-col items-center gap-1">
                            <Check size={24} className="text-green-500" />
                            <span className="text-xs font-medium text-brand-text-muted truncate max-w-[200px]">{logoFile.name}</span>
                          </div>
                        ) : (
                          <>
                            <Upload size={24} className="text-brand-text-muted mb-2" />
                            <span className="text-xs text-brand-text-muted">{i18n.language === 'ar' ? 'اضغط لرفع الشعار' : 'Click to upload logo'}</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-brand-text-main mb-1">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-brand-text-main">{t('password')}</label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError('');
                  }}
                  className="text-xs text-brand-primary hover:text-brand-primary-hover transition-colors"
                >
                  {i18n.language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                </button>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-border focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          {error && <p className="text-brand-error text-sm">{error}</p>}

          <HapticButton
            type="submit"
            className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/30 mt-4"
          >
            {isLogin ? t('login') : t('register')}
          </HapticButton>
        </form>

        <div className="mt-6 flex flex-col gap-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-border-light"></div></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-brand-surface px-2 text-brand-text-muted">
                {i18n.language === 'ar' ? 'أو المتابعة عبر' : 'Or continue with'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HapticButton
              onClick={() => handleSocialSignIn(new GoogleAuthProvider())}
              disabled={uploading}
              className="flex items-center justify-center gap-2 bg-brand-surface border border-brand-border py-3 rounded-xl font-medium hover:bg-brand-background transition-all disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              <span className="text-sm">Google</span>
            </HapticButton>

            <HapticButton
              onClick={() => handleSocialSignIn(new FacebookAuthProvider())}
              disabled={uploading}
              className="flex items-center justify-center gap-2 bg-brand-surface border border-brand-border py-3 rounded-xl font-medium hover:bg-brand-background transition-all disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="Facebook" className="w-5 h-5" />
              <span className="text-sm">Facebook</span>
            </HapticButton>
          </div>

          <HapticButton
            onClick={() => handleSocialSignIn(new OAuthProvider('apple.com'))}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-brand-surface border border-brand-border py-3 rounded-xl font-medium hover:bg-brand-background transition-all disabled:opacity-50"
          >
            <Apple size={20} />
            <span className="text-sm">Apple</span>
          </HapticButton>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-center text-brand-text-muted hover:text-brand-primary transition-colors"
          >
            {isLogin 
              ? (i18n.language === 'ar' ? 'ليس لديك حساب؟ سجل الآن' : "Don't have an account? Register") 
              : (i18n.language === 'ar' ? 'لديك حساب بالفعل؟ سجل دخولك' : "Already have an account? Login")}
          </button>
        </div>
        </>
      )}
      </motion.div>
    </div>
  );
};

export default Auth;
