import React from 'react';
import { SiteSettings } from '../../../../core/types';
import { Sparkles, Activity, Zap, Maximize2, Gauge } from 'lucide-react';
import { motion } from 'motion/react';

interface NeuralHaloSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const NeuralHaloSettings: React.FC<NeuralHaloSettingsProps> = ({ settings, setSettings, isRtl }) => {
  const halo = settings.haloSettings || {
    enabled: true,
    size: 1.0,
    speed: 1.0,
    sensitivity: 1.0,
    glowStrength: 0.5,
    particleCount: 50,
    particleSize: 2,
    pointGlow: 15
  };

  const updateHalo = (updates: Partial<typeof halo>) => {
    setSettings(prev => ({
      ...prev,
      haloSettings: { ...halo, ...updates }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-brand-surface rounded-2xl border border-brand-border">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-text-main">
              {isRtl ? 'الهالة العصبية (Neural Halo)' : 'Neural Halo Settings'}
            </h3>
            <p className="text-sm text-brand-text-muted">
              {isRtl 
                ? 'تأثير بصري مستقبلي يتفاعل مع الصوت حول الشعار الرئيسي' 
                : 'Futuristic visual effect that reacts to sound around the main logo'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-brand-background rounded-xl border border-brand-border">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-brand-primary" />
              <div>
                <p className="font-bold text-brand-text-main">
                  {isRtl ? 'تفعيل الهالة' : 'Enable Halo Effect'}
                </p>
                <p className="text-xs text-brand-text-muted">
                  {isRtl ? 'إظهار الهالة الديناميكية في الصفحة الرئيسية' : 'Show the dynamic halo on the home page'}
                </p>
              </div>
            </div>
            <button
              onClick={() => updateHalo({ enabled: !halo.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                halo.enabled ? 'bg-brand-primary' : 'bg-brand-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  halo.enabled ? (isRtl ? '-translate-x-6' : 'translate-x-6') : (isRtl ? '-translate-x-1' : 'translate-x-1')
                }`}
              />
            </button>
          </div>

          {halo.enabled && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Size Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Maximize2 size={14} /> {isRtl ? 'الحجم' : 'Size'}</span>
                  <span className="text-brand-primary">{halo.size.toFixed(1)}x</span>
                </label>
                <input 
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={halo.size}
                  onChange={(e) => updateHalo({ size: parseFloat(e.target.value) })}
                  className="w-full accent-brand-primary"
                />
              </div>

              {/* Speed Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Gauge size={14} /> {isRtl ? 'السرعة' : 'Speed'}</span>
                  <span className="text-brand-primary">{halo.speed.toFixed(1)}x</span>
                </label>
                <input 
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={halo.speed}
                  onChange={(e) => updateHalo({ speed: parseFloat(e.target.value) })}
                  className="w-full accent-brand-primary"
                />
              </div>

              {/* Sensitivity Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Activity size={14} /> {isRtl ? 'حساسية الصوت' : 'Audio Sensitivity'}</span>
                  <span className="text-brand-primary">{halo.sensitivity.toFixed(1)}x</span>
                </label>
                <input 
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={halo.sensitivity}
                  onChange={(e) => updateHalo({ sensitivity: parseFloat(e.target.value) })}
                  className="w-full accent-brand-primary"
                />
              </div>

              {/* Glow Strength Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Sparkles size={14} /> {isRtl ? 'قوة التوهج' : 'Glow Strength'}</span>
                  <span className="text-brand-primary">{(halo.glowStrength * 100).toFixed(0)}%</span>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={halo.glowStrength}
                  onChange={(e) => updateHalo({ glowStrength: parseFloat(e.target.value) })}
                  className="w-full accent-brand-primary"
                />
              </div>

              {/* Particle Size Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Maximize2 size={14} /> {isRtl ? 'حجم النقطة' : 'Point Size'}</span>
                  <span className="text-brand-primary">{halo.particleSize}px</span>
                </label>
                <input 
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={halo.particleSize}
                  onChange={(e) => updateHalo({ particleSize: parseInt(e.target.value) })}
                  className="w-full accent-brand-primary"
                />
              </div>

              {/* Point Glow/Gradient Slider */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-brand-text-muted flex items-center justify-between">
                  <span className="flex items-center gap-2"><Sparkles size={14} /> {isRtl ? 'توهج النقطة' : 'Point Glow'}</span>
                  <span className="text-brand-primary">{halo.pointGlow}px</span>
                </label>
                <input 
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={halo.pointGlow}
                  onChange={(e) => updateHalo({ pointGlow: parseInt(e.target.value) })}
                  className="w-full accent-brand-primary"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
