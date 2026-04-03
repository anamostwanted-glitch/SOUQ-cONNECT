import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, X, Check, Plus, Sparkles, Bot } from 'lucide-react';
import { Category } from '../../core/types';
import { db } from '../../core/firebase';
import { doc, updateDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { extractKeywordsFromRequests } from '../../core/services/geminiService';
import { HapticButton } from './HapticButton';

interface KeywordManagerModalProps {
  category: Category;
  onClose: () => void;
  onUpdate: (updatedCategory: Category) => void;
  t: any;
  i18n: any;
}

export const KeywordManagerModal: React.FC<KeywordManagerModalProps> = ({ category, onClose, onUpdate, t, i18n }) => {
  const [keywords, setKeywords] = useState<string[]>(category.keywords || []);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>(category.suggestedKeywords || []);
  const [autoKeywords, setAutoKeywords] = useState<string[]>(category.autoKeywords || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords(prev => [...prev, trimmed]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
    setAutoKeywords(autoKeywords.filter(k => k !== kw));
    setSuggestedKeywords(suggestedKeywords.filter(k => k !== kw));
  };

  const handleApproveAuto = (kw: string) => {
    setAutoKeywords(autoKeywords.filter(k => k !== kw));
    setSuggestedKeywords(suggestedKeywords.filter(k => k !== kw));
  };

  const handlePromoteSuggested = (kw: string) => {
    if (!keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
    setSuggestedKeywords(suggestedKeywords.filter(k => k !== kw));
    setAutoKeywords(autoKeywords.filter(k => k !== kw));
  };

  const handleRemoveSuggested = (kw: string) => {
    setSuggestedKeywords(suggestedKeywords.filter(k => k !== kw));
    setKeywords(keywords.filter(k => k !== kw));
    setAutoKeywords(autoKeywords.filter(k => k !== kw));
  };

  const handleExtractAI = async () => {
    setIsExtracting(true);
    try {
      const q = query(
        collection(db, 'requests'),
        where('categoryId', '==', category.id),
        limit(20)
      );
      const snap = await getDocs(q);
      const requests = snap.docs.map(d => ({
        productName: d.data().productName,
        description: d.data().description
      }));

      if (requests.length === 0) {
        alert(i18n.language === 'ar' ? 'لا توجد طلبات كافية في هذه الفئة لاستخراج الكلمات المفتاحية.' : 'Not enough requests in this category to extract keywords.');
        return;
      }

      const extracted = await extractKeywordsFromRequests(requests, i18n.language === 'ar' ? category.nameAr : category.nameEn, i18n.language);
      
      const newSuggested = [...new Set([...suggestedKeywords, ...extracted])].filter(kw => !keywords.includes(kw));
      setSuggestedKeywords(newSuggested);
    } catch (error) {
      console.error("Error extracting keywords:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const categoryRef = doc(db, 'categories', category.id);
      const updatedData = {
        keywords,
        suggestedKeywords,
        autoKeywords
      };
      await updateDoc(categoryRef, updatedData);
      onUpdate({ ...category, ...updatedData });
      onClose();
    } catch (error) {
      console.error("Error saving keywords:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 150) {
            onClose();
          }
        }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 100 }}
        className="bg-brand-surface w-full max-w-2xl rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-brand-border rounded-full md:hidden" />
        <div className="p-8 border-b border-brand-border flex items-center justify-between bg-brand-surface/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
              <Tag size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-brand-text-main">
                {i18n.language === 'ar' ? 'إدارة الكلمات المفتاحية' : 'Manage Keywords'}
              </h3>
              <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest mt-0.5">
                {i18n.language === 'ar' ? category.nameAr : category.nameEn}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-brand-text-muted hover:text-brand-text-main hover:bg-brand-surface-hover rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-brand-text-main flex items-center gap-2">
                <Check size={16} className="text-brand-success" />
                {i18n.language === 'ar' ? 'الكلمات المفتاحية النشطة' : 'Active Keywords'}
              </h4>
              <span className="text-[10px] font-bold text-brand-text-muted bg-brand-surface-hover px-2 py-1 rounded-lg uppercase">
                {keywords.length} {i18n.language === 'ar' ? 'كلمة' : 'Keywords'}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-brand-background rounded-2xl border border-brand-border border-dashed">
              {keywords.map(kw => {
                const isAuto = autoKeywords.includes(kw);
                return (
                  <span key={kw} className={`px-3 py-1.5 ${isAuto ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/20' : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'} text-xs font-bold rounded-xl border flex items-center gap-2 group relative`}>
                    {kw}
                    {isAuto && (
                      <span className="flex items-center gap-1 ml-1">
                        <span className="text-[8px] bg-brand-warning text-white px-1 rounded uppercase tracking-tighter">Auto</span>
                        <button 
                          onClick={() => handleApproveAuto(kw)}
                          className="hover:text-brand-success transition-colors"
                          title={i18n.language === 'ar' ? 'اعتماد' : 'Approve'}
                        >
                          <Check size={12} />
                        </button>
                      </span>
                    )}
                    <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-brand-error transition-colors">
                      <X size={14} />
                    </button>
                  </span>
                );
              })}
              {keywords.length === 0 && (
                <p className="text-xs text-brand-text-muted italic w-full text-center py-2">
                  {i18n.language === 'ar' ? 'لا توجد كلمات مفتاحية نشطة بعد.' : 'No active keywords yet.'}
                </p>
              )}
            </div>
            <p className="text-[10px] text-brand-text-muted italic leading-relaxed px-2">
              {i18n.language === 'ar' 
                ? '* الكلمات المميزة بـ "Auto" تمت إضافتها تلقائياً من طلبات العملاء. يمكنك اعتمادها لإزالة التمييز أو حذفها.' 
                : '* Keywords marked with "Auto" were added automatically from customer requests. You can approve them to remove the badge or delete them.'}
            </p>

            <div className="flex gap-2">
              <input 
                type="text"
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddKeyword(newKeyword)}
                placeholder={i18n.language === 'ar' ? 'أضف كلمة مفتاحية جديدة...' : 'Add new keyword...'}
                className="flex-1 px-4 py-3 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-text-main placeholder-brand-text-muted/50 transition-all"
              />
              <button 
                onClick={() => handleAddKeyword(newKeyword)}
                className="px-5 py-3 bg-brand-primary text-white rounded-2xl hover:bg-brand-primary-hover transition-all font-bold shadow-md shadow-brand-primary/20 flex items-center justify-center"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-brand-text-main flex items-center gap-2">
                <Sparkles size={16} className="text-brand-primary" />
                {i18n.language === 'ar' ? 'الكلمات المقترحة من الطلبات' : 'Suggested from Requests'}
              </h4>
              <button 
                onClick={handleExtractAI}
                disabled={isExtracting}
                className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:bg-brand-primary/10 transition-colors px-3 py-2 -mx-3 -my-2 rounded-lg disabled:opacity-50 flex items-center gap-1"
              >
                {isExtracting ? (
                  <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                ) : <Bot size={12} />}
                {i18n.language === 'ar' ? 'استخراج بالذكاء الاصطناعي' : 'AI Extract'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
              {suggestedKeywords.map(kw => (
                <div key={kw} className="flex items-center gap-1 bg-brand-surface border border-brand-border rounded-xl overflow-hidden shadow-sm">
                  <span className="px-3 py-1.5 text-xs font-bold text-brand-text-main border-r border-brand-border">
                    {kw}
                  </span>
                  <button 
                    onClick={() => handlePromoteSuggested(kw)}
                    className="p-2 text-brand-success hover:bg-brand-success/10 transition-colors"
                    title="Promote to Active"
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    onClick={() => handleRemoveSuggested(kw)}
                    className="p-2 text-brand-error hover:bg-brand-error/10 transition-colors"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {suggestedKeywords.length === 0 && (
                <p className="text-xs text-brand-text-muted italic w-full text-center py-2">
                  {i18n.language === 'ar' ? 'لا توجد اقتراحات حالياً. سيتم جمع الكلمات من طلبات المستخدمين.' : 'No suggestions currently. Words will be collected from user requests.'}
                </p>
              )}
            </div>
            <p className="text-[10px] text-brand-text-muted italic leading-relaxed">
              {i18n.language === 'ar' 
                ? '* يتم جمع هذه الكلمات تلقائياً من عناوين طلبات المستخدمين في هذه الفئة.' 
                : '* These words are automatically collected from user request titles in this category.'}
            </p>

            <div className="mt-4 pt-4 border-t border-brand-border">
              <div className="flex items-center justify-between bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10">
                <div className="flex-1">
                  <h4 className="text-[11px] font-black text-brand-primary uppercase tracking-wider mb-1">
                    {i18n.language === 'ar' ? 'تجربة النظام (محاكاة)' : 'System Test (Simulation)'}
                  </h4>
                  <p className="text-[10px] text-brand-text-muted leading-relaxed">
                    {i18n.language === 'ar' 
                      ? 'اضغط لرؤية كيف تضاف الكلمات تلقائياً عند طلب العملاء' 
                      : 'Click to see how keywords are added automatically when customers request'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const testKeywords = ['iPhone 15', 'Samsung S24', 'Gaming Laptop', '4K Monitor', 'Wireless Mouse', 'Mechanical Keyboard'];
                    const randomKw = testKeywords[Math.floor(Math.random() * testKeywords.length)];
                    if (!keywords.includes(randomKw)) {
                      setKeywords(prev => [...prev, randomKw]);
                      setAutoKeywords(prev => [...prev, randomKw]);
                      const categoryRef = doc(db, 'categories', category.id);
                      await updateDoc(categoryRef, {
                        keywords: [...keywords, randomKw],
                        autoKeywords: [...autoKeywords, randomKw]
                      });
                    }
                  }}
                  className="bg-brand-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary-hover transition-all shadow-md shadow-brand-primary/20 flex items-center gap-2"
                >
                  <Sparkles size={12} />
                  {i18n.language === 'ar' ? 'محاكاة طلب عميل' : 'Simulate Request'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-brand-border bg-brand-surface/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-brand-text-muted hover:text-brand-text-main hover:bg-brand-surface-hover rounded-2xl transition-all"
          >
            {t('cancel')}
          </button>
          <HapticButton
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-brand-primary text-white rounded-2xl hover:bg-brand-primary-hover transition-all font-bold text-sm shadow-lg shadow-brand-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : <Check size={20} />}
            {t('save')}
          </HapticButton>
        </div>
      </motion.div>
    </div>
  );
};
