import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Palette, Save, Type, Layout, Sparkles } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile, BrandingPreferences } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface UserSettingsProps {
  profile: UserProfile;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ profile }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [branding, setBranding] = useState<BrandingPreferences>(profile.branding || {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    borderRadius: 'md',
    fontFamily: 'Inter',
    enableGlassmorphism: false
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (!profile.uid) return;
    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'users', profile.uid), {
        branding: branding,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-brand-surface rounded-3xl border border-brand-border shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-brand-text-main">
          {isRtl ? 'إعدادات الهوية البصرية' : 'Visual Identity Settings'}
        </h3>
        {saveSuccess && (
          <span className="text-brand-primary text-sm font-bold bg-brand-primary/10 px-3 py-1 rounded-lg">
            {isRtl ? 'تم الحفظ' : 'Saved'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-brand-text-muted uppercase">{isRtl ? 'اللون الأساسي' : 'Primary Color'}</label>
          <input 
            type="color" 
            value={branding.primaryColor}
            onChange={e => setBranding({...branding, primaryColor: e.target.value})}
            className="w-full h-10 rounded-xl cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-brand-text-muted uppercase">{isRtl ? 'اللون الثانوي' : 'Secondary Color'}</label>
          <input 
            type="color" 
            value={branding.secondaryColor}
            onChange={e => setBranding({...branding, secondaryColor: e.target.value})}
            className="w-full h-10 rounded-xl cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-brand-text-muted uppercase">{isRtl ? 'نوع الخط' : 'Font Family'}</label>
          <select 
            value={branding.fontFamily}
            onChange={e => setBranding({...branding, fontFamily: e.target.value as any})}
            className="w-full p-2.5 bg-brand-background border border-brand-border rounded-xl outline-none"
          >
            {['Inter', 'Roboto', 'Poppins', 'Montserrat', 'System'].map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
        </div>
      </div>

      <HapticButton
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-primary-hover transition-all disabled:opacity-50"
      >
        {isSaving ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <>
            <Save size={18} />
            {isRtl ? 'حفظ إعدادات الهوية' : 'Save Identity Settings'}
          </>
        )}
      </HapticButton>
    </div>
  );
};
