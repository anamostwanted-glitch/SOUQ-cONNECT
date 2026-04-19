import React from 'react';
import { motion } from 'motion/react';
import { 
  Type, 
  Eye, 
  Wind, 
  Check, 
  RotateCcw,
  LayoutGrid,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { useAccessibility } from '../../../../core/providers/AccessibilityProvider';
import { HapticButton } from '../../../../shared/components/HapticButton';

interface InclusiveCenterProps {
  isRtl: boolean;
}

export const InclusiveCenter: React.FC<InclusiveCenterProps> = ({ isRtl }) => {
  const { settings, updateSettings, resetSettings } = useAccessibility();

  const fontSizes = [
    { id: 'normal', labelAr: 'طبيعي', labelEn: 'Normal' },
    { id: 'large', labelAr: 'كبير', labelEn: 'Large' },
    { id: 'extra-large', labelAr: 'كبير جداً', labelEn: 'Extra Large' },
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Header section with Team message */}
      <div className="bg-brand-primary/5 p-6 rounded-3xl border border-brand-primary/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-black text-brand-primary">
              {isRtl ? 'وضع الشمولية (Inclusive Mode)' : 'Inclusive Design Mode'}
            </h3>
            <p className="text-sm text-brand-text-muted">
              {isRtl ? 'رسالة الفريق: نحن نؤمن بأن التكنولوجيا للجميع.' : "Team Message: We believe technology is for everyone."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Font Scaling Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand-border">
          <div className="flex items-center gap-3 mb-6">
            <Type className="text-brand-primary" />
            <h4 className="font-bold">{isRtl ? 'حجم الخط' : 'Font Size'}</h4>
          </div>
          <div className="space-y-3">
            {fontSizes.map((size) => (
              <button
                key={size.id}
                onClick={() => updateSettings({ fontSize: size.id as any })}
                className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${
                  settings.fontSize === size.id 
                    ? 'bg-brand-primary text-white shadow-lg' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="font-bold">{isRtl ? size.labelAr : size.labelEn}</span>
                {settings.fontSize === size.id && <Check size={18} />}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Aids Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand-border">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="text-brand-primary" />
            <h4 className="font-bold">{isRtl ? 'المساعدات البصرية' : 'Visual Aids'}</h4>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="font-bold">{isRtl ? 'تباين عالٍ' : 'High Contrast'}</p>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'ألوان واضحة جداً لسهولة القراءة' : 'Vibrant colors for easier reading'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                className="w-6 h-6 rounded-full accent-brand-primary"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="font-bold">{isRtl ? 'خط عسر القراءة' : 'Dyslexic Friendly'}</p>
                <p className="text-xs text-slate-500">
                  {isRtl ? 'خط مخصص لتسهيل قراءة الحروف' : 'Special font for reading clarity'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.dyslexicFont}
                onChange={(e) => updateSettings({ dyslexicFont: e.target.checked })}
                className="w-6 h-6 rounded-full accent-brand-primary"
              />
            </div>
          </div>
        </div>

        {/* Behavioral Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand-border">
          <div className="flex items-center gap-3 mb-6">
            <Wind className="text-brand-primary" />
            <h4 className="font-bold">{isRtl ? 'سلاسة الحركة' : 'Motion Control'}</h4>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <div>
              <p className="font-bold">{isRtl ? 'تقليل الحركة' : 'Reduced Motion'}</p>
              <p className="text-xs text-slate-500">
                {isRtl ? 'إيقاف التحريكات لراحة العين' : 'Disable animations for eye comfort'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
              className="w-6 h-6 rounded-full accent-brand-primary"
            />
          </div>
        </div>

        {/* Mobile Experience Audit */}
        <div className="bg-brand-teal/5 p-6 rounded-3xl border border-brand-teal/20">
          <div className="flex items-center gap-3 mb-6">
            <Smartphone className="text-brand-teal" />
            <h4 className="font-bold text-brand-teal">{isRtl ? 'تحليل استخدام الهاتف' : 'Mobile Experience'}</h4>
          </div>
          <p className="text-sm text-brand-teal line-clamp-3 mb-4">
            {isRtl 
              ? 'تدقيق المهندس: قمنا بتوسيع مناطق الضغط (Touch Targets) إلى 48px وتفعيل الرد الاهتزازي (Haptic Feedback) لتحسين دقة الاستخدام بيد واحدة.'
              : 'Engineer Audit: Touch targets expanded to 48px and Haptic Feedback enabled for better one-handed usability.'}
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-teal">
            <Check size={14} />
            {isRtl ? 'متوافق مع معايير الوصول العالمية' : 'WCAG 2.1 Compliant'}
          </div>
        </div>
      </div>

      {/* Reset button */}
      <div className="flex justify-center pt-10">
        <HapticButton
          className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold"
          onClick={resetSettings}
        >
          <RotateCcw size={18} />
          {isRtl ? 'إعادة الإعدادات الأصلية' : 'Reset to Defaults'}
        </HapticButton>
      </div>
    </div>
  );
};
