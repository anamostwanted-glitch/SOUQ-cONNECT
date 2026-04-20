import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Activity, ShieldAlert, TrendingUp, Sparkles, BrainCircuit, ChevronRight, AlertCircle } from 'lucide-react';
import { analyzeSystemPulse, handleAiError } from '../../../core/services/geminiService';
import { useTranslation } from 'react-i18next';

interface AIPredictivePulseProps {
  systemData: {
    userCount: number;
    requestCount: number;
    withdrawalCount: number;
    activeSuppliers: number;
  };
}

export const AIPredictivePulse: React.FC<AIPredictivePulseProps> = ({ systemData }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [pulse, setPulse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchPulse = async () => {
      setLoading(true);
      try {
        const result = await analyzeSystemPulse(systemData, i18n.language);
        setPulse(result);
      } catch (error: any) {
        handleAiError(error, 'System pulse analysis');
        // Set a default state if it fails (e.g. due to missing API key)
        setPulse({
          status: 'stable',
          headline: i18n.language === 'ar' ? 'النظام مستقر' : 'System Stable',
          insights: [],
          growthScore: 100,
          recommendations: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPulse();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPulse, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [systemData.userCount, systemData.requestCount, i18n.language]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'warning': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'active': return 'text-brand-primary bg-brand-primary/10 border-brand-primary/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const getPulseAnimation = (status: string) => {
    switch (status) {
      case 'critical': return 'animate-ping duration-700';
      case 'warning': return 'animate-pulse duration-1000';
      case 'active': return 'animate-pulse duration-2000';
      default: return 'animate-pulse duration-3000';
    }
  };

  if (loading && !pulse) {
    return (
      <div className="w-full bg-brand-surface border border-brand-border rounded-2xl p-4 flex items-center gap-4 animate-pulse">
        <div className="w-10 h-10 bg-brand-background rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-brand-background rounded w-1/3" />
          <div className="h-3 bg-brand-background rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-30">
      <motion.div 
        layout
        className={`w-full bg-brand-surface border border-brand-border rounded-[2rem] shadow-xl shadow-brand-primary/5 overflow-hidden transition-all duration-500 ${isExpanded ? 'p-6' : 'p-4'}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={`relative shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${getStatusColor(pulse?.status)}`}>
              <Activity size={24} className="relative z-10" />
              <div className={`absolute inset-0 rounded-2xl opacity-40 ${getStatusColor(pulse?.status)} ${getPulseAnimation(pulse?.status)}`} />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text-muted flex items-center gap-1">
                  <BrainCircuit size={12} />
                  {isRtl ? 'النبض العصبي للذكاء الاصطناعي' : 'AI Neural Pulse'}
                </span>
                {pulse?.status === 'critical' && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full animate-bounce">
                    CRITICAL
                  </span>
                )}
              </div>
              <h3 className="text-sm md:text-base font-black text-brand-text-main truncate">
                {pulse?.headline || (isRtl ? 'النظام مستقر' : 'System Stable')}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
                {isRtl ? 'مؤشر النمو' : 'Growth Score'}
              </span>
              <span className="text-lg font-black text-brand-primary">{pulse?.growthScore || 100}%</span>
            </div>
            
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-brand-background rounded-xl transition-colors text-brand-text-muted"
            >
              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                <ChevronRight size={20} />
              </motion.div>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 pt-6 border-t border-brand-border space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-text-muted flex items-center gap-2">
                    <Sparkles size={14} className="text-brand-primary" />
                    {isRtl ? 'رؤى الذكاء الاصطناعي' : 'AI Insights'}
                  </h4>
                  <div className="space-y-3">
                    {pulse?.insights?.map((insight: string, i: number) => (
                      <motion.div 
                        key={`ai-insight-${pulse?.status || 'pulse'}-${i}`}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-brand-background rounded-xl border border-brand-border/50"
                      >
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                        <p className="text-xs font-bold text-brand-text-main leading-relaxed">{insight}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-text-muted flex items-center gap-2">
                    <ShieldAlert size={14} className="text-amber-500" />
                    {isRtl ? 'توصيات استباقية' : 'Proactive Recommendations'}
                  </h4>
                  <div className="space-y-3">
                    {pulse?.recommendations?.map((rec: string, i: number) => (
                      <motion.div 
                        key={`ai-rec-${pulse?.status || 'pulse'}-${i}`}
                        initial={{ x: 10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10"
                      >
                        <Zap size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-brand-text-main leading-relaxed">{rec}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-brand-text-main">{isRtl ? 'تحسين الأداء التلقائي' : 'Auto Performance Optimization'}</div>
                    <div className="text-[10px] font-bold text-brand-text-muted uppercase">{isRtl ? 'الذكاء الاصطناعي يعمل في الخلفية' : 'AI working in background'}</div>
                  </div>
                </div>
                <button className="w-full md:w-auto px-6 py-2 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">
                  {isRtl ? 'عرض التقرير الكامل' : 'View Full Report'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Background Glow */}
      <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-1/2 h-20 blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000 ${
        pulse?.status === 'critical' ? 'bg-red-500' : 
        pulse?.status === 'warning' ? 'bg-amber-500' : 
        'bg-brand-primary'
      }`} />
    </div>
  );
};
