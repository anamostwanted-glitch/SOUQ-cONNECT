import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User as UserIcon, Mail, Phone, MapPin, Save, Camera, Cpu, Zap } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../core/firebase';
import { UserProfile } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { CacheOptimizer } from '../../../shared/components/CacheOptimizer';
import imageCompression from 'browser-image-compression';

interface ProfileSettingsProps {
  profile: UserProfile;
  onBack?: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile, onBack }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [editName, setEditName] = useState(profile.name || '');
  const [editEmail, setEditEmail] = useState(profile.email || '');
  const [editPhone, setEditPhone] = useState(profile.phone || '');
  const [editLocation, setEditLocation] = useState(profile.location || '');
  const [editLogoUrl, setEditLogoUrl] = useState(profile.logoUrl || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 512,
        useWebWorker: true
      });

      const storageRef = ref(storage, `users/${profile.uid}/profile_${Date.now()}`);
      await uploadBytes(storageRef, compressedFile);
      const url = await getDownloadURL(storageRef);
      setEditLogoUrl(url);
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.uid) return;

    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'users', profile.uid), {
        name: editName,
        email: editEmail,
        phone: editPhone,
        location: editLocation,
        logoUrl: editLogoUrl,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {onBack && (
        <button onClick={onBack} className="text-brand-primary font-bold text-sm mb-4">
          {isRtl ? '← عودة' : '← Back'}
        </button>
      )}
      
      <div className="bg-brand-surface rounded-3xl border border-brand-border shadow-sm overflow-hidden">
        <div className="bg-brand-primary px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">
            {isRtl ? 'تعديل البيانات الشخصية' : 'Edit Personal Info'}
          </h3>
          {saveSuccess && (
            <span className="text-white text-sm font-bold bg-white/20 px-3 py-1 rounded-lg">
              {isRtl ? 'تم الحفظ' : 'Saved'}
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Photo Upload */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 mb-2">
              <div className="w-full h-full bg-brand-background rounded-2xl border border-brand-border flex items-center justify-center text-brand-text-muted overflow-hidden shadow-sm">
                {editLogoUrl ? (
                  <img src={editLogoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={32} />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 p-2 bg-brand-primary text-white rounded-xl cursor-pointer shadow-lg hover:bg-brand-primary-hover transition-all">
                <Camera size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
              </label>
              {isUploading && (
                <div className="absolute inset-0 bg-brand-surface/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary"></div>
                </div>
              )}
            </div>
            <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
              {isRtl ? 'الصورة الشخصية' : 'Profile Photo'}
            </span>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{isRtl ? 'الاسم' : 'Name'}</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                <input 
                  type="email" 
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{isRtl ? 'رقم التواصل' : 'Contact Number'}</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
                <input 
                  type="tel" 
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{isRtl ? 'الموقع' : 'Location'}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                <input 
                  type="text" 
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <HapticButton
              type="submit"
              disabled={isSaving}
              className="bg-brand-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-primary-hover transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-primary/20"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save size={18} />
                  {isRtl ? 'حفظ التغييرات' : 'Save Changes'}
                </>
              )}
            </HapticButton>
          </div>
        </form>
      </div>

      {/* System Optimization Section */}
      <div className="bg-brand-surface rounded-3xl border border-brand-border shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
            <Cpu size={24} />
          </div>
          <div>
            <h4 className="font-bold text-brand-text-main">
              {isRtl ? 'تحسين أداء التطبيق' : 'App Performance Optimization'}
            </h4>
            <p className="text-[10px] text-brand-text-muted font-medium uppercase tracking-wider">
              {isRtl ? 'تنظيف ذاكرة التخزين المؤقت وتحسين سرعة التصفح' : 'Clear cache and optimize browsing speed'}
            </p>
          </div>
        </div>
        
        <div className="bg-brand-background/50 rounded-2xl p-4 mb-4 border border-brand-border/50">
          <p className="text-xs text-brand-text-muted leading-relaxed">
            {isRtl 
              ? 'إذا كنت تواجه بطئاً في تحميل الصور أو البيانات، يمكنك استخدام أداة التحسين الذكية لتنظيف الملفات المؤقتة وإعادة ضبط أداء الواجهة بشكل فخم وسلس.'
              : 'If you experience slow loading of images or data, use our smart optimizer to purge temporary files and reset the UI performance for a smooth, premium experience.'}
          </p>
        </div>

        <HapticButton
          onClick={() => setIsOptimizerOpen(true)}
          className="w-full bg-brand-background border border-brand-border text-brand-text-main py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-surface transition-all group shadow-sm"
        >
          <Zap size={18} className="text-brand-primary group-hover:scale-125 transition-transform" />
          {isRtl ? 'تشغيل أداة التحسين الذكية' : 'Run Smart Optimizer Tool'}
        </HapticButton>
      </div>

      <CacheOptimizer 
        isOpen={isOptimizerOpen} 
        onClose={() => setIsOptimizerOpen(false)} 
      />
    </div>
  );
};
