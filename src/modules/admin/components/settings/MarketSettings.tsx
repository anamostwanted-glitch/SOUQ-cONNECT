import React from 'react';
import { SiteSettings } from '../../../../core/types';
import { LayoutGrid } from 'lucide-react';

interface MarketSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const MarketSettings: React.FC<MarketSettingsProps> = ({ settings, setSettings, isRtl }) => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
      <h3 className="text-lg font-black text-brand-text-main dark:text-white flex items-center gap-2">
        <LayoutGrid size={20} className="text-brand-primary" />
        {isRtl ? 'إعدادات عرض السوق' : 'Market Display Settings'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted">
            {isRtl ? 'عدد الأعمدة (ويب)' : 'Web Columns'}
          </label>
          <input
            type="number"
            value={settings.gridSettings?.webCols || 4}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              gridSettings: { ...prev.gridSettings, webCols: parseInt(e.target.value) }
            }))}
            className="w-full p-3 rounded-xl bg-brand-surface border border-brand-border"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted">
            {isRtl ? 'عدد الأعمدة (جوال)' : 'Mobile Columns'}
          </label>
          <input
            type="number"
            value={settings.gridSettings?.mobileCols || 2}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              gridSettings: { ...prev.gridSettings, mobileCols: parseInt(e.target.value) }
            }))}
            className="w-full p-3 rounded-xl bg-brand-surface border border-brand-border"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-brand-text-muted">
            {isRtl ? 'المسافة بين البطاقات (px)' : 'Gap Size (px)'}
          </label>
          <input
            type="number"
            value={settings.gridSettings?.gap || 16}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              gridSettings: { ...prev.gridSettings, gap: parseInt(e.target.value) }
            }))}
            className="w-full p-3 rounded-xl bg-brand-surface border border-brand-border"
          />
        </div>
      </div>
    </div>
  );
};
