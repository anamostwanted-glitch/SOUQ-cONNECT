import React from 'react';
import { SiteSettings } from '../../../../core/types';
import { Droplets, Activity, Zap, Maximize2, Gauge, MousePointer2 } from 'lucide-react';
import { motion } from 'motion/react';

interface FlubberSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const FlubberSettings: React.FC<FlubberSettingsProps> = ({ settings, setSettings, isRtl }) => {
  const flubber = settings.flubberSettings || {
    enabled: true,
    color: '#10b981',
    opacity: 0.4,
    blobCount: 4,
    speed: 1.0,
    scale: 1.0,
    gooeyness: 30,
    interactive: true
  };

  const updateFlubber = (updates: Partial<typeof flubber>) => {
    setSettings(prev => ({
      ...prev,
      flubberSettings: { ...flubber, ...updates }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-brand-surface rounded-2xl border border-brand-border">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-brand-teal/10 rounded-xl text-brand-teal">
            <Droplets size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-text-main">
              {isRtl ? 'تحكم فلوبر (Flubber AI Liquid)' : 'Flubber AI Liquid Settings'}
            </h3>
            <p className="text-sm text-brand-text-muted">
              {isRtl 
                ? 'تأثير سائل عضوي ومستقبلي خلف الشعار مستوحى من فيلم Flubber' 
                : 'Organic and futuristic liquid effect behind the logo inspired by Flubber'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-brand-background rounded-xl border border-brand-border">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-brand-teal" />
              <div>
                <p className="font-bold text-brand-text-main">
                  {isRtl ? 'تفعيل فلوبر' : 'Enable Flubber'}
                </p>
                <p className="text-xs text-brand-text-muted">
                  {isRtl ? 'إظهار التأثير السائل الديناميكي' : 'Show the dynamic liquid effect'}
                </p>
              </div>
            </div>
            <button
              onClick={() => updateFlubber({ enabled: !flubber.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                flubber.enabled ? 'bg-brand-teal' : 'bg-brand-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  flubber.enabled ? (isRtl ? '-translate-x-6' : 'translate-x-6') : (isRtl ? '-translate-x-1' : 'translate-x-1')
                }`}
              />
            </button>
          </div>

          {flubber.enabled && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Color Picker */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted">
                  {isRtl ? 'اللون' : 'Color'}
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color"
                    value={flubber.color}
                    onChange={(e) => updateFlubber({ color: e.target.value })}
                    className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none"
                  />
                  <input 
                    type="text"
                    value={flubber.color}
                    onChange={(e) => updateFlubber({ color: e.target.value })}
                    className="flex-1 bg-brand-background border border-brand-border rounded-xl px-4 py-2 text-sm text-brand-text-main"
                  />
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Droplets size={14} /> {isRtl ? 'الشفافية' : 'Opacity'}</span>
                  <span className="text-brand-teal">{Math.round(flubber.opacity * 100)}%</span>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={flubber.opacity}
                  onChange={(e) => updateFlubber({ opacity: parseFloat(e.target.value) })}
                  className="w-full accent-brand-teal"
                />
              </div>

              {/* Scale Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Maximize2 size={14} /> {isRtl ? 'الحجم' : 'Scale'}</span>
                  <span className="text-brand-teal">{flubber.scale.toFixed(1)}x</span>
                </label>
                <input 
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={flubber.scale}
                  onChange={(e) => updateFlubber({ scale: parseFloat(e.target.value) })}
                  className="w-full accent-brand-teal"
                />
              </div>

              {/* Speed Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Gauge size={14} /> {isRtl ? 'سرعة الحركة' : 'Motion Speed'}</span>
                  <span className="text-brand-teal">{flubber.speed.toFixed(1)}x</span>
                </label>
                <input 
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={flubber.speed}
                  onChange={(e) => updateFlubber({ speed: parseFloat(e.target.value) })}
                  className="w-full accent-brand-teal"
                />
              </div>

              {/* Gooeyness Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Activity size={14} /> {isRtl ? 'درجة اللزوجة' : 'Gooeyness'}</span>
                  <span className="text-brand-teal">{flubber.gooeyness}</span>
                </label>
                <input 
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={flubber.gooeyness}
                  onChange={(e) => updateFlubber({ gooeyness: parseInt(e.target.value) })}
                  className="w-full accent-brand-teal"
                />
              </div>

              {/* Blob Count Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Maximize2 size={14} /> {isRtl ? 'عدد الفقاعات' : 'Blob Count'}</span>
                  <span className="text-brand-teal">{flubber.blobCount}</span>
                </label>
                <input 
                  type="range"
                  min="2"
                  max="12"
                  step="1"
                  value={flubber.blobCount}
                  onChange={(e) => updateFlubber({ blobCount: parseInt(e.target.value) })}
                  className="w-full accent-brand-teal"
                />
              </div>

              {/* Interactive Toggle */}
              <div className="flex items-center justify-between p-4 bg-brand-background rounded-xl border border-brand-border md:col-span-2">
                <div className="flex items-center gap-3">
                  <MousePointer2 size={20} className="text-brand-teal" />
                  <div>
                    <p className="font-bold text-brand-text-main">
                      {isRtl ? 'تفاعلية مع الماوس' : 'Mouse Interaction'}
                    </p>
                    <p className="text-xs text-brand-text-muted">
                      {isRtl ? 'جعل الفقاعات تتبع حركة الجهاز' : 'Make blobs react to cursor movement'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => updateFlubber({ interactive: !flubber.interactive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    flubber.interactive ? 'bg-brand-teal' : 'bg-brand-border'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      flubber.interactive ? (isRtl ? '-translate-x-6' : 'translate-x-6') : (isRtl ? '-translate-x-1' : 'translate-x-1')
                    }`}
                  />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
