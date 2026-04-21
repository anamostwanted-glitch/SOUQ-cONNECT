import React, { useState } from 'react';
import { Type, Wand2, Loader2, Layout, Sparkles } from 'lucide-react';
import { SiteSettings } from '../../../../core/types';
import { optimizeSettingsContent } from '../../../../core/services/geminiService';
import { toast } from 'sonner';

interface HeroSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const HeroSettings: React.FC<HeroSettingsProps> = ({ settings, setSettings, isRtl }) => {
  const [isOptimizing, setIsOptimizing] = useState<string | null>(null);

  const handleOptimize = async (field: keyof SiteSettings, context: string, lang: 'ar' | 'en') => {
    try {
      setIsOptimizing(field as string);
      const optimized = await optimizeSettingsContent(context, settings[field] as string, lang);
      setSettings(prev => ({ ...prev, [field]: optimized }));
      toast.success(isRtl ? 'تم تحسين المحتوى!' : 'Content optimized!');
    } catch (error) {
      toast.error(isRtl ? 'حاول مرة أخرى' : 'Please try again');
    } finally {
      setIsOptimizing(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
          <Layout size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-brand-text-main">{isRtl ? 'الواجهة الرئيسية (Hero)' : 'Hero Navigation'}</h2>
          <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest leading-none mt-1">
             {isRtl ? 'صمم أول انطباع لعملائك' : 'Design the first impression for your users'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          { field: 'heroTitleAr', label: isRtl ? 'العنوان الرئيسي (عربي)' : 'Main Title (AR)', lang: 'ar', context: 'Engaging Hero Headline for a Multi-Vendor MarketPlace' },
          { field: 'heroTitleEn', label: isRtl ? 'العنوان الرئيسي (إنجليزي)' : 'Main Title (EN)', lang: 'en', context: 'Engaging Hero Headline for a Multi-Vendor MarketPlace' }
        ].map(item => (
          <div key={item.field} className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                   <Type size={14} className="text-brand-primary" />
                   {item.label}
                </label>
                <button 
                  onClick={() => handleOptimize(item.field as any, item.context, item.lang as any)}
                  className="p-1.5 bg-brand-primary/5 text-brand-primary rounded-lg hover:bg-brand-primary hover:text-white transition-all disabled:opacity-50"
                  disabled={!!isOptimizing}
                >
                   {isOptimizing === item.field ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                </button>
             </div>
             <input
               type="text"
               value={settings[item.field as keyof SiteSettings] as string || ''}
               onChange={(e) => setSettings({ ...settings, [item.field]: e.target.value })}
               className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none"
               dir={item.lang === 'ar' ? 'rtl' : 'ltr'}
             />
          </div>
        ))}

        {[
          { field: 'heroDescriptionAr', label: isRtl ? 'الوصف المساعد (عربي)' : 'Description (AR)', lang: 'ar', context: 'Compelling Sub-headline describing the value of our marketplace' },
          { field: 'heroDescriptionEn', label: isRtl ? 'الوصف المساعد (إنجليزي)' : 'Description (EN)', lang: 'en', context: 'Compelling Sub-headline describing the value of our marketplace' }
        ].map(item => (
          <div key={item.field} className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                   <Sparkles size={14} className="text-brand-primary" />
                   {item.label}
                </label>
                <button 
                  onClick={() => handleOptimize(item.field as any, item.context, item.lang as any)}
                  className="p-1.5 bg-brand-secondary/5 text-brand-secondary rounded-lg hover:bg-brand-secondary hover:text-white transition-all disabled:opacity-50"
                  disabled={!!isOptimizing}
                >
                   {isOptimizing === item.field ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                </button>
             </div>
             <textarea
               value={settings[item.field as keyof SiteSettings] as string || ''}
               onChange={(e) => setSettings({ ...settings, [item.field]: e.target.value })}
               className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main font-medium h-32 focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none resize-none leading-relaxed"
               dir={item.lang === 'ar' ? 'rtl' : 'ltr'}
             />
          </div>
        ))}
      </div>
    </div>
  );
};
