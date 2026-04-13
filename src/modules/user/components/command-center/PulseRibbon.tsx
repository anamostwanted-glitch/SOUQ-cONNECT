import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';

interface PulseRibbonProps {
  insights: { ar: string; en: string }[];
  currentIndex: number;
}

export const PulseRibbon: React.FC<PulseRibbonProps> = ({ insights, currentIndex }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  return (
    <div className="mb-12 overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 bg-brand-primary/5 backdrop-blur-xl rounded-[2rem] border border-brand-primary/10">
        <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-primary/20">
          <Bot size={20} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentIndex}
              initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
              className="text-sm md:text-base font-bold text-brand-text-main truncate"
            >
              {isRtl ? insights[currentIndex]?.ar : insights[currentIndex]?.en}
            </motion.p>
          </AnimatePresence>
        </div>
        <HapticButton className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary/20 transition-all">
          {isRtl ? 'تفاصيل' : 'Details'}
        </HapticButton>
      </div>
    </div>
  );
};
