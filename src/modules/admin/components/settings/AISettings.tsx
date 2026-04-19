import React from 'react';
import { SiteSettings } from '../../../../core/types';
import { Bot, Sparkles, Zap, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface AISettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const AISettings: React.FC<AISettingsProps> = ({ settings, setSettings, isRtl }) => {
  const toggleAI = (enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      smartAssistantEnabled: enabled
    }));
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-brand-surface rounded-2xl border border-brand-border">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-text-main">
              {isRtl ? 'المساعد الذكي (Gemini AI)' : 'Smart Assistant (Gemini AI)'}
            </h3>
            <p className="text-sm text-brand-text-muted">
              {isRtl 
                ? 'التحكم في ميزات الذكاء الاصطناعي عبر المنصة' 
                : 'Control AI features across the platform'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-brand-bg rounded-xl border border-brand-border">
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-brand-primary" />
              <div>
                <p className="font-bold text-brand-text-main">
                  {isRtl ? 'تفعيل المساعد الذكي' : 'Enable Smart Assistant'}
                </p>
                <p className="text-xs text-brand-text-muted">
                  {isRtl 
                    ? 'عند الإيقاف، سيتم تعطيل جميع ميزات الذكاء الاصطناعي (الدردشة، تحليل الصور، التنبؤ)' 
                    : 'When disabled, all AI features (chat, image analysis, prediction) will be turned off'}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleAI(!settings.smartAssistantEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.smartAssistantEnabled ? 'bg-brand-primary' : 'bg-brand-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.smartAssistantEnabled ? (isRtl ? '-translate-x-6' : 'translate-x-6') : (isRtl ? '-translate-x-1' : 'translate-x-1')
                }`}
              />
            </button>
          </div>

          {!settings.smartAssistantEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3"
            >
              <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-amber-600 font-medium leading-relaxed">
                {isRtl 
                  ? 'تنبيه: إيقاف المساعد الذكي سيؤثر على تجربة المستخدم في البحث البصري وتصنيف المنتجات الآلي وتحسين المحتوى.'
                  : 'Warning: Disabling the Smart Assistant will affect the user experience in visual search, automated product categorization, and content optimization.'}
              </p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/50">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-brand-primary" />
                <p className="text-sm font-bold text-brand-text-main">
                  {isRtl ? 'تحليل النبض' : 'Pulse Analysis'}
                </p>
              </div>
              <p className="text-xs text-brand-text-muted">
                {isRtl 
                  ? 'رؤى فورية لاتجاهات السوق' 
                  : 'Real-time insights for market trends'}
              </p>
            </div>
            
            <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/50">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={16} className="text-brand-primary" />
                <p className="text-sm font-bold text-brand-text-main">
                  {isRtl ? 'الدردشة الذكية' : 'Smart Chat'}
                </p>
              </div>
              <p className="text-xs text-brand-text-muted">
                {isRtl 
                  ? 'مساعد المبيعات الآلي للتفاوض' 
                  : 'Automated sales assistant for negotiation'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
