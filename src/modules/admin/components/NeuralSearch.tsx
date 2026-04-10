import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Command, Sparkles, X, BrainCircuit, Loader2, ArrowRight, Navigation, Filter, Zap } from 'lucide-react';
import { analyzeAdminSearch, handleAiError } from '../../../core/services/geminiService';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface NeuralSearchProps {
  onNavigate: (tab: string) => void;
  onFilter: (target: string, filters: any) => void;
  availableTabs: string[];
}

export const NeuralSearch: React.FC<NeuralSearchProps> = ({ onNavigate, onFilter, availableTabs }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeAdminSearch(query, { tabs: availableTabs }, i18n.language);
      
      if (result.intent === 'navigate') {
        onNavigate(result.target);
        toast.success(result.message || (isRtl ? `تم الانتقال إلى ${result.target}` : `Navigated to ${result.target}`));
        setIsOpen(false);
      } else if (result.intent === 'filter') {
        onFilter(result.target, result.filters);
        toast.success(result.message || (isRtl ? 'تم تطبيق الفلترة الذكية' : 'Smart filters applied'));
        setIsOpen(false);
      } else {
        toast.info(result.message || (isRtl ? 'لم أفهم طلبك تماماً' : "I didn't quite catch that"));
      }
    } catch (error) {
      handleAiError(error, 'Neural search');
      toast.error(isRtl ? 'فشل البحث العصبي' : 'Neural search failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-brand-text-muted hover:border-brand-primary transition-all group"
      >
        <Search size={18} className="group-hover:text-brand-primary transition-colors" />
        <span className="text-xs font-bold hidden md:inline">
          {isRtl ? 'البحث العصبي...' : 'Neural Search...'}
        </span>
        <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 bg-brand-background border border-brand-border rounded text-[10px] font-black">
          <Command size={10} /> K
        </div>
      </button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 md:pt-24">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-brand-background/80 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="relative w-full max-w-2xl bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSearch} className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                    {isAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <BrainCircuit size={24} />}
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isRtl ? 'أخبرني ماذا تريد أن تجد أو تفعل...' : 'Tell me what you want to find or do...'}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-black text-brand-text-main placeholder:text-brand-text-muted/30"
                  />
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-brand-background rounded-xl transition-colors text-brand-text-muted"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mr-2 py-1">
                    {isRtl ? 'اقتراحات:' : 'Suggestions:'}
                  </span>
                  {[
                    isRtl ? 'عرض الموردين النشطين' : 'Show active suppliers',
                    isRtl ? 'طلبات السحب المعلقة' : 'Pending withdrawals',
                    isRtl ? 'الذهاب إلى الإحصائيات' : 'Go to statistics',
                    isRtl ? 'المستخدمين الجدد اليوم' : 'New users today'
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuery(suggestion)}
                      className="px-3 py-1 bg-brand-background border border-brand-border rounded-lg text-[10px] font-bold text-brand-text-muted hover:border-brand-primary hover:text-brand-primary transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </form>

              {/* Action Bar */}
              <div className="px-6 py-4 bg-brand-background/50 border-t border-brand-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-text-muted">
                    <Navigation size={12} /> {isRtl ? 'تنقل' : 'Navigate'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-text-muted">
                    <Filter size={12} /> {isRtl ? 'فلترة' : 'Filter'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-text-muted">
                    <Zap size={12} /> {isRtl ? 'إجراء' : 'Action'}
                  </div>
                </div>
                
                <button
                  onClick={handleSearch}
                  disabled={!query.trim() || isAnalyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50"
                >
                  {isAnalyzing ? (isRtl ? 'جاري التحليل...' : 'Analyzing...') : (isRtl ? 'تنفيذ' : 'Execute')}
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
