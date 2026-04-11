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
        onAuthSuccess(role);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-brand-surface p-8 rounded-3xl shadow-xl border border-brand-border-light">
        <h2 className="text-3xl font-bold text-center mb-8">{isLogin ? t('login') : t('register')}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          {step !== 'login' && (
            <div>
              <label className="block text-sm font-medium text-brand-text-main mb-1">{t('name')}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-brand-border" required />
            </div>
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
