import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile, BrandingPreferences } from '../../../core/types';
import { motion } from 'motion/react';
import { Palette, Type, Layout, Save, RotateCcw, Wand2, Loader2, Sparkles } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { useBranding } from '../../../core/providers/BrandingProvider';
import { generateBrandingSuggestions, handleAiError } from '../../../core/services/geminiService';
import { HapticButton } from '../../../shared/components/HapticButton';
import { toast } from 'sonner';

interface UserBrandingSettingsProps {
  profile: UserProfile;
}

const DEFAULT_BRANDING: BrandingPreferences = {
  primaryColor: '#1b97a7',
  secondaryColor: '#64748b',
  borderRadius: 'xl',
  fontFamily: 'Inter',
  enableGlassmorphism: true,
};

export const UserBrandingSettings: React.FC<UserBrandingSettingsProps> = ({ profile }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const { branding: globalBranding, updateBranding } = useBranding();
  const [branding, setBranding] = useState<BrandingPreferences>(profile.branding || globalBranding || DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        branding: branding
      });
      updateBranding(branding);
      toast.success(isRtl ? 'تم حفظ إعدادات الهوية بنجاح' : 'Branding settings saved successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}/branding`, false);
    } finally {
      setSaving(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!profile.companyName && !profile.name) return;
    setIsAiLoading(true);
    try {
      const result = await generateBrandingSuggestions(
        profile.companyName || profile.name,
        profile.bio || '',
        i18n.language
      );
      setBranding({
        ...branding,
        primaryColor: result.primaryColor,
        secondaryColor: result.secondaryColor,
        fontFamily: result.fontFamily as any,
        borderRadius: result.borderRadius as any,
        enableGlassmorphism: result.enableGlassmorphism
      });
      toast.success(isRtl ? 'تم توليد اقتراحات ذكية بنجاح!' : 'AI suggestions generated successfully!');
    } catch (error) {
      handleAiError(error, 'User branding suggestions');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Palette size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-brand-text-main">{isRtl ? 'الهوية البصرية الشخصية' : 'Personal Branding'}</h3>
            <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'خصص مظهر حسابك' : 'Customize your account look'}</p>
          </div>
        </div>
        <HapticButton
          onClick={handleAiSuggest}
          disabled={isAiLoading}
          className="flex items-center gap-2 bg-brand-surface border border-brand-border text-brand-text-main px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-primary/5 hover:text-brand-primary transition-all"
        >
          {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          {isRtl ? 'اقتراح ذكي' : 'AI Suggest'}
        </HapticButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Colors */}
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
              <Palette size={14} /> {isRtl ? 'الألوان الأساسية' : 'Primary Colors'}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-brand-text-muted">{isRtl ? 'اللون الأساسي' : 'Primary'}</span>
                <div className="flex items-center gap-2 p-2 bg-brand-background rounded-xl border border-brand-border">
                  <input 
                    type="color" 
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-[10px] font-mono font-bold uppercase">{branding.primaryColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-brand-text-muted">{isRtl ? 'اللون الثانوي' : 'Secondary'}</span>
                <div className="flex items-center gap-2 p-2 bg-brand-background rounded-xl border border-brand-border">
                  <input 
                    type="color" 
                    value={branding.secondaryColor}
                    onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-[10px] font-mono font-bold uppercase">{branding.secondaryColor}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
              <Type size={14} /> {isRtl ? 'الخطوط' : 'Typography'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Inter', 'Roboto', 'Poppins', 'Montserrat'].map((font) => (
                <button
                  key={font}
                  onClick={() => setBranding({ ...branding, fontFamily: font as any })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    branding.fontFamily === font 
                      ? 'bg-brand-primary text-white border-brand-primary' 
                      : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/30'
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Style & Radius */}
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
              <Layout size={14} /> {isRtl ? 'الحواف والنمط' : 'Radius & Style'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['none', 'md', 'xl', '2xl', 'full'].map((radius) => (
                <button
                  key={radius}
                  onClick={() => setBranding({ ...branding, borderRadius: radius as any })}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    branding.borderRadius === radius 
                      ? 'bg-brand-primary text-white border-brand-primary' 
                      : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/30'
                  }`}
                >
                  {radius}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-brand-background rounded-2xl border border-brand-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Sparkles size={16} />
              </div>
              <span className="text-xs font-bold text-brand-text-main">{isRtl ? 'تأثير الزجاج (Glassmorphism)' : 'Glassmorphism Effect'}</span>
            </div>
            <button
              onClick={() => setBranding({ ...branding, enableGlassmorphism: !branding.enableGlassmorphism })}
              className={`w-12 h-6 rounded-full transition-all relative ${branding.enableGlassmorphism ? 'bg-brand-primary' : 'bg-brand-border'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${branding.enableGlassmorphism ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <HapticButton
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isRtl ? 'حفظ الهوية البصرية' : 'Save Branding'}
          </HapticButton>
        </div>
      </div>
    </div>
  );
};
