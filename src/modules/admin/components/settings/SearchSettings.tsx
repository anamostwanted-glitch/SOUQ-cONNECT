import React from 'react';
import { Type, MousePointer2 } from 'lucide-react';
import { SiteSettings } from '../../../../core/types';

interface SearchSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const SearchSettings: React.FC<SearchSettingsProps> = ({ settings, setSettings, isRtl }) => {
  return (
    <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
      <h2 className="text-xl font-bold text-brand-text-main">{isRtl ? 'شريط البحث' : 'Search Bar'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <Type size={14} />
            {isRtl ? 'نص البحث الافتراضي (عربي)' : 'Search Placeholder (Arabic)'}
          </label>
          <input
            type="text"
            value={settings.searchPlaceholderAr}
            onChange={(e) => setSettings({ ...settings, searchPlaceholderAr: e.target.value })}
            className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
            dir="rtl"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <Type size={14} />
            {isRtl ? 'نص البحث الافتراضي (إنجليزي)' : 'Search Placeholder (English)'}
          </label>
          <input
            type="text"
            value={settings.searchPlaceholderEn}
            onChange={(e) => setSettings({ ...settings, searchPlaceholderEn: e.target.value })}
            className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <MousePointer2 size={14} />
            {isRtl ? 'نص زر الطلب (عربي)' : 'CTA Button Text (Arabic)'}
          </label>
          <input
            type="text"
            value={settings.ctaButtonAr}
            onChange={(e) => setSettings({ ...settings, ctaButtonAr: e.target.value })}
            className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
            dir="rtl"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <MousePointer2 size={14} />
            {isRtl ? 'نص زر الطلب (إنجليزي)' : 'CTA Button Text (English)'}
          </label>
          <input
            type="text"
            value={settings.ctaButtonEn}
            onChange={(e) => setSettings({ ...settings, ctaButtonEn: e.target.value })}
            className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
};
