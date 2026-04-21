import React from 'react';
import { ShieldAlert, Users, Plus, X, Mail } from 'lucide-react';
import { SiteSettings } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';

interface MaintenanceSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const MaintenanceSettings: React.FC<MaintenanceSettingsProps> = ({ settings, setSettings, isRtl }) => {
  const [newEmail, setNewEmail] = React.useState('');

  const handleAddEmail = () => {
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      const currentEmails = settings.maintenanceBypassEmails || [];
      if (!currentEmails.includes(newEmail)) {
        setSettings({
          ...settings,
          maintenanceBypassEmails: [...currentEmails, newEmail]
        });
      }
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setSettings({
      ...settings,
      maintenanceBypassEmails: (settings.maintenanceBypassEmails || []).filter(e => e !== email)
    });
  };

  return (
    <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-error/10 rounded-xl text-brand-error">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-text-main">
              {isRtl ? 'وضع الصيانة / قيد الإنشاء' : 'Maintenance / Coming Soon Mode'}
            </h2>
            <p className="text-xs text-brand-text-muted font-medium">
              {isRtl 
                ? 'تفعيل هذا الوضع سيمنع المستخدمين العاديين من تصفح الموقع وعرض صفحة "قيد الإنشاء".' 
                : 'Enabling this mode will prevent regular users from browsing and show a "Coming Soon" page.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-black uppercase tracking-widest ${settings.maintenanceMode ? 'text-brand-error' : 'text-brand-text-muted'}`}>
            {settings.maintenanceMode ? (isRtl ? 'مفعل' : 'Enabled') : (isRtl ? 'معطل' : 'Disabled')}
          </span>
          <button
            onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
            className={`w-14 h-7 rounded-full transition-all relative ${settings.maintenanceMode ? 'bg-brand-error' : 'bg-brand-border'}`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isRtl ? (settings.maintenanceMode ? 'left-1' : 'right-1') : (settings.maintenanceMode ? 'right-1' : 'left-1')}`} />
          </button>
        </div>
      </div>

      <div className="pt-6 border-t border-brand-border/50 space-y-6">
        <div className="space-y-4">
          <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
            <Users size={14} />
            {isRtl ? 'رسائل البريد المستثناة (الأدمن)' : 'Bypass Emails (Admins)'}
          </label>
          <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider">
            {isRtl 
              ? 'أصحاب هذه العناوين سيتمكنون من تصفح الموقع حتى أثناء وضع الصيانة.' 
              : 'Owners of these emails will be able to browse the site even during maintenance mode.'}
          </p>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={16} />
              <input 
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={isRtl ? 'أدخل البريد الإلكتروني...' : 'Enter email address...'}
                className="w-full pl-10 pr-4 py-3 bg-brand-background rounded-xl border border-brand-border text-brand-text-main outline-none focus:border-brand-primary transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
              />
            </div>
            <HapticButton 
              onClick={handleAddEmail}
              className="px-6 bg-brand-primary text-white rounded-xl font-bold flex items-center gap-2"
            >
              <Plus size={18} />
              {isRtl ? 'إضافة' : 'Add'}
            </HapticButton>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {(settings.maintenanceBypassEmails || []).map((email) => (
              <div 
                key={email}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-background border border-brand-border rounded-lg text-xs font-bold text-brand-text-main group hover:border-brand-error transition-all"
              >
                <span>{email}</span>
                <button 
                  onClick={() => handleRemoveEmail(email)}
                  className="text-brand-text-muted hover:text-brand-error transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {(settings.maintenanceBypassEmails || []).length === 0 && (
              <p className="text-xs text-brand-text-muted italic py-2">
                {isRtl ? 'لم يتم إضافة عناوين بريد مستثناة بعد.' : 'No bypass emails added yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
