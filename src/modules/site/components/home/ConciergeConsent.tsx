import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';

interface ConciergeConsentProps {
  show: boolean;
  onClose: () => void;
  onAccept: () => void;
  isRtl: boolean;
  reason?: string;
}

export const ConciergeConsent: React.FC<ConciergeConsentProps> = ({
  show,
  onClose,
  onAccept,
  isRtl,
  reason
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-50"
        >
          <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors z-20"
            >
              <X size={18} />
            </button>

            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-brand-teal" />
              </div>
              
              <h3 className="text-xl font-black mb-2">
                {isRtl ? 'هل تحتاج لمساعدة في البحث؟' : 'Need help searching?'}
              </h3>
              <p className="text-white/70 text-sm mb-6 leading-relaxed">
                {reason || (isRtl 
                  ? 'يمكن لمساعدنا الذكي (الكونسيرج) تولي المهمة عنك. سيبحث عن أفضل الموردين ويقوم بالتفاوض نيابة عنك.' 
                  : 'Our smart Concierge can take over for you. It will find the best suppliers and negotiate on your behalf.')}
              </p>

              <HapticButton
                onClick={onAccept}
                className="w-full py-4 bg-brand-teal text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-brand-teal/90 transition-all group/btn"
              >
                {isRtl ? 'تفعيل المساعد الذكي' : 'Activate Smart Concierge'}
                <ChevronRight size={18} className={`group-hover/btn:translate-x-1 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
              </HapticButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
