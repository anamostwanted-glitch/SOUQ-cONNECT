import React from 'react';
import { SiteSettings } from '../../../../core/types';
import { ListChecks } from 'lucide-react';

interface RegistrationSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const RegistrationSettings: React.FC<RegistrationSettingsProps> = ({ settings, setSettings, isRtl }) => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
      <h3 className="text-lg font-black text-brand-text-main dark:text-white flex items-center gap-2">
        <ListChecks size={20} className="text-brand-primary" />
        {isRtl ? 'إعدادات قوائم التسجيل' : 'Registration Lists Settings'}
      </h3>
      <p className="text-sm text-brand-text-muted">
        {isRtl ? 'هنا يمكنك إدارة قوائم التسجيل المخصصة للمستخدمين والموردين.' : 'Manage custom registration lists for users and suppliers here.'}
      </p>
      {/* سيتم إضافة حقول إدارة القوائم هنا بناءً على متطلباتك */}
    </div>
  );
};
