import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile, Category } from '../../../core/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Sparkles, 
  Target, 
  Package, 
  Tag, 
  Loader2,
  Send,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { HapticButton } from '../../../shared/components/HapticButton';
import { callAiJson, handleAiError } from '../../../core/services/geminiService';
import { Type } from '@google/genai';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface SmartRequestFormProps {
  profile: UserProfile;
  isRtl: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SmartRequestForm: React.FC<SmartRequestFormProps> = ({ 
  profile, 
  isRtl, 
  onClose, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    categoryId: '',
    categoryNameAr: '',
    categoryNameEn: '',
    budget: '',
    quantity: '1'
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(cats);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'categories', false);
      }
    };
    fetchCategories();
  }, []);

  const suggestCategory = async (productName: string) => {
    if (productName.length < 3 || categories.length === 0) return;
    
    setIsSuggesting(true);
    try {
      const categoryList = categories.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }));
      
      const prompt = `Based on the product name "${productName}", suggest the best category from this list:
      ${JSON.stringify(categoryList)}
      
      Return the ID of the best matching category. If no match, return null.
      Return JSON only: { "categoryId": "string" | null }`;

      const result = await callAiJson(prompt, {
        type: Type.OBJECT,
        properties: {
          categoryId: { type: Type.STRING, nullable: true }
        },
        required: ["categoryId"]
      });

      if (result.categoryId) {
        const matched = categories.find(c => c.id === result.categoryId);
        if (matched) {
          setFormData(prev => ({
            ...prev,
            categoryId: matched.id!,
            categoryNameAr: matched.nameAr,
            categoryNameEn: matched.nameEn
          }));
          toast.info(isRtl ? `تم اقتراح فئة: ${matched.nameAr}` : `Suggested category: ${matched.nameEn}`, {
            icon: <Sparkles className="text-brand-primary" size={16} />
          });
        }
      }
    } catch (error) {
      console.error("Category suggestion failed", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName || !formData.categoryId) {
      toast.error(isRtl ? 'يرجى إكمال البيانات الأساسية' : 'Please complete basic details');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'requests'), {
        customerId: profile.uid,
        customerName: profile.name,
        productName: formData.productName,
        description: formData.description,
        categoryId: formData.categoryId,
        categoryNameAr: formData.categoryNameAr,
        categoryNameEn: formData.categoryNameEn,
        budget: formData.budget ? Number(formData.budget) : null,
        quantity: Number(formData.quantity),
        status: 'open',
        createdAt: new Date().toISOString(),
        offerCount: 0
      });

      toast.success(isRtl ? 'تم نشر طلبك بنجاح! سيصلك عروض قريباً.' : 'Request posted! You will receive offers soon.');
      onSuccess();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'requests', false);
      toast.error(isRtl ? 'فشل نشر الطلب' : 'Failed to post request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-brand-surface w-full max-w-xl rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden"
      >
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Plus size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-brand-text-main">
                  {isRtl ? 'طلب منتج ذكي' : 'Smart Product Request'}
                </h2>
                <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest mt-1">
                  {isRtl ? 'بث طلبك للموردين الموثوقين' : 'Broadcast your need to verified suppliers'}
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                <Package size={14} />
                {isRtl ? 'ماذا تبحث عنه؟' : 'What are you looking for?'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  onBlur={() => suggestCategory(formData.productName)}
                  className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                  placeholder={isRtl ? 'مثال: أسلاك نحاسية 2.5 ملم...' : 'e.g. 2.5mm Copper Wires...'}
                />
                {isSuggesting && (
                  <div className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2`}>
                    <Loader2 size={18} className="text-brand-primary animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                  <Tag size={14} />
                  {isRtl ? 'الفئة' : 'Category'}
                </label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === e.target.value);
                    if (cat) {
                      setFormData({ 
                        ...formData, 
                        categoryId: cat.id!, 
                        categoryNameAr: cat.nameAr, 
                        categoryNameEn: cat.nameEn 
                      });
                    }
                  }}
                  className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all appearance-none"
                >
                  <option value="">{isRtl ? 'اختر الفئة...' : 'Select Category...'}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {isRtl ? cat.nameAr : cat.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                  <Target size={14} />
                  {isRtl ? 'الكمية المطلوبة' : 'Quantity Needed'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={14} />
                {isRtl ? 'تفاصيل إضافية (اختياري)' : 'Additional Details (Optional)'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all resize-none"
                placeholder={isRtl ? 'أضف أي مواصفات خاصة هنا...' : 'Add any special specifications here...'}
              />
            </div>

            <div className="pt-4">
              <HapticButton
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-primary-hover transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                {isRtl ? 'بث الطلب الآن' : 'Broadcast Request Now'}
              </HapticButton>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
