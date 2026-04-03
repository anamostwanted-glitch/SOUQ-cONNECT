import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { MarketplaceItem, Category } from '../../../core/types';
import { translateText } from '../../../core/services/geminiService';
import { HapticButton } from '../../../shared/components/HapticButton';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { AINeuralCategorySelector } from '../../../shared/components/AINeuralCategorySelector';

interface EditProductModalProps {
  item: MarketplaceItem;
  onClose: () => void;
  onUpdate: () => void;
  categories: { id: string; nameEn: string; nameAr: string }[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ item, onClose, onUpdate, categories }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  // Form State
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [price, setPrice] = useState(item.price.toString());
  const [selectedCategories, setSelectedCategories] = useState<string[]>(item.categories || []);
  const [status, setStatus] = useState(item.status);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Automatic Translation
      let titleAr = '';
      let titleEn = '';
      let descriptionAr = '';
      let descriptionEn = '';

      if (i18n.language.startsWith('ar')) {
        titleAr = title;
        descriptionAr = description;
        [titleEn, descriptionEn] = await Promise.all([
          translateText(title, 'en'),
          translateText(description, 'en')
        ]);
      } else {
        titleEn = title;
        descriptionEn = description;
        [titleAr, descriptionAr] = await Promise.all([
          translateText(title, 'ar'),
          translateText(description, 'ar')
        ]);
      }

      const docRef = doc(db, 'marketplace', item.id);
      await updateDoc(docRef, {
        title,
        titleAr,
        titleEn,
        description,
        descriptionAr,
        descriptionEn,
        price: Number(price),
        categories: selectedCategories,
        status,
        updatedAt: new Date().toISOString(),
      });

      onUpdate();
    } catch (error) {
      setErrorMessage(isRtl ? 'حدث خطأ أثناء التحديث' : 'Error updating product');
      setIsSubmitting(false);
      handleFirestoreError(error, OperationType.UPDATE, `marketplace/${item.id}`);
    }
  };

  const glassClass = "bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 shadow-2xl";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col ${glassClass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {isRtl ? 'تعديل المنتج' : 'Edit Product'}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <AnimatePresence>
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 bg-red-500/10 text-red-500 p-4 rounded-xl flex items-center gap-3"
              >
                <AlertCircle size={20} />
                <span className="font-bold text-sm">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRtl ? 'اسم المنتج' : 'Product Title'}
              </label>
              <input 
                required
                type="text" 
                value={title || ''}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary/50 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isRtl ? 'السعر' : 'Price'}
                </label>
                <div className="relative">
                  <input 
                    required
                    type="number" 
                    value={price || ''}
                    onChange={(e) => setPrice(e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 ${isRtl ? 'pl-4 pr-10' : 'pr-4 pl-10'} focus:ring-2 focus:ring-brand-primary/50 outline-none`}
                  />
                  <span className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-4' : 'left-4'} text-slate-400 font-bold`}>
                    {item.currency || t('currency')}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isRtl ? 'الفئة' : 'Category'}
                </label>
                <AINeuralCategorySelector 
                  categories={categories as any}
                  selectedCategoryIds={selectedCategories}
                  onSelect={setSelectedCategories}
                  productInfo={{
                    title,
                    description,
                    imageUrl: item.images[0]
                  }}
                  isRtl={isRtl}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRtl ? 'الحالة' : 'Status'}
              </label>
              <select 
                required
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'sold' | 'hidden')}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary/50 outline-none appearance-none"
              >
                <option value="active">{isRtl ? 'نشط' : 'Active'}</option>
                <option value="sold">{isRtl ? 'مباع' : 'Sold'}</option>
                <option value="hidden">{isRtl ? 'مخفي' : 'Hidden'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isRtl ? 'الوصف' : 'Description'}
              </label>
              <textarea 
                required
                rows={4}
                value={description || ''}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary/50 outline-none resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <HapticButton 
            form="edit-product-form"
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {isRtl ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                {isRtl ? 'حفظ التغييرات' : 'Save Changes'}
              </>
            )}
          </HapticButton>
        </div>
      </motion.div>
    </div>
  );
};
