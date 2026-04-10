import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Lock, Shield, Loader2, Plus } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../../../core/firebase';
import { toast } from 'sonner';

import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer' as 'customer' | 'supplier' | 'admin'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name) {
      toast.error(isRtl ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setLoading(true);
    const secondaryAppName = `SecondaryApp-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      const newUid = userCredential.user.uid;

      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        email: formData.email,
        name: formData.name,
        role: formData.role,
        isVerified: formData.role === 'supplier' ? false : true,
        createdAt: new Date().toISOString(),
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        referralPoints: 0
      });

      toast.success(isRtl ? 'تم إنشاء المستخدم بنجاح' : 'User created successfully');
      onSuccess();
      onClose();
      setFormData({ name: '', email: '', password: '', role: 'customer' });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'admin_create_user', false);
      toast.error(error.message || (isRtl ? 'فشل إنشاء المستخدم' : 'Failed to create user'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-brand-surface w-full max-w-md rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-brand-text-main">
                      {isRtl ? 'إضافة مستخدم جديد' : 'Add New User'}
                    </h2>
                    <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest mt-1">
                      {isRtl ? 'إنشاء حساب يدوي' : 'Manual Account Creation'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-brand-background rounded-xl transition-colors text-brand-text-muted"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                    <User size={14} />
                    {isRtl ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                    placeholder={isRtl ? 'أدخل الاسم...' : 'Enter name...'}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Mail size={14} />
                    {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                    placeholder="name@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Lock size={14} />
                    {isRtl ? 'كلمة المرور' : 'Password'}
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Shield size={14} />
                    {isRtl ? 'الدور / الصلاحية' : 'Role / Permission'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['customer', 'supplier', 'admin'] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData({ ...formData, role })}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          formData.role === role 
                            ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' 
                            : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/50'
                        }`}
                      >
                        {role === 'customer' ? (isRtl ? 'عميل' : 'Customer') : 
                         role === 'supplier' ? (isRtl ? 'مورد' : 'Supplier') : 
                         (isRtl ? 'مدير' : 'Admin')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-primary-hover transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                    {isRtl ? 'إنشاء الحساب' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
