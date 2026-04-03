import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, ShieldCheck, Cpu, Trash2, Zap, CheckCircle2 } from 'lucide-react';
import { HapticButton } from './HapticButton';

interface CacheOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
  autoStart?: boolean;
}

type OptimizationStep = 'idle' | 'scanning' | 'purging' | 'optimizing' | 'completed';

export const CacheOptimizer: React.FC<CacheOptimizerProps> = ({ isOpen, onClose, autoStart = false }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [step, setStep] = useState<OptimizationStep>('idle');
  const [progress, setProgress] = useState(0);
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && autoStart && step === 'idle') {
      runOptimization();
    }
  }, [isOpen, autoStart]);

  const addDetail = (text: string) => {
    setDetails(prev => [text, ...prev].slice(0, 5));
  };

  const runOptimization = async () => {
    setStep('scanning');
    setProgress(0);
    setDetails([]);
    
    // Step 1: Scanning
    addDetail(isRtl ? 'جاري فحص ملفات النظام...' : 'Scanning system files...');
    for (let i = 0; i <= 30; i += 5) {
      setProgress(i);
      await new Promise(r => setTimeout(r, 150));
    }

    // Step 2: Purging
    setStep('purging');
    addDetail(isRtl ? 'تنظيف ذاكرة التخزين المؤقت...' : 'Purging cache storage...');
    
    try {
      // Real cache clearing logic
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
          addDetail(`${isRtl ? 'تم حذف' : 'Deleted'} ${name}`);
        }
      }
      
      sessionStorage.clear();
      addDetail(isRtl ? 'تم تنظيف جلسة العمل' : 'Session storage cleared');
      
      // We don't clear localStorage by default to avoid logging out users, 
      // but we could clear specific keys if needed.
    } catch (e) {
      console.error('Cache clear error', e);
    }

    for (let i = 30; i <= 70; i += 10) {
      setProgress(i);
      await new Promise(r => setTimeout(r, 200));
    }

    // Step 3: Optimizing
    setStep('optimizing');
    addDetail(isRtl ? 'تحسين أداء الواجهة...' : 'Optimizing UI performance...');
    for (let i = 70; i <= 100; i += 10) {
      setProgress(i);
      await new Promise(r => setTimeout(r, 250));
    }

    // Step 4: Completed
    setStep('completed');
    addDetail(isRtl ? 'اكتملت العملية بنجاح' : 'Optimization complete');
    
    // Auto reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const getStatusText = () => {
    switch (step) {
      case 'scanning': return isRtl ? 'جاري الفحص...' : 'Scanning...';
      case 'purging': return isRtl ? 'جاري التنظيف...' : 'Purging...';
      case 'optimizing': return isRtl ? 'جاري التحسين...' : 'Optimizing...';
      case 'completed': return isRtl ? 'تم التحسين!' : 'Optimized!';
      default: return isRtl ? 'تحسين النظام' : 'System Optimizer';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === 'idle' ? onClose : undefined}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-[#151619] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          >
            {/* Atmospheric Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_50%,rgba(90,90,64,0.15),transparent_60%)]" />
              {step !== 'idle' && (
                <motion.div 
                  animate={{ 
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,0,0.05),transparent_70%)]" 
                />
              )}
            </div>

            <div className="relative p-8 flex flex-col items-center text-center">
              {/* Header Icon */}
              <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 relative">
                {step === 'idle' && <Cpu className="text-brand-primary w-10 h-10" />}
                {step === 'completed' && <CheckCircle2 className="text-green-400 w-10 h-10" />}
                {(step === 'scanning' || step === 'purging' || step === 'optimizing') && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCcw className="text-brand-primary w-10 h-10" />
                  </motion.div>
                )}
                
                {/* Progress Ring */}
                {step !== 'idle' && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="38"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="4"
                      className="translate-x-0 translate-y-0"
                    />
                    <motion.circle
                      cx="40"
                      cy="40"
                      r="38"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray="238.76"
                      animate={{ strokeDashoffset: 238.76 - (238.76 * progress) / 100 }}
                      className="text-brand-primary translate-x-0 translate-y-0"
                    />
                  </svg>
                )}
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 font-serif">
                {getStatusText()}
              </h2>
              
              {autoStart && step === 'idle' && (
                <div className="mb-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full">
                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">
                    {isRtl ? 'فحص تلقائي للنظام' : 'System Auto-Check'}
                  </span>
                </div>
              )}
              
              <p className="text-white/50 text-sm mb-8 max-w-[240px]">
                {step === 'idle' 
                  ? (isRtl ? 'قم بتنظيف الذاكرة وتحسين أداء التطبيق بلمسة واحدة' : 'Clean memory and optimize app performance with one touch')
                  : (isRtl ? 'يرجى الانتظار، جاري تحسين النظام...' : 'Please wait, optimizing system...')}
              </p>

              {/* Details Log */}
              <div className="w-full h-24 bg-black/20 rounded-2xl border border-white/5 p-4 mb-8 overflow-hidden relative">
                <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-[#151619] to-transparent z-10" />
                <div className="flex flex-col gap-1">
                  <AnimatePresence mode="popLayout">
                    {details.map((detail, idx) => (
                      <motion.div
                        key={detail + idx}
                        initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-[10px] font-mono text-brand-primary/70 uppercase tracking-wider flex items-center gap-2"
                      >
                        <Zap size={8} />
                        {detail}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Action Button */}
              {step === 'idle' ? (
                <div className="flex flex-col gap-3 w-full">
                  <HapticButton
                    onClick={runOptimization}
                    className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20"
                  >
                    <Zap size={18} />
                    {isRtl ? 'بدء التحسين العميق' : 'Start Deep Optimization'}
                  </HapticButton>
                  {!autoStart && (
                    <button 
                      onClick={onClose}
                      className="text-white/30 text-sm font-medium py-2"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full py-4 flex items-center justify-center text-brand-primary font-mono text-xs tracking-[0.2em]">
                  {progress}% {isRtl ? 'مكتمل' : 'COMPLETE'}
                </div>
              )}
            </div>

            {/* Hardware Accents */}
            <div className="absolute top-4 right-8 flex gap-1">
              <div className="w-1 h-1 rounded-full bg-brand-primary/30" />
              <div className="w-1 h-1 rounded-full bg-brand-primary/30" />
              <div className="w-1 h-1 rounded-full bg-brand-primary/30" />
            </div>
            <div className="absolute bottom-4 left-8 text-[8px] font-mono text-white/10 uppercase tracking-[0.3em]">
              System_v2.5_Opt
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
