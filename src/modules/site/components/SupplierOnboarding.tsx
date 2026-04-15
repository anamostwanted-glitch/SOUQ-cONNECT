import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AICategorySelector } from './AICategorySelector';
import { Category, UserProfile } from '../../../core/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { toast } from 'sonner';

interface OnboardingStep {
  id: number;
  title: string;
  component: React.ReactNode;
}

export const SupplierOnboarding: React.FC<{ profile: UserProfile; categories: Category[]; onComplete: () => void }> = ({ profile, categories, onComplete }) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(profile.categories || []);
  const [isSaving, setIsSaving] = useState(false);

  // Debounced auto-save function
  const saveProgress = useCallback(async (data: Partial<UserProfile>) => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
    } finally {
      setIsSaving(false);
    }
  }, [profile.uid]);

  // Auto-save when categories change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProgress({ categories: selectedCategories });
    }, 1000);
    return () => clearTimeout(timer);
  }, [selectedCategories, saveProgress]);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: i18n.language === 'ar' ? 'معلومات الشركة' : 'Company Information',
      component: <div className="p-8 text-center">{i18n.language === 'ar' ? 'جاري تطوير نموذج معلومات الشركة...' : 'Company info form under development...'}</div>
    },
    {
      id: 2,
      title: i18n.language === 'ar' ? 'التصنيف الذكي' : 'Smart Categorization',
      component: (
        <div className="p-8">
          <AICategorySelector 
            categories={categories} 
            selectedCategoryIds={selectedCategories} 
            onChange={setSelectedCategories}
            isRtl={i18n.language === 'ar'}
          />
        </div>
      )
    }
  ];

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), { 
        categories: selectedCategories,
        onboardingCompleted: true 
      });
      toast.success(i18n.language === 'ar' ? 'تم إكمال الإعداد بنجاح!' : 'Onboarding completed successfully!');
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
      toast.error(i18n.language === 'ar' ? 'فشل حفظ البيانات' : 'Failed to save data');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="mb-8">
        <div className="flex justify-between mb-4">
          {steps.map((s) => (
            <div key={s.id} className={`flex-1 h-2 mx-1 rounded-full ${step >= s.id ? 'bg-brand-teal' : 'bg-brand-border'}`} />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{steps[step - 1].title}</h2>
          {isSaving && <span className="text-xs text-brand-text-muted">{i18n.language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-2xl shadow-premium border border-brand-border"
        >
          {steps[step - 1].component}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex justify-between">
        <button disabled={step === 1} onClick={() => setStep(s => s - 1)} className="px-6 py-2 rounded-full border border-brand-border">
          {i18n.language === 'ar' ? 'السابق' : 'Previous'}
        </button>
        <button onClick={() => step < steps.length ? setStep(s => s + 1) : handleFinish()} className="px-6 py-2 rounded-full bg-brand-primary text-white">
          {step === steps.length ? (i18n.language === 'ar' ? 'إنهاء' : 'Finish') : (i18n.language === 'ar' ? 'التالي' : 'Next')}
        </button>
      </div>
    </div>
  );
};
