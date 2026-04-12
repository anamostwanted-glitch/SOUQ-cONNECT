import React from 'react';
import { ImageIcon, Upload, Loader2, X, Type } from 'lucide-react';
import { SiteSettings } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';

interface IdentitySettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'watermark' | 'loaderLogo') => Promise<void>;
  isUploadingLogo: boolean;
}

export const IdentitySettings: React.FC<IdentitySettingsProps> = ({ settings, setSettings, isRtl, handleFileUpload, isUploadingLogo }) => {
  return (
    <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
      <h2 className="text-xl font-bold text-brand-text-main">{isRtl ? 'هوية الموقع البصرية' : 'Site Visual Identity'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="space-y-4 md:col-span-2">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <Type size={14} />
            {isRtl ? 'اسم الموقع (يظهر في عنوان المتصفح)' : 'Site Name (Browser Title)'}
          </label>
          <input 
            type="text" 
            value={settings.siteName || ''}
            onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-brand-text-main"
            placeholder={isRtl ? 'أدخل اسم الموقع' : 'Enter site name'}
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <ImageIcon size={14} />
            {isRtl ? 'شعار الموقع' : 'Site Logo'}
          </label>
          <div className="flex items-center gap-4 p-4 bg-brand-background rounded-xl border border-brand-border">
            <div className="w-16 h-16 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden relative group">
              {settings.logoUrl ? (
                <>
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => setSettings({ ...settings, logoUrl: '' })}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <ImageIcon size={24} className="text-brand-text-muted/30" />
              )}
            </div>
            <div className="flex-1">
              <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg text-xs font-bold hover:bg-brand-primary/20 transition-all">
                {isUploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {isRtl ? 'رفع شعار' : 'Upload Logo'}
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} disabled={isUploadingLogo} />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <ImageIcon size={14} />
            {isRtl ? 'العلامة المائية' : 'Watermark Logo'}
          </label>
          <div className="flex items-center gap-4 p-4 bg-brand-background rounded-xl border border-brand-border">
            <div className="w-16 h-16 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden relative group">
              {settings.watermarkUrl ? (
                <>
                  <img src={settings.watermarkUrl} alt="Watermark" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => setSettings({ ...settings, watermarkUrl: '' })}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <ImageIcon size={24} className="text-brand-text-muted/30" />
              )}
            </div>
            <div className="flex-1">
              <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg text-xs font-bold hover:bg-brand-primary/20 transition-all">
                {isUploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {isRtl ? 'رفع علامة مائية' : 'Upload Watermark'}
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'watermark')} disabled={isUploadingLogo} />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <ImageIcon size={14} />
            {isRtl ? 'نص العلامة المائية' : 'Watermark Text'}
          </label>
          <input 
            type="text" 
            value={settings.watermarkText || ''}
            onChange={(e) => setSettings({ ...settings, watermarkText: e.target.value })}
            className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-brand-text-main"
            placeholder={isRtl ? 'أدخل نص العلامة المائية' : 'Enter watermark text'}
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            {isRtl ? 'موقع العلامة المائية' : 'Watermark Position'}
          </label>
          <select 
            value={settings.watermarkPosition || 'bottom-right'}
            onChange={(e) => setSettings({ ...settings, watermarkPosition: e.target.value as any })}
            className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-brand-text-main"
          >
            <option value="top-left">{isRtl ? 'أعلى اليسار' : 'Top Left'}</option>
            <option value="top-right">{isRtl ? 'أعلى اليمين' : 'Top Right'}</option>
            <option value="center">{isRtl ? 'المنتصف' : 'Center'}</option>
            <option value="bottom-left">{isRtl ? 'أسفل اليسار' : 'Bottom Left'}</option>
            <option value="bottom-right">{isRtl ? 'أسفل اليمين' : 'Bottom Right'}</option>
          </select>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            {isRtl ? 'حجم العلامة المائية' : 'Watermark Scale'}
          </label>
          <input 
            type="number"
            step="0.1"
            min="0.1"
            max="2"
            value={settings.watermarkScale || 1}
            onChange={(e) => setSettings({ ...settings, watermarkScale: parseFloat(e.target.value) })}
            className="w-full p-3 bg-brand-background rounded-xl border border-brand-border text-brand-text-main"
          />
        </div>
      </div>
    </div>
  );
};
