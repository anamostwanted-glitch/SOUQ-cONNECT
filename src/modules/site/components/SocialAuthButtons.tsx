import React, { useState } from 'react';
import { Apple, Loader2 } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../core/firebase';
import { toast } from 'sonner';
import { HapticButton } from '../../../shared/components/HapticButton';
import { useTranslation } from 'react-i18next';
import { soundService, SoundType } from '../../../core/utils/soundService';

interface SocialAuthButtonsProps {
  onSuccess: (role: string) => void;
  role: string;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ onSuccess, role }) => {
  const { t, i18n } = useTranslation();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialSignIn = async (provider: any, providerId: string) => {
    setLoadingProvider(providerId);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Core Team: Verify if profile exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create initial profile if it doesn't exist
        const nameParts = user.displayName?.split(' ') || [];
        const profileData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || 'User',
          role: role, // Use selected role from parent
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(), // Use string to match current rules
          isVerified: user.emailVerified,
          status: 'active',
          photoURL: user.photoURL || null,
          providerId: user.providerData[0]?.providerId || providerId
        };
        
        await setDoc(userDocRef, profileData);
        
        // Also create public profile
        await setDoc(doc(db, 'users_public', user.uid), {
          uid: user.uid,
          name: profileData.name,
          role: role,
          photoURL: profileData.photoURL,
          isVerified: profileData.isVerified,
          rating: 0,
          reviewCount: 0,
          isOnline: true,
          status: 'active'
        });

        toast.success(i18n.language === 'ar' ? 'تم إنشاء حسابك بنجاح!' : 'Account created successfully!');
      } else {
        toast.success(i18n.language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!');
      }

      soundService.play(SoundType.SUCCESS);
      onSuccess(userDoc.exists() ? (userDoc.data() as any).role : role);
    } catch (error: any) {
      console.error('Social auth error:', error);
      soundService.play(SoundType.ERROR);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error(i18n.language === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول.' : 'Login window was closed.');
      } else {
        toast.error(i18n.language === 'ar' ? 'فشل تسجيل الدخول الاجتماعي.' : 'Social login failed.');
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 mt-6">
      <div className="grid grid-cols-3 gap-3">
        <HapticButton
          onClick={() => handleSocialSignIn(new GoogleAuthProvider(), 'google')}
          disabled={!!loadingProvider}
          className="flex items-center justify-center p-3 border border-brand-border rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          )}
        </HapticButton>

        <HapticButton
          onClick={() => handleSocialSignIn(new FacebookAuthProvider(), 'facebook')}
          disabled={!!loadingProvider}
          className="flex items-center justify-center p-3 border border-brand-border rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
        >
          {loadingProvider === 'facebook' ? (
            <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="Facebook" className="w-6 h-6" />
          )}
        </HapticButton>

        <HapticButton
          onClick={() => handleSocialSignIn(new OAuthProvider('apple.com'), 'apple')}
          disabled={!!loadingProvider}
          className="flex items-center justify-center p-3 border border-brand-border rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
        >
          {loadingProvider === 'apple' ? (
            <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
          ) : (
            <Apple className="w-6 h-6 text-black" />
          )}
        </HapticButton>
      </div>
      
      <p className="text-[10px] text-center text-slate-400 font-medium px-4">
        {i18n.language === 'ar' 
          ? 'بتسجيل الدخول، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا.' 
          : 'By signing in, you agree to our Terms of Service and Privacy Policy.'}
      </p>
    </div>
  );
};
