import React, { useState } from 'react';
import { X, Sparkles, Plus } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { translateText } from '../../core/services/geminiService';
import { useTranslation } from 'react-i18next';
import { handleFirestoreError, OperationType, handleAiError } from '../../core/utils/errorHandling';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategoryTab: 'product' | 'service';
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, activeCategoryTab }) => {
  const { t, i18n } = useTranslation();
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isRtl = i18n.language === 'ar';

  const handleTranslate = async () => {
    if (!nameAr) return;
    setIsTranslating(true);
    try {
      const translation = await translateText(nameAr, 'English');
      setNameEn(translation);
    } catch (error) {
      handleAiError(error, 'AddCategoryModal:handleTranslate', false);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async () => {
    if (!nameAr || !nameEn) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'categories'), {
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        parentId: null,
        order: 0,
        categoryType: activeCategoryTab,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      onClose();
      setNameAr('');
      setNameEn('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'categories', false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-brand-surface rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-brand-border max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-brand-primary/20 scrollbar-track-brand-surface ${isRtl ? 'font-arabic' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
              <Plus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-text-main">
                {isRtl ? 'إضافة فئة جديدة' : 'Add New Category'}
              </h2>
              <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest mt-0.5">
                {isRtl ? 'إنشاء فئة رئيسية' : 'Create a main category'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-brand-text-muted hover:text-brand-text-main hover:bg-brand-surface-hover rounded-xl transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">
              {isRtl ? 'الاسم بالعربية' : 'Arabic Name'}
            </label>
            <input 
              type="text"
              placeholder={isRtl ? 'مثال: إلكترونيات' : 'e.g. إلكترونيات'}
              value={nameAr}
              onChange={e => setNameAr(e.target.value)}
              className="w-full p-4 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-text-main placeholder-brand-text-muted/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">
              {isRtl ? 'الاسم بالإنجليزية' : 'English Name'}
            </label>
            <div className="relative">
              <input 
                type="text"
                placeholder={isRtl ? 'مثال: Electronics' : 'e.g. Electronics'}
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                className={`w-full p-4 ${isRtl ? 'pl-12' : 'pr-12'} bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 text-brand-text-main placeholder-brand-text-muted/50 transition-all`}
              />
              <button 
                onClick={handleTranslate}
                disabled={isTranslating || !nameAr}
                className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 p-2.5 text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isRtl ? 'ترجمة من العربية' : 'Translate from Arabic'}
              >
                {isTranslating ? <div className="w-5 h-5 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" /> : <Sparkles size={20} />}
              </button>
            </div>
          </div>
          <div className="pt-4">
            <button 
              onClick={handleSubmit}
              disabled={loading || !nameAr || !nameEn}
              className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>{isRtl ? 'جاري الإضافة...' : 'Adding...'}</span>
                </>
              ) : (
                <>
                  <Plus size={20} />
                  <span>{isRtl ? 'إضافة الفئة' : 'Add Category'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
