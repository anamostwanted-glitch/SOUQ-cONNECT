import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Mic, 
  Image as ImageIcon, 
  MapPin, 
  X, 
  Loader2, 
  Camera, 
  Send,
  Zap,
  ChevronRight,
  BrainCircuit
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  analyzeNeuralPulseImage, 
  processNeuralPulseVoice, 
  generateNeuralPulseGeoInsight,
  handleAiError
} from '../../../core/services/geminiService';
import { toast } from 'sonner';

interface NeuralPulseProps {
  onAction?: (type: string, data: any) => void;
  isMomentOfNeed?: boolean;
}

export const NeuralPulse: React.FC<NeuralPulseProps> = ({ onAction, isMomentOfNeed = false }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'idle' | 'voice' | 'vision' | 'geo'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [insight, setInsight] = useState<any>(null);
  
  // Draggable position state
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('neural_pulse_pos');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });

  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [lastGeoCall, setLastGeoCall] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Geo-Proximity Pulse
  useEffect(() => {
    if (isOpen && !location) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          // Only auto-trigger if we haven't called it recently (e.g., in the last 5 minutes)
          const now = Date.now();
          if (now - lastGeoCall > 5 * 60 * 1000) {
            handleGeoInsight(loc).catch(err => handleAiError(err, "Neural Pulse Geo auto-trigger"));
          }
        },
        (err) => console.warn('Location access denied', err)
      );
    }
  }, [isOpen]);

  const handleGeoInsight = async (loc: { lat: number, lng: number }) => {
    // Prevent multiple calls within a short period (1 minute cooldown)
    const now = Date.now();
    if (now - lastGeoCall < 60 * 1000 && insight?.type === 'geo') {
      return;
    }

    setLastGeoCall(now);
    setIsProcessing(true);
    setActiveMode('geo');

    // Mock interests for demo, in real app fetch from user history
    const interests = ['Industrial Machinery', 'Textiles', 'Electronics'];
    try {
      const result = await generateNeuralPulseGeoInsight(loc.lat, loc.lng, interests);
      if (result && result.hasInsight) {
        setInsight({ type: 'geo', ...result });
      } else {
        toast.info(isRtl ? 'لا توجد فرص قريبة حالياً' : 'No nearby opportunities found right now');
      }
    } catch (e: any) {
      handleAiError(e, 'Neural Pulse Geo insight');
      if (e.message?.includes('429') || e.message?.includes('quota')) {
        toast.error(isRtl ? 'تم تجاوز حد الاستخدام للذكاء الاصطناعي، يرجى المحاولة لاحقاً' : 'AI quota exceeded, please try again later');
      } else {
        toast.error(isRtl ? 'فشل الحصول على رؤى الموقع' : 'Failed to get location insights');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setActiveMode('vision');
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const result = await analyzeNeuralPulseImage(base64, file.type);
          setInsight({ type: 'vision', ...result });
        } catch (aiError: any) {
          handleAiError(aiError, "Neural Pulse Vision AI");
          if (aiError.message?.includes('429') || aiError.message?.includes('quota')) {
            toast.error(isRtl ? 'تم تجاوز حد الاستخدام للذكاء الاصطناعي' : 'AI quota exceeded');
          } else {
            toast.error(isRtl ? 'فشل تحليل الصورة بالذكاء الاصطناعي' : 'AI image analysis failed');
          }
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        toast.error(isRtl ? 'فشل قراءة الملف' : 'Failed to read file');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error(isRtl ? 'فشل تحميل الصورة' : 'Image upload failed');
      setIsProcessing(false);
    }
  };

  const startVoicePulse = () => {
    setActiveMode('voice');
    // In a real app, use MediaRecorder + Gemini for STT
    // For this demo, we simulate a transcript after a short delay
    setIsProcessing(true);
    setTimeout(async () => {
      try {
        const mockTranscript = isRtl 
          ? "أريد شراء 500 وحدة من كابلات النحاس عالية الجودة بميزانية 5000 دولار" 
          : "I want to buy 500 units of high quality copper cables with a budget of 5000 dollars";
        
        const result = await processNeuralPulseVoice(mockTranscript);
        setInsight({ type: 'voice', ...result, transcript: mockTranscript });
        setIsProcessing(false);
      } catch (error) {
        handleAiError(error, "Neural Pulse Voice processing");
        toast.error(isRtl ? 'فشل معالجة الصوت' : 'Voice processing failed');
        setIsProcessing(false);
      }
    }, 3000);
  };

  const resetPulse = () => {
    setInsight(null);
    setActiveMode('idle');
    setIsProcessing(false);
  };

  return (
    <>
      {/* Floating Trigger */}
      <motion.button
        drag
        dragMomentum={false}
        dragElastic={0.1}
        dragConstraints={{ 
          top: -window.innerHeight + 100, 
          left: -window.innerWidth + 100, 
          right: 0, 
          bottom: 0 
        }}
        onDragEnd={(_, info) => {
          const newPos = { x: position.x + info.offset.x, y: position.y + info.offset.y };
          setPosition(newPos);
          localStorage.setItem('neural_pulse_pos', JSON.stringify(newPos));
        }}
        initial={position}
        animate={position}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 z-50 w-16 h-16 bg-brand-primary rounded-full shadow-[0_0_30px_rgba(27,151,167,0.4)] flex items-center justify-center text-white overflow-hidden group cursor-grab active:cursor-grabbing"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary via-brand-teal to-brand-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-x" />
        <BrainCircuit className="relative z-10" size={28} />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-white/20 rounded-full"
        />
        {/* Pulse effect for moment of need */}
        {isMomentOfNeed && (
          <motion.div 
            animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
            className="absolute inset-0 border-2 border-white rounded-full pointer-events-none"
          />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-background/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-2xl overflow-hidden relative"
            >
              {/* Header */}
              <div className="p-6 border-b border-brand-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                    <Zap size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-text-main uppercase tracking-widest text-sm">
                      {isRtl ? 'النبض العصبي' : 'Neural Pulse'}
                    </h3>
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-tighter">
                      {isRtl ? 'ذكاء اصطناعي استباقي' : 'Proactive AI Intelligence'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => { setIsOpen(false); resetPulse(); }}
                  className="p-2 hover:bg-brand-background rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 min-h-[300px] flex flex-col items-center justify-center">
                {!insight && !isProcessing && (
                  <div className="grid grid-cols-3 gap-6 w-full">
                    <PulseAction 
                      icon={<Mic size={24} />}
                      label={isRtl ? 'صوت' : 'Voice'}
                      onClick={startVoicePulse}
                      color="bg-blue-500"
                    />
                    <PulseAction 
                      icon={<ImageIcon size={24} />}
                      label={isRtl ? 'رؤية' : 'Vision'}
                      onClick={() => fileInputRef.current?.click()}
                      color="bg-purple-500"
                    />
                    <PulseAction 
                      icon={<MapPin size={24} />}
                      label={isRtl ? 'موقع' : 'Geo'}
                      onClick={() => handleGeoInsight(location || { lat: 0, lng: 0 })}
                      color="bg-emerald-500"
                    />
                  </div>
                )}

                {isProcessing && (
                  <div className="text-center space-y-6">
                    <div className="relative">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-20 h-20 border-4 border-brand-primary/20 border-t-brand-primary rounded-full mx-auto"
                      />
                      <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-primary" size={32} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-bold text-brand-text-main animate-pulse">
                        {isRtl ? 'جاري المعالجة العصبية...' : 'Neural Processing...'}
                      </h4>
                      <p className="text-xs text-brand-text-muted">
                        {activeMode === 'voice' && (isRtl ? 'تحليل نبرة الصوت والاحتياج التجاري' : 'Analyzing voice tone and business intent')}
                        {activeMode === 'vision' && (isRtl ? 'فحص الصورة واستخراج المواصفات' : 'Scanning image and extracting specs')}
                        {activeMode === 'geo' && (isRtl ? 'ربط الموقع بفرص التوريد المتاحة' : 'Linking location with sourcing opportunities')}
                      </p>
                    </div>
                  </div>
                )}

                {insight && !isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full space-y-6"
                  >
                    {insight.type === 'vision' && (
                      <div className="bg-brand-background/50 p-6 rounded-3xl border border-brand-border relative overflow-hidden">
                        {insight.isCached && (
                          <div className="absolute top-0 right-0 px-3 py-1 bg-brand-primary/20 text-brand-primary text-[8px] font-black uppercase tracking-widest rounded-bl-xl border-l border-b border-brand-primary/30">
                            Neural Memory
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-4">
                          <ImageIcon className="text-purple-500" size={20} />
                          <h4 className="font-bold text-sm">{insight.productName}</h4>
                        </div>
                        <p className="text-xs text-brand-text-muted mb-4 leading-relaxed">{insight.specs}</p>
                        <div className="flex flex-wrap gap-2">
                          {insight.suggestedCategories.map((cat: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-brand-surface rounded-lg border border-brand-border text-[10px] font-bold text-brand-primary">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {insight.type === 'voice' && (
                      <div className="bg-brand-background/50 p-6 rounded-3xl border border-brand-border relative overflow-hidden">
                        {insight.isCached && (
                          <div className="absolute top-0 right-0 px-3 py-1 bg-brand-primary/20 text-brand-primary text-[8px] font-black uppercase tracking-widest rounded-bl-xl border-l border-b border-brand-primary/30">
                            Neural Memory
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-4">
                          <Mic className="text-blue-500" size={20} />
                          <h4 className="font-bold text-sm">{isRtl ? 'طلب ذكي' : 'Smart Request'}</h4>
                        </div>
                        <div className="space-y-3 mb-4">
                          <InsightRow label={isRtl ? 'المنتج' : 'Product'} value={insight.product} />
                          <InsightRow label={isRtl ? 'الكمية' : 'Qty'} value={insight.quantity} />
                          <InsightRow label={isRtl ? 'الميزانية' : 'Budget'} value={insight.budget} />
                        </div>
                        <p className="text-xs text-brand-text-muted italic border-l-2 border-brand-primary pl-3">
                          "{insight.professionalSummary}"
                        </p>
                      </div>
                    )}

                    {insight.type === 'geo' && (
                      <div className="bg-brand-background/50 p-6 rounded-3xl border border-brand-border relative overflow-hidden">
                        {insight.isCached && (
                          <div className="absolute top-0 right-0 px-3 py-1 bg-brand-primary/20 text-brand-primary text-[8px] font-black uppercase tracking-widest rounded-bl-xl border-l border-b border-brand-primary/30">
                            Neural Memory
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-4">
                          <MapPin className="text-emerald-500" size={20} />
                          <h4 className="font-bold text-sm">{insight.title}</h4>
                        </div>
                        <p className="text-xs text-brand-text-muted mb-6 leading-relaxed">{insight.message}</p>
                        <button className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                          {insight.actionLabel}
                          <ChevronRight size={14} className={isRtl ? 'rotate-180' : ''} />
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={resetPulse}
                      className="w-full py-3 text-brand-text-muted font-bold text-[10px] uppercase tracking-widest hover:text-brand-primary transition-colors"
                    >
                      {isRtl ? 'بدء فحص جديد' : 'Start New Scan'}
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Footer Decoration */}
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
      />
    </>
  );
};

const PulseAction: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, color: string }> = ({ icon, label, onClick, color }) => (
  <motion.button
    whileHover={{ y: -5 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="flex flex-col items-center gap-3"
  >
    <div className={`w-16 h-16 ${color} bg-opacity-10 rounded-2xl flex items-center justify-center text-white shadow-lg border border-white/10`}>
      <div className={`${color} p-3 rounded-xl shadow-inner`}>
        {icon}
      </div>
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest text-brand-text-muted">{label}</span>
  </motion.button>
);

const InsightRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-[10px]">
    <span className="font-bold text-brand-text-muted uppercase tracking-widest">{label}</span>
    <span className="font-black text-brand-text-main">{value}</span>
  </div>
);
