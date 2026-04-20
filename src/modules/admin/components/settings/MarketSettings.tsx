import React from 'react';
import { SiteSettings } from '../../../../core/types';
import { LayoutGrid, Smartphone, Maximize, Zap, Layout, Monitor, Cpu, Sparkles, Layers, ListChecks } from 'lucide-react';

interface MarketSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const MarketSettings: React.FC<MarketSettingsProps> = ({ settings, setSettings, isRtl }) => {
  return (
    <div className="p-8 bg-brand-surface border border-brand-border rounded-[2.5rem] space-y-8 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-brand-text-main flex items-center gap-3">
          <LayoutGrid size={24} className="text-brand-primary" />
          {isRtl ? 'هندسة عرض السوق' : 'Market Display Architecture'}
        </h3>
        <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={12} />
          {isRtl ? 'تحسين ذكي' : 'Smart Optimization'}
        </div>
      </div>

      {/* Genius Feature: Instagram Style Full Bleed */}
      <div className="p-6 bg-brand-primary/5 rounded-3xl border border-brand-primary/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-brand-primary" />
              <h4 className="text-sm font-black text-brand-text-main">
                {isRtl ? 'عرض انستقرام السينمائي (Full Bleed)' : 'Instagram Cinematic View (Full Bleed)'}
              </h4>
            </div>
            <p className="text-xs text-brand-text-muted font-medium">
              {isRtl 
                ? 'إلغاء الحواف الجانبية في الهاتف لعرض المنتجات بكامل عرض الشاشة لتجربة غامرة' 
                : 'Remove horizontal margins on mobile for edge-to-edge product display'}
            </p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              gridSettings: { ...prev.gridSettings!, fullBleedMobile: !prev.gridSettings?.fullBleedMobile }
            }))}
            className={`w-14 h-7 rounded-full transition-all relative ${
              settings.gridSettings?.fullBleedMobile ? 'bg-brand-primary' : 'bg-slate-300'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${
              settings.gridSettings?.fullBleedMobile ? (isRtl ? 'right-8' : 'left-8') : (isRtl ? 'right-1' : 'left-1')
            }`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Layout Mode Selector */}
        <div className="space-y-4 md:col-span-2">
          <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
            <Layout size={14} />
            {isRtl ? 'نمط التخطيط الافتراضي' : 'Default Layout Style'}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['grid', 'mosaic', 'feed', 'compact'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSettings(prev => ({
                  ...prev,
                  gridSettings: { ...prev.gridSettings!, marketplaceLayoutMode: mode }
                }))}
                className={`p-4 rounded-2xl border transition-all text-center space-y-2 ${
                  settings.gridSettings?.marketplaceLayoutMode === mode
                    ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-lg shadow-brand-primary/5'
                    : 'bg-brand-background border-brand-border text-brand-text-muted hover:border-brand-primary/30'
                }`}
              >
                <div className="w-10 h-10 bg-brand-surface rounded-xl flex items-center justify-center mx-auto border border-inherit">
                  {mode === 'grid' && <LayoutGrid size={20} />}
                  {mode === 'mosaic' && <Maximize size={20} />}
                  {mode === 'feed' && <Layout size={20} />}
          {mode === 'compact' && <ListChecks size={20} />}
                </div>
                <span className="block text-[10px] font-black uppercase tracking-wider">
                  {isRtl ? 
                    (mode === 'grid' ? 'شبكة' : mode === 'mosaic' ? 'موزاييك' : mode === 'feed' ? 'تلقيم' : 'مدمج') : 
                    mode
                  }
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Control */}
        <div className="flex items-center justify-between p-6 bg-brand-background border border-brand-border rounded-3xl group hover:border-brand-primary/30 transition-all">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-brand-primary animate-pulse" />
              <h4 className="text-sm font-black text-brand-text-main">
                {isRtl ? 'الطيار الآلي الذكي' : 'AI Auto-Pilot'}
              </h4>
            </div>
            <p className="text-[10px] text-brand-text-muted font-bold leading-relaxed">
              {isRtl 
                ? 'توزيع ديناميكي للمدمرات يعتمد على جودة الصورة وكثافة الطلب' 
                : 'Dynamic grid distribution based on image quality and demand density'}
            </p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              gridSettings: { ...prev.gridSettings!, aiAutoPilot: !prev.gridSettings?.aiAutoPilot }
            }))}
            className={`w-12 h-6 rounded-full transition-all relative ${
              settings.gridSettings?.aiAutoPilot ? 'bg-brand-primary' : 'bg-slate-300'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
              settings.gridSettings?.aiAutoPilot ? (isRtl ? 'right-7' : 'left-7') : (isRtl ? 'right-1' : 'left-1')
            }`} />
          </button>
        </div>

        {/* Immersion Effects */}
        <div className="space-y-4">
          <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
            <Layers size={14} />
            {isRtl ? 'تأثيرات الانغماس' : 'Immersion Effects'}
          </label>
          <select
            value={settings.gridSettings?.immersionEffect || 'none'}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              gridSettings: { ...prev.gridSettings!, immersionEffect: e.target.value as any }
            }))}
            className="w-full p-4 rounded-xl bg-brand-background border border-brand-border text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/20 appearance-none"
          >
            <option value="none">{isRtl ? 'بدون تأثير' : 'None'}</option>
            <option value="glass">{isRtl ? 'زجاجي (Glassmorphism)' : 'Glassmorphism'}</option>
            <option value="depth">{isRtl ? 'عمق بصري (Parallax)' : 'Visual Depth'}</option>
            <option value="neural">{isRtl ? 'هجين عصبي (Neural Hybrid)' : 'Neural Hybrid'}</option>
          </select>
        </div>

        {/* Grid Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`space-y-2 relative ${settings.gridSettings?.aiAutoPilot ? 'opacity-50' : ''}`}>
            <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
              <Monitor size={12} />
              {isRtl ? 'أعمدة ويب' : 'Web Cols'}
              {settings.gridSettings?.aiAutoPilot && (
                <span className="text-[8px] bg-brand-primary/10 px-1 rounded lowercase">auto</span>
              )}
            </label>
            <input
              type="number"
              min="2" max="6"
              value={settings.gridSettings?.webCols || 4}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                gridSettings: { 
                  ...prev.gridSettings!, 
                  webCols: parseInt(e.target.value),
                  aiAutoPilot: false 
                }
              }))}
              className="w-full p-3 rounded-xl bg-brand-background border border-brand-border text-center font-black focus:border-brand-primary outline-none transition-all"
            />
          </div>

          <div className={`space-y-2 relative ${settings.gridSettings?.aiAutoPilot ? 'opacity-50' : ''}`}>
            <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
              <Smartphone size={12} />
              {isRtl ? 'أعمدة جوال' : 'Mobile Cols'}
              {settings.gridSettings?.aiAutoPilot && (
                <span className="text-[8px] bg-brand-primary/10 px-1 rounded lowercase">auto</span>
              )}
            </label>
            <input
              type="number"
              min="1" max="3"
              value={settings.gridSettings?.mobileCols || 2}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                gridSettings: { 
                  ...prev.gridSettings!, 
                  mobileCols: parseInt(e.target.value),
                  aiAutoPilot: false
                }
              }))}
              className="w-full p-3 rounded-xl bg-brand-background border border-brand-border text-center font-black focus:border-brand-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Performance Mode */}
        <div className="space-y-4">
          <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
          <Cpu size={14} />
            {isRtl ? 'وضع الأداء' : 'Performance Architecture'}
          </label>
          <div className="flex bg-brand-background p-1.5 rounded-2xl border border-brand-border">
            {(['speed', 'balanced', 'quality'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSettings(prev => ({
                  ...prev,
                  gridSettings: { ...prev.gridSettings!, performanceMode: mode }
                }))}
                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all ${
                  settings.gridSettings?.performanceMode === mode 
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                    : 'text-brand-text-muted hover:text-brand-text-main'
                }`}
              >
                {isRtl ? (mode === 'speed' ? 'سرعة قصوى' : mode === 'balanced' ? 'متوازن' : 'جودة فائقة') : mode}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
            <LayoutGrid size={12} />
            {isRtl ? 'المسافة (الفجوة) px' : 'Grid Gap Size'}
          </label>
          <input
            type="number"
            value={settings.gridSettings?.gap || 16}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              gridSettings: { ...prev.gridSettings!, gap: parseInt(e.target.value) }
            }))}
            className="w-full p-4 rounded-xl bg-brand-background border border-brand-border font-black text-center"
          />
        </div>
      </div>
    </div>
  );
};
