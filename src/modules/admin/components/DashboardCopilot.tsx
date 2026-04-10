import React, { useState, useEffect } from 'react';
import { Sparkles, Search, X, Loader2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { askGemini, handleAiError } from '../../../core/services/geminiService';

export const DashboardCopilot: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const answer = await askGemini(query);
      setResponse(answer);
    } catch (error) {
      handleAiError(error, 'Dashboard Copilot');
      setResponse(isRtl ? 'حدث خطأ أثناء المعالجة' : 'An error occurred while processing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <HapticButton
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-brand-primary text-white rounded-full shadow-2xl hover:scale-110 transition-all z-50"
      >
        <Sparkles size={24} />
      </HapticButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-surface w-full max-w-lg rounded-3xl border border-brand-border p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-brand-text-main flex items-center gap-2">
                  <Sparkles className="text-brand-primary" />
                  {isRtl ? 'مساعد القيادة الذكي' : 'Dashboard Copilot'}
                </h2>
                <HapticButton onClick={() => setIsOpen(false)} className="text-brand-text-muted hover:text-brand-text-main">
                  <X size={20} />
                </HapticButton>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isRtl ? 'اسأل عن بياناتك...' : 'Ask about your data...'}
                  className="w-full pl-12 pr-4 py-3 bg-brand-background border border-brand-border rounded-2xl text-sm font-bold focus:outline-none focus:border-brand-primary"
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                />
              </div>

              <div className="min-h-[100px] p-4 bg-brand-background rounded-2xl border border-brand-border text-sm text-brand-text-main">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin text-brand-primary" />
                  </div>
                ) : response || (isRtl ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I help you today?')}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
