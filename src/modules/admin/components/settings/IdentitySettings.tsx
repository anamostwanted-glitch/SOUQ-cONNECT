import React, { useState } from 'react';
import { ImageIcon, Upload, Loader2, X, Type, Search, Globe, Wand2, Palette } from 'lucide-react';
import { SiteSettings } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { optimizeSettingsContent } from '../../../../core/services/geminiService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface IdentitySettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'watermark' | 'loaderLogo' | 'favicon') => Promise<void>;
  isUploadingLogo: boolean;
}

export const IdentitySettings: React.FC<IdentitySettingsProps> = ({ settings, setSettings, isRtl, handleFileUpload, isUploadingLogo }) => {
  const [isOptimizing, setIsOptimizing] = useState<string | null>(null);

  const handleOptimize = async (field: keyof SiteSettings, context: string, lang: 'ar' | 'en') => {
    try {
      setIsOptimizing(field as string);
      const optimized = await optimizeSettingsContent(context, settings[field] as string, lang);
      setSettings(prev => ({ ...prev, [field]: optimized }));
      toast.success(isRtl ? 'تم تحسين النص بذكاء!' : 'Text optimized via AI!');
    } catch (error) {
      toast.error(isRtl ? 'فشل التحسين الذكي' : 'AI optimization failed');
    } finally {
      setIsOptimizing(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
          <Palette size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-brand-text-main">{isRtl ? 'الهوية البصرية والبحث' : 'Brand Identity & SEO'}</h2>
          <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest">{isRtl ? 'تحكم في كيفية ظهور براندك لمحركات البحث' : 'Manage how your brand appears across search and web'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Site Name */}
        <div className="space-y-4 md:col-span-2">
          <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
            <Type size={14} className="text-brand-primary" />
            {isRtl ? 'اسم المنصة المركزي' : 'Core Platform Name'}
          </label>
          <div className="relative group">
            <input 
              type="text" 
              value={settings.siteName || ''}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="w-full p-4 bg-brand-background rounded-2xl border border-brand-border text-brand-text-main font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all outline-none"
              placeholder={isRtl ? 'أدخل اسم الموقع' : 'Enter site name'}
            />
          </div>
        </div>

        {/* Logo Uploads */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
            <ImageIcon size={14} className="text-brand-primary" />
            {isRtl ? 'الشعار الرئيسي' : 'Primary Brand Logo'}
          </label>
          <div className="p-6 bg-brand-background rounded-3xl border border-brand-border flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden relative group shadow-inner">
              {settings.logoUrl ? (
                <>
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                  <button 
                    onClick={() => setSettings({ ...settings, logoUrl: '' })}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <X size={20} />
                  </button>
                </>
              ) : (
                <ImageIcon size={32} className="text-brand-text-muted/20" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <label className="cursor-pointer flex items-center justify-center gap-2 px-5 py-3 bg-brand-primary text-white rounded-xl text-xs font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/20">
                {isUploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {isRtl ? 'تحديث الشعار' : 'Update Logo'}
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} disabled={isUploadingLogo} />
              </label>
              <p className="text-[9px] text-brand-text-muted font-bold text-center uppercase tracking-tighter">SVG / PNG / WebP preferred</p>
            </div>
          </div>
        </div>

        {/* Favicon Upload */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
            <Globe size={14} className="text-brand-primary" />
            {isRtl ? 'أيقونة المتصفح' : 'Favicon'}
          </label>
          <div className="p-6 bg-brand-background rounded-3xl border border-brand-border flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden relative group shadow-inner">
              {settings.faviconUrl ? (
                <>
                  <img src={settings.faviconUrl} alt="Favicon" className="w-12 h-12 object-contain" />
                  <button 
                    onClick={() => setSettings({ ...settings, faviconUrl: '' })}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <X size={20} />
                  </button>
                </>
              ) : (
                <Search size={32} className="text-brand-text-muted/20" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <label className="cursor-pointer flex items-center justify-center gap-2 px-5 py-3 bg-brand-surface text-brand-text-main border border-brand-border rounded-xl text-xs font-black hover:bg-brand-background transition-all shadow-sm">
                {isUploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {isRtl ? 'تغيير الأيقونة' : 'Change Favicon'}
                <input type="file" className="hidden" accept="image/x-icon,image/png" onChange={(e) => handleFileUpload(e, 'favicon')} disabled={isUploadingLogo} />
              </label>
              <p className="text-[9px] text-brand-text-muted font-bold text-center uppercase tracking-tighter">Perfect 32x32px Favicon</p>
            </div>
          </div>
        </div>

        {/* SEO Section */}
        <div className="md:col-span-2 pt-10 border-t border-brand-border/40">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Search size={20} />
                 </div>
                 <h3 className="text-lg font-black text-brand-text-main">
                    {isRtl ? 'تحسين محركات البحث' : 'SEO Optimization'}
                 </h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-brand-primary/10 rounded-full">
                 <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                 <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest leading-none mt-0.5">Neural Scribe Active</span>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Meta Titles */}
              {[
                { field: 'seoTitleAr', lang: 'ar', label: isRtl ? 'عنوان الميتا (عربي)' : 'Meta Title (AR)', context: 'SEO Meta Title for AI Multi-Vendor MarketPlace' },
                { field: 'seoTitleEn', lang: 'en', label: isRtl ? 'عنوان الميتا (إنجليزي)' : 'Meta Title (EN)', context: 'SEO Meta Title for AI Multi-Vendor MarketPlace' }
              ].map((item) => (
                <div key={item.field} className="space-y-3">
                   <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-brand-text-muted uppercase tracking-[0.2em]">{item.label}</label>
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
                     className="w-full p-4 bg-brand-background rounded-2xl border border-brand-border text-brand-text-main font-bold focus:border-brand-primary/50 transition-all outline-none"
                     placeholder="..."
                   />
                </div>
              ))}

              {/* Meta Descriptions */}
              {[
                { field: 'seoDescriptionAr', lang: 'ar', label: isRtl ? 'وصف الميتا (عربي)' : 'Meta Description (AR)', context: 'SEO Meta Description for AI Multi-Vendor MarketPlace' },
                { field: 'seoDescriptionEn', lang: 'en', label: isRtl ? 'وصف الميتا (إنجليزي)' : 'Meta Description (EN)', context: 'SEO Meta Description for AI Multi-Vendor MarketPlace' }
              ].map((item) => (
                <div key={item.field} className="space-y-3">
                   <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-brand-text-muted uppercase tracking-[0.2em]">{item.label}</label>
                      <button 
                        onClick={() => handleOptimize(item.field as any, item.context, item.lang as any)}
                        className="p-1.5 bg-emerald-500/5 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                        disabled={!!isOptimizing}
                      >
                         {isOptimizing === item.field ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      </button>
                   </div>
                   <textarea 
                     value={settings[item.field as keyof SiteSettings] as string || ''}
                     onChange={(e) => setSettings({ ...settings, [item.field]: e.target.value })}
                     className="w-full p-4 bg-brand-background rounded-2xl border border-brand-border text-brand-text-main font-medium min-h-[120px] focus:border-brand-primary/50 transition-all outline-none resize-none leading-relaxed"
                     placeholder="..."
                   />
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
