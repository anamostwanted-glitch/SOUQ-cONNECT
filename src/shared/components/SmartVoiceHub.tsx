import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Mic, MicOff, X, Zap, Loader2, Sparkles, 
  MessageSquare, ShoppingBag, Search, Check,
  AlertCircle, Volume2, Building2
} from 'lucide-react';
import { HapticButton } from './HapticButton';
import { soundService, SoundType } from '../../core/utils/soundService';
import { processSmartVoice, recognizeNavigationIntent } from '../../core/services/geminiService';
import { toast } from 'sonner';

interface SmartVoiceHubProps {
  onProcessed?: (data: any) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const SmartVoiceHub: React.FC<SmartVoiceHubProps> = ({ 
  onProcessed, 
  isOpen: initialIsOpen = false,
  onClose: initialOnClose
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<any>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [shouldCancel, setShouldCancel] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startXRef = useRef<number | null>(null);

  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  const toggleHub = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (!nextState) {
      stopRecording();
      if (initialOnClose) initialOnClose();
    } else {
      soundService.play(SoundType.AI_PULSE);
    }
  };

  const startRecording = () => {
    if (typeof window === 'undefined' || isProcessing) return;
    
    // Check for Speech Recognition API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error(isRtl ? 'متصفحك لا يدعم التعرف على الصوت' : 'Your browser does not support speech recognition');
      return;
    }

    setShouldCancel(false);
    setDragOffset(0);

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = isRtl ? 'ar-JO' : 'en-US';

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setTranscript('');
        soundService.play(SoundType.SUCCESS);
        if (navigator.vibrate) navigator.vibrate(40);
      };

      recognitionRef.current.onresult = (event: any) => {
        const currentTranscript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error !== 'aborted') {
          setIsRecording(false);
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.start();
    } catch (err) {
      console.error('Failed to start speech recognition', err);
      setIsRecording(false);
    }
  };

  const stopRecording = (cancel = false) => {
    if (!isRecording) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsRecording(false);
    
    if (cancel) {
      setTranscript('');
      soundService.play(SoundType.GHOST_PULSE); // Use a distinct sound for cancel
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    } else if (transcript) {
      handleProcessVoice(transcript);
    }
    
    setDragOffset(0);
    setShouldCancel(false);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isProcessing) return;
    startXRef.current = e.clientX;
    startRecording();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isRecording || startXRef.current === null) return;
    
    const diff = e.clientX - startXRef.current;
    // Swipe left to cancel in LTR, swipe right to cancel in RTL
    const slide = isRtl ? Math.max(0, diff) : Math.min(0, diff);
    setDragOffset(slide);
    
    if (Math.abs(slide) > 120) {
      setShouldCancel(true);
    } else {
      setShouldCancel(false);
    }
  };

  const handlePointerUp = () => {
    if (!isRecording) return;
    stopRecording(shouldCancel);
    startXRef.current = null;
  };

  const handleProcessVoice = async (text: string) => {
    setIsProcessing(true);
    setResult(null);
    try {
      // 1. Check for Navigation Intent First (Teleportation)
      const navIntent = await recognizeNavigationIntent(text, i18n.language);
      if (navIntent && navIntent.view !== 'none' && navIntent.confidence > 0.7) {
        window.dispatchEvent(new CustomEvent('voice-navigation', { detail: navIntent }));
        toast.success(isRtl ? `جاري الانتقال: ${navIntent.view}` : `Navigating to ${navIntent.view}`, {
          icon: <Zap className="text-brand-amber animate-pulse" size={16} />
        });
        soundService.play(SoundType.SUCCESS);
        if (navigator.vibrate) navigator.vibrate([20, 50]);
        setIsOpen(false);
        return;
      }

      // 2. Fallback to Standard Commerce Processing
      const data = await processSmartVoice(text);
      setResult(data);
      soundService.play(SoundType.AI_PULSE);
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
      
      if (onProcessed) {
        onProcessed(data);
      }
    } catch (err) {
      console.error('Voice processing failed', err);
      toast.error(isRtl ? 'فشل تحليل طلبك، يرجى المحاولة مرة أخرى' : 'Failed to analyze your request, please try again');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Activator - Designed for Simple Users in Jordan */}
      <motion.div 
        className="fixed bottom-24 right-6 z-50 md:bottom-32 md:right-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <HapticButton
          onPointerDown={() => {
            if (!isOpen) {
              setIsOpen(true);
              setTimeout(startRecording, 300);
            }
          }}
          onPointerUp={() => {
            if (isRecording) stopRecording();
          }}
          onPointerLeave={() => {
            if (isRecording) stopRecording();
          }}
          onClick={() => !isRecording && toggleHub()}
          className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${
            isOpen ? 'bg-brand-secondary rotate-90' : 'bg-brand-primary'
          } border-4 border-white dark:border-slate-800`}
        >
          {isOpen ? (
            <X size={28} className="text-white" />
          ) : (
            <div className="relative">
               <Mic size={32} className="text-white" />
               <motion.div 
                 animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="absolute inset-0 bg-white rounded-full -z-10"
               />
            </div>
          )}
        </HapticButton>
        <div className="absolute -top-1 -right-1 bg-brand-warning text-black text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm uppercase tracking-tighter">
          {isRtl ? 'ذكي' : 'AI'}
        </div>
      </motion.div>

      {/* Main Hub Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4 md:p-10"
            onClick={toggleHub}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              className="w-full max-w-xl bg-brand-surface rounded-[2.5rem] md:rounded-[4rem] border-2 border-brand-border shadow-2xl overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 md:p-12 space-y-8 text-center">
                {/* Header */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-primary/10 text-brand-primary rounded-full">
                    <Sparkles size={16} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                      {isRtl ? 'المساعد الذكي الفوري' : 'Neural Voice Assistant'}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black text-brand-text-main tracking-tight">
                    {isRtl ? 'كيف أقدر أساعدك اليوم؟' : 'How can I help you today?'}
                  </h2>
                  <p className="text-brand-text-muted text-sm md:text-base font-medium">
                    {isRtl 
                      ? 'احكيلي شو بدك (بدك تبيع، تشتري، أو تبحث) وأنا رح أهتم بكل شيء.'
                      : 'Just speak naturally (to sell, buy, or search) and I will handle the rest.'
                    }
                  </p>
                </div>

                {/* Main Action Hub */}
                <div className="relative py-10 md:py-16">
                  {/* Waveform Visualization (Simulated for Simple Users) */}
                  <AnimatePresence>
                    {isRecording && (
                      <div className="flex items-center justify-center gap-1 h-12 mb-8">
                        {[...Array(8)].map((_, i) => (
                          <motion.div
                            key={`wave-${i}`}
                            animate={{ height: [10, 40, 10] }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                            className="w-1.5 bg-brand-primary rounded-full"
                          />
                        ))}
                      </div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <HapticButton
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        disabled={isProcessing}
                        className={`w-28 h-28 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all relative z-10 touch-none select-none ${
                          isRecording 
                            ? 'bg-red-500 scale-110 shadow-[0_0_50px_rgba(239,68,68,0.5)]' 
                            : 'bg-brand-primary shadow-xl hover:scale-105'
                        } ${isProcessing ? 'opacity-50 grayscale' : ''} ${shouldCancel ? 'opacity-30 scale-90 grayscale' : ''}`}
                        style={{ transform: `translateX(${dragOffset}px)` }}
                      >
                        {isProcessing ? (
                          <Loader2 size={48} className="text-white animate-spin" />
                        ) : isRecording ? (
                          <MicOff size={48} className="text-white" />
                        ) : (
                          <Mic size={48} className="text-white" />
                        )}

                        {/* Ripple Effect when Silent */}
                        {!isRecording && !isProcessing && (
                          <motion.div 
                            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 bg-brand-primary rounded-full -z-10"
                          />
                        )}
                        
                        {/* Direction Arrow during hold */}
                        {isRecording && !shouldCancel && (
                           <motion.div 
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1, x: isRtl ? [40, 60, 40] : [-40, -60, -40] }}
                             transition={{ repeat: Infinity, duration: 1.5 }}
                             className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 text-white/50"
                             style={{ [isRtl ? 'right' : 'left']: '-80px' }}
                           >
                              {isRtl ? <Check size={16} className="rotate-180" /> : <Check size={16} className="-rotate-180" />}
                           </motion.div>
                        )}
                      </HapticButton>
                    </div>

                    <div className="text-sm font-black text-brand-text-main uppercase tracking-widest mt-4">
                      {isProcessing 
                        ? (isRtl ? 'جاري التحليل...' : 'Analyzing...') 
                        : isRecording 
                          ? (shouldCancel 
                              ? (isRtl ? 'اترك للإلغاء' : 'Release to Cancel') 
                              : (isRtl ? 'اسحب لليسار للإلغاء' : 'Slide left to cancel')) 
                          : (isRtl ? 'اضغط باستمرار للتحدث' : 'Hold to Speak')}
                    </div>
                  </div>
                </div>

                {/* Live Transcript / Result Feedback */}
                <AnimatePresence mode="wait">
                  {transcript && !isProcessing && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-brand-border italic text-brand-text-main"
                    >
                      "{transcript}"
                    </motion.div>
                  )}

                  {result && (
                    <motion.div 
                      key="result-display"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 bg-brand-primary/5 rounded-[2rem] border-2 border-brand-primary/20 space-y-6 text-left rtl:text-right"
                    >
                       <div className="flex items-center gap-3 mb-4">
                         <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white">
                            <Check size={20} />
                         </div>
                         <div>
                            <div className="text-[10px] font-black uppercase text-brand-primary">{isRtl ? 'تم التحليل بنجاح' : 'Analysis Successful'}</div>
                            <div className="text-lg font-black text-brand-text-main">{result.product}</div>
                         </div>
                       </div>
                       
                       <p className="text-sm text-brand-text-muted font-bold leading-relaxed">
                         {result.professionalSummary}
                       </p>

                       <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-brand-border">
                            <div className="text-[9px] font-black text-brand-text-muted uppercase mb-1">{isRtl ? 'الكمية' : 'Quantity'}</div>
                            <div className="text-sm font-black text-brand-text-main">{result.quantity || '---'}</div>
                         </div>
                         <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-brand-border">
                            <div className="text-[9px] font-black text-brand-text-muted uppercase mb-1">{isRtl ? 'الميزانية' : 'Budget'}</div>
                            <div className="text-sm font-black text-brand-text-main">{result.budget || '---'}</div>
                         </div>
                       </div>

                       <HapticButton 
                         onClick={() => {
                           // If it's a buying/selling/discovery intent, navigate to Marketplace with search context
                           if (result.product) {
                              window.dispatchEvent(new CustomEvent('voice-navigation', { 
                                detail: { 
                                  view: 'marketplace', 
                                  tab: 'discover', 
                                  searchQuery: result.product 
                                } 
                              }));
                              toast.success(isRtl ? 'جاري البحث عن موردين بذكاء...' : 'Searching for suppliers intelligently...', {
                                icon: <Building2 className="text-brand-primary animate-pulse" size={16} />
                              });
                           }
                           toggleHub();
                         }}
                         className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg"
                       >
                         {isRtl ? 'أكد طلبي الآن المباشر' : 'Confirm My Direct Request'}
                       </HapticButton>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Example Hints for Simple Users */}
                {!isRecording && !isProcessing && !result && (
                  <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 text-[10px] font-bold text-brand-text-muted bg-slate-50 dark:bg-slate-900 rounded-xl border border-brand-border flex items-center gap-2">
                       <ShoppingBag size={12} className="text-brand-primary" />
                       {isRtl ? 'عندي ١٠ طن حديد للبيع' : 'I have 10 tons of steel for sale'}
                    </div>
                    <div className="p-3 text-[10px] font-bold text-brand-text-muted bg-slate-50 dark:bg-slate-900 rounded-xl border border-brand-border flex items-center gap-2">
                       <Search size={12} className="text-brand-teal" />
                       {isRtl ? 'بدي تانكي مي بالزرقاء' : 'Looking for water tank in Zarqa'}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer / Close */}
              <button 
                onClick={toggleHub}
                className="absolute top-6 right-6 p-2 text-brand-text-muted hover:text-brand-primary transition-colors"
              >
                <X size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
