import React from 'react';
import { SiteSettings } from '../../../../core/types';
import { Mail, Globe, MapPin, Phone, Shield, FileText, Info, Camera } from 'lucide-react';

interface FooterSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'watermark' | 'loaderLogo' | 'favicon' | 'footerLogo') => void;
}

export const FooterSettings: React.FC<FooterSettingsProps> = ({ settings, setSettings, isRtl, handleFileUpload }) => {
  const updateFooter = (key: keyof SiteSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 md:p-8">
        <h3 className="text-xl font-black text-brand-text-main mb-6 flex items-center gap-3">
          <Info className="text-brand-primary" size={24} />
          {isRtl ? 'هوية التذييل (Footer Identity)' : 'Footer Identity'}
        </h3>

        <div className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-4">
            <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest block">
              {isRtl ? 'شعار التذييل' : 'Footer Logo'}
            </label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-16 bg-brand-background border-2 border-dashed border-brand-border rounded-xl flex items-center justify-center overflow-hidden group relative">
                {settings.footerLogoUrl ? (
                  <img src={settings.footerLogoUrl} alt="Footer Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <Globe className="text-brand-text-muted opacity-20" size={32} />
                )}
                <label className="absolute inset-0 bg-brand-primary/80 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white">
                  <Camera size={20} />
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e as any, 'footerLogo' as any)} accept="image/*" />
                </label>
              </div>
              <div className="flex-1">
                <p className="text-xs text-brand-text-muted font-medium leading-relaxed">
                  {isRtl 
                    ? 'يفضل استخدام شعار بخلفية شفافة (PNG) يظهر بوضوح على الخلفيات الداكنة.' 
                    : 'Recommended: Transparent PNG logo that looks good on dark surfaces.'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} />
                {isRtl ? 'عن المنصة (عربي)' : 'About Platform (Arabic)'}
              </label>
              <textarea
                value={settings.footerAboutAr || ''}
                onChange={(e) => updateFooter('footerAboutAr', e.target.value)}
                rows={3}
                className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all resize-none"
                placeholder="..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} />
                {isRtl ? 'عن المنصة (إنجليزي)' : 'About Platform (English)'}
              </label>
              <textarea
                value={settings.footerAboutEn || ''}
                onChange={(e) => updateFooter('footerAboutEn', e.target.value)}
                rows={3}
                className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all resize-none"
                placeholder="..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 md:p-8">
        <h3 className="text-xl font-black text-brand-text-main mb-6 flex items-center gap-3">
          <Globe className="text-brand-primary" size={24} />
          {isRtl ? 'معلومات التواصل' : 'Contact Information'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
              <Mail size={14} />
              {isRtl ? 'البريد الإلكتروني' : 'Support Email'}
            </label>
            <input
              type="email"
              value={settings.footerEmail || ''}
              onChange={(e) => updateFooter('footerEmail', e.target.value)}
              className="w-full bg-brand-background border border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              placeholder="support@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
              <Phone size={14} />
              {isRtl ? 'رقم الهاتف' : 'Contact Phone'}
            </label>
            <input
              type="tel"
              value={settings.footerPhone || ''}
              onChange={(e) => updateFooter('footerPhone', e.target.value)}
              className="w-full bg-brand-background border border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              placeholder="+971 ..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
              <Globe size={14} />
              {isRtl ? 'الموقع الإلكتروني' : 'Website URL'}
            </label>
            <input
              type="url"
              value={settings.footerWebsite || ''}
              onChange={(e) => updateFooter('footerWebsite', e.target.value)}
              className="w-full bg-brand-background border border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
              <MapPin size={14} />
              {isRtl ? 'الموقع الجغرافي (عربي)' : 'Physical Address (Arabic)'}
            </label>
            <input
              type="text"
              value={settings.footerAddressAr || ''}
              onChange={(e) => updateFooter('footerAddressAr', e.target.value)}
              className="w-full bg-brand-background border border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              placeholder="..."
            />
          </div>
        </div>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 md:p-8">
        <h3 className="text-xl font-black text-brand-text-main mb-6 flex items-center gap-3">
          <Shield className="text-brand-primary" size={24} />
          {isRtl ? 'الحقوق والأمان' : 'Legal & Security'}
        </h3>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                {isRtl ? 'نص الحقوق (عربي)' : 'Copyright Text (Arabic)'}
              </label>
              <input
                type="text"
                value={settings.footerCopyrightAr || ''}
                onChange={(e) => updateFooter('footerCopyrightAr', e.target.value)}
                className="w-full bg-brand-background border border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                placeholder="جميع الحقوق محفوظة © ..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                {isRtl ? 'نص الحقوق (إنجليزي)' : 'Copyright Text (English)'}
              </label>
              <input
                type="text"
                value={settings.footerCopyrightEn || ''}
                onChange={(e) => updateFooter('footerCopyrightEn', e.target.value)}
                className="w-full bg-brand-background border border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                placeholder="All rights reserved © ..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-brand-background border border-brand-border rounded-2xl">
            <div className="flex items-center gap-3">
              <Shield className="text-brand-primary" size={20} />
              <div>
                <p className="text-sm font-black text-brand-text-main">
                  {isRtl ? 'إظهار شارة الأمان (Core Team)' : 'Show Security Badge (Core Team)'}
                </p>
                <p className="text-[10px] text-brand-text-muted font-medium">
                  {isRtl ? 'يعرض شارة "حماية فريق النواة مفعلة" في التذييل.' : 'Displays "Core Team Security Active" badge in footer.'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={!!settings.footerShowSecurityBadge}
                onChange={(e) => updateFooter('footerShowSecurityBadge', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
