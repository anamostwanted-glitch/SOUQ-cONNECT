import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Combine, X, Check, AlertTriangle, Loader2, ArrowRight, Layers } from 'lucide-react';
import { Category } from '../../../core/types';

interface MergeSuggestion {
  sourceId: string;
  targetId: string;
  reasonAr: string;
  reasonEn: string;
}

interface MergeCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: MergeSuggestion[];
  categories: Category[];
  onConfirmMerge: (sourceId: string, targetId: string) => Promise<void>;
  isRtl: boolean;
}

export const MergeCategoryModal: React.FC<MergeCategoryModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  categories,
  onConfirmMerge,
  isRtl
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isMergingAll, setIsMergingAll] = useState(false);

  const getCategoryName = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return 'Unknown';
    return isRtl ? cat.nameAr : cat.nameEn;
  };

  const handleMerge = async (sourceId: string, targetId: string) => {
    setProcessingId(sourceId);
    try {
      await onConfirmMerge(sourceId, targetId);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMergeAll = async () => {
    setIsMergingAll(true);
    try {
      for (const suggestion of suggestions) {
        await onConfirmMerge(suggestion.sourceId, suggestion.targetId);
      }
    } finally {
      setIsMergingAll(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-text-main/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-brand-border flex items-center justify-between bg-brand-background/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
              <Combine size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-brand-text-main">
                {isRtl ? 'دمج الفئات الذكي' : 'Smart Category Merge'}
              </h3>
              <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest">
                {isRtl ? 'اقتراحات الذكاء الاصطناعي للدمج' : 'AI Merge Suggestions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-brand-background rounded-xl transition-colors text-brand-text-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4 items-start">
            <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={20} />
            <div className="text-xs text-amber-700 font-medium leading-relaxed">
              {isRtl 
                ? 'تحذير: سيؤدي دمج الفئات إلى حذف الفئة المصدر ونقل جميع الموردين والمستخدمين والطلبات المرتبطة بها إلى الفئة النهائية. هذا الإجراء لا يمكن التراجع عنه.'
                : 'Warning: Merging categories will delete the source category and move all associated suppliers, users, and requests to the target category. This action cannot be undone.'}
            </div>
          </div>

          {suggestions.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-brand-background rounded-full flex items-center justify-center mx-auto text-brand-text-muted/20">
                <Combine size={32} />
              </div>
              <p className="text-brand-text-muted font-bold">
                {isRtl ? 'لا توجد اقتراحات دمج حالياً' : 'No merge suggestions currently'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={`merge-suggest-${suggestion.sourceId}-${suggestion.targetId}-${index}`}
                  className="p-6 bg-brand-background rounded-3xl border border-brand-border hover:border-brand-primary/30 transition-all group"
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center">
                        <div className="px-3 py-1 bg-brand-error/10 text-brand-error rounded-lg text-[10px] font-black uppercase mb-1">
                          {isRtl ? 'المصدر' : 'Source'}
                        </div>
                        <div className="font-black text-brand-text-main text-sm">
                          {getCategoryName(suggestion.sourceId)}
                        </div>
                      </div>
                      
                      <div className="flex-1 h-px bg-brand-border relative">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-1 bg-brand-background border border-brand-border rounded-full">
                          <ArrowRight size={14} className={`text-brand-primary ${isRtl ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="px-3 py-1 bg-brand-success/10 text-brand-success rounded-lg text-[10px] font-black uppercase mb-1">
                          {isRtl ? 'الهدف' : 'Target'}
                        </div>
                        <div className="font-black text-brand-text-main text-sm">
                          {getCategoryName(suggestion.targetId)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-3">
                      <button
                        onClick={() => handleMerge(suggestion.sourceId, suggestion.targetId)}
                        disabled={processingId !== null || isMergingAll}
                        className="px-6 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary-hover transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/20"
                      >
                        {processingId === suggestion.sourceId ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        {isRtl ? 'تأكيد الدمج' : 'Confirm Merge'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-brand-border/50 text-[11px] text-brand-text-muted italic">
                    {isRtl ? suggestion.reasonAr : suggestion.reasonEn}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 bg-brand-background/30 border-t border-brand-border flex justify-between items-center">
          {suggestions.length > 1 ? (
            <button
              onClick={handleMergeAll}
              disabled={isMergingAll || processingId !== null}
              className="px-6 py-3 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary-hover transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/20 disabled:opacity-50"
            >
              {isMergingAll ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
              {isRtl ? 'دمج الكل' : 'Merge All'}
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-8 py-3 bg-brand-surface text-brand-text-muted rounded-2xl font-black text-xs uppercase tracking-widest border border-brand-border hover:text-brand-text-main transition-all"
          >
            {isRtl ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
