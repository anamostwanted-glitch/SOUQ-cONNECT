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
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../core/firebase';
import { UserRole, UserProfile, Category } from '../../../core/types';
import { motion } from 'motion/react';
import { User, Package, Upload, Phone, MapPin, Apple, Layers, Check } from 'lucide-react';
import SmartCategorySelector from '../../../shared/components/SmartCategorySelector';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { HapticButton } from '../../../shared/components/HapticButton';

interface AuthProps {
  onAuthSuccess: (role: UserRole) => void;
  initialRole?: UserRole;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, initialRole }) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<'login' | 'register-basic' | 'register-supplier'>('login');
  const isLogin = step === 'login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole || 'customer');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories', false);
    });
    return unsub;
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        const docSnap = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (docSnap.exists()) {
          onAuthSuccess((docSnap.data() as UserProfile).role);
        }
      } else {
        setUploading(true);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const profileData: any = {
          uid: user.uid,
          email: user.email,
          name: name,
          role: role,
          createdAt: new Date().toISOString()
        };

        if (role === 'supplier') {
          profileData.phone = phone;
          profileData.location = location;
          profileData.categories = [selectedCategoryId];
        }

        await setDoc(doc(db, 'users', user.uid), profileData);
        
        // Create public profile
        await setDoc(doc(db, 'users_public', user.uid), {
          uid: user.uid,
          name: name,
          role: role,
          isVerified: false,
          categories: role === 'supplier' ? [selectedCategoryId] : [],
          rating: 0,
          reviewCount: 0,
          isOnline: true,
          averageResponseTime: 0
        });
        
        // Send welcome email
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, name: name, template: 'welcome' })
        });

        onAuthSuccess(role);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        onAuthSuccess((docSnap.data() as UserProfile).role);
      } else {
        // New user, create profile
        const profileData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          role: 'customer',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), profileData);
        
        // Create public profile
        await setDoc(doc(db, 'users_public', user.uid), {
          uid: user.uid,
          name: user.displayName,
          role: 'customer',
          isVerified: false,
          categories: [],
          rating: 0,
          reviewCount: 0,
          isOnline: true,
          averageResponseTime: 0
        });
        
        onAuthSuccess('customer');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-brand-surface p-8 rounded-3xl shadow-xl border border-brand-border-light">
        <h2 className="text-3xl font-bold text-center mb-8">{isLogin ? t('login') : t('register')}</h2>
        
        <HapticButton onClick={handleGoogleLogin} className="w-full bg-white text-slate-900 border border-slate-300 py-3 rounded-xl font-bold mb-4 flex items-center justify-center gap-2">
          {t('loginWithGoogle')}
        </HapticButton>
        
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300"></div></div>
          <div className="relative flex justify-center text-sm"><span className="bg-brand-surface px-2 text-slate-500">{t('or')}</span></div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {step !== 'login' && (
            <>
              <div>
                <label className="block text-sm font-medium text-brand-text-main mb-1">{t('name')}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-brand-border" required />
              </div>
              {role === 'supplier' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1">{t('phone')}</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-brand-border" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1">{t('location')}</label>
                    <div className="flex gap-2">
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-brand-border" required />
                        <HapticButton type="button" onClick={() => {
                            navigator.geolocation.getCurrentPosition((pos) => {
                                setLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`);
                            });
                        }} className="bg-brand-primary text-white px-4 rounded-xl">
                            <MapPin size={20} />
                        </HapticButton>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-text-main mb-1">{t('category')}</label>
                    <SmartCategorySelector categories={categories} selectedCategoryId={selectedCategoryId} onSelect={setSelectedCategoryId} />
                  </div>
                </>
              )}
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-brand-text-main mb-1">{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-brand-border" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text-main mb-1">{t('password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-brand-border" required />
          </div>
          {error && <p className="text-brand-error text-sm">{error}</p>}
          <HapticButton type="submit" className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold">{isLogin ? t('login') : t('register')}</HapticButton>
        </form>
      </motion.div>
    </div>
  );
};

export default Auth;
