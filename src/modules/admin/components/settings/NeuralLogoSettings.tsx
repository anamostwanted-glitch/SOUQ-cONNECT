import React from 'react';
import { Sparkles } from 'lucide-react';
import { SiteSettings } from '../../../../core/types';

interface NeuralLogoSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
  activeLogoTab: 'hero' | 'header';
  setActiveLogoTab: React.Dispatch<React.SetStateAction<'hero' | 'header'>>;
}

export const NeuralLogoSettings: React.FC<NeuralLogoSettingsProps> = ({ settings, setSettings, isRtl, activeLogoTab, setActiveLogoTab }) => {
  return (
    <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <Sparkles className="text-brand-primary" size={24} />
          <h2 className="text-xl font-bold text-brand-text-main">
            {isRtl ? 'تخصيص الشعار العصبي' : 'Neural Logo Customization'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">
            {activeLogoTab === 'header' 
              ? (settings.headerShowNeuralLogo ? (isRtl ? 'مفعل' : 'Enabled') : (isRtl ? 'معطل' : 'Disabled'))
              : (settings.showNeuralLogo ? (isRtl ? 'مفعل' : 'Enabled') : (isRtl ? 'معطل' : 'Disabled'))
            }
          </span>
          <button
            type="button"
            onClick={() => {
              if (activeLogoTab === 'header') {
                setSettings({ ...settings, headerShowNeuralLogo: !settings.headerShowNeuralLogo });
              } else {
                setSettings({ ...settings, showNeuralLogo: !settings.showNeuralLogo });
              }
            }}
            className={`w-12 h-6 rounded-full transition-all relative ${
              (activeLogoTab === 'header' ? settings.headerShowNeuralLogo : settings.showNeuralLogo) 
                ? 'bg-brand-primary' 
                : 'bg-brand-border'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
              (activeLogoTab === 'header' ? settings.headerShowNeuralLogo : settings.showNeuralLogo) 
                ? (isRtl ? 'right-7' : 'left-7') 
                : (isRtl ? 'right-1' : 'left-1')
            }`} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-brand-background rounded-xl border border-brand-border">
        <button
          onClick={() => setActiveLogoTab('hero')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeLogoTab === 'hero' 
              ? 'bg-brand-surface text-brand-primary shadow-sm border border-brand-border' 
              : 'text-brand-text-muted hover:text-brand-text-main'
          }`}
        >
          {isRtl ? 'الشعار الرئيسي (Hero)' : 'Main Logo (Hero)'}
        </button>
        <button
          onClick={() => setActiveLogoTab('header')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeLogoTab === 'header' 
              ? 'bg-brand-surface text-brand-primary shadow-sm border border-brand-border' 
              : 'text-brand-text-muted hover:text-brand-text-main'
          }`}
        >
          {isRtl ? 'شعار القائمة (Header)' : 'Menu Logo (Header)'}
        </button>
      </div>

      {/* Add more controls here as needed, simplified for now */}
    </div>
  );
};
