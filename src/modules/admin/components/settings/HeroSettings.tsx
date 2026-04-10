import React from 'react';
import { Type } from 'lucide-react';
import { SiteSettings } from '../../../../core/types';

interface HeroSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const HeroSettings: React.FC<HeroSettingsProps> = ({ settings, setSettings, isRtl }) => {
  return (
    <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
      <h2 className="text-xl font-bold text-brand-text-main">{isRtl ? 'قسم الترحيب (Hero)' : 'Hero Section'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <Type size={14} />
            {isRtl ? 'العنوان الرئيسي (عربي)' : 'Main Title (Arabic)'}
          </label>
          <input
            type="text"
            value={settings.heroTitleAr}
            onChange={(e) => setSettings({ ...settings, heroTitleAr: e.target.value })}
            className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
            dir="rtl"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <Type size={14} />
            {isRtl ? 'العنوان الرئيسي (إنجليزي)' : 'Main Title (English)'}
          </label>
          <input
            type="text"
            value={settings.heroTitleEn}
            onChange={(e) => setSettings({ ...settings, heroTitleEn: e.target.value })}
            className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <Type size={14} />
            {isRtl ? 'الوصف (عربي)' : 'Description (Arabic)'}
          </label>
          <textarea
            value={settings.heroDescriptionAr}
            onChange={(e) => setSettings({ ...settings, heroDescriptionAr: e.target.value })}
            className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all h-24"
            dir="rtl"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <Type size={14} />
            {isRtl ? 'الوصف (إنجليزي)' : 'Description (English)'}
          </label>
          <textarea
            value={settings.heroDescriptionEn}
            onChange={(e) => setSettings({ ...settings, heroDescriptionEn: e.target.value })}
            className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all h-24"
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
};
