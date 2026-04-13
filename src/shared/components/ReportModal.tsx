import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Shield, CheckCircle2, Loader2, Flag } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { UserProfile } from '../../core/types';
import { handleFirestoreError, OperationType } from '../../core/utils/errorHandling';
import { createNotification } from '../../core/services/notificationService';
import { toast } from 'sonner';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'marketplace_item' | 'user';
  targetOwnerId?: string;
  targetTitle?: string;
  profile: UserProfile | null;
  isRtl: boolean;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetId,
  targetType,
  targetOwnerId,
  targetTitle,
  profile,
  isRtl
}) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const reasons = isRtl ? [
    'محتوى غير لائق أو إباحي',
    'احتيال أو تضليل',
    'منتج مقلد أو غير قانوني',
    'إزعاج أو سبام',
    'معلومات خاطئة',
    'أخرى'
  ] : [
    'Inappropriate or adult content',
    'Fraud or misleading',
    'Counterfeit or illegal product',
    'Harassment or spam',
    'False information',
    'Other'
  ];

  const handleSubmit = async () => {
    if (!profile) {
      toast.error(isRtl ? 'يجب تسجيل الدخول للإبلاغ' : 'You must be logged in to report');
      return;
    }

    if (!reason) {
      toast.error(isRtl ? 'يرجى اختيار سبب الإبلاغ' : 'Please select a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const reportData = {
        reporterId: profile.uid,
        reporterName: profile.name,
        targetId,
        targetType,
        targetOwnerId: targetOwnerId || '',
        reason,
        details,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'reports'), reportData);

      // Notify the owner (as requested: "وتوصل للمستخدم لحذفها")
      if (targetOwnerId) {
        await createNotification({
          userId: targetOwnerId,
          titleAr: 'تنبيه بخصوص إعلانك',
          titleEn: 'Alert regarding your ad',
          bodyAr: `تم الإبلاغ عن إعلانك "${targetTitle || ''}" بسبب: ${reason}. يرجى مراجعته أو حذفه لتجنب حظر الحساب.`,
          bodyEn: `Your ad "${targetTitle || ''}" has been reported for: ${reason}. Please review or delete it to avoid account suspension.`,
          link: `/marketplace/item/${targetId}`,
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setReason('');
        setDetails('');
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports', false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-background/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden"
          >
            {isSuccess ? (
              <div className="p-12 text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-brand-text-main">
                    {isRtl ? 'تم إرسال الإبلاغ' : 'Report Submitted'}
                  </h3>
                  <p className="text-brand-text-muted font-medium">
                    {isRtl ? 'شكراً لك على مساعدتنا في الحفاظ على أمان المجتمع.' : 'Thank you for helping us keep the community safe.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-8 border-b border-brand-border flex items-center justify-between bg-brand-background/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-error/10 rounded-2xl flex items-center justify-center text-brand-error">
                      <Flag size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-brand-text-main">
                        {isRtl ? 'إبلاغ عن محتوى' : 'Report Content'}
                      </h3>
                      <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest">
                        {targetType === 'marketplace_item' ? (isRtl ? 'إعلان منتج' : 'Marketplace Item') : (isRtl ? 'مستخدم' : 'User')}
                      </p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-brand-background rounded-xl transition-colors text-brand-text-muted">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                      {isRtl ? 'سبب الإبلاغ' : 'Reason for Reporting'}
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {reasons.map((r) => (
                        <button
                          key={r}
                          onClick={() => setReason(r)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-sm font-bold ${
                            reason === r 
                              ? 'bg-brand-primary/5 border-brand-primary text-brand-primary' 
                              : 'bg-brand-background border-brand-border text-brand-text-main hover:border-brand-primary/30'
                          }`}
                        >
                          {r}
                          {reason === r && <CheckCircle2 size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                      {isRtl ? 'تفاصيل إضافية (اختياري)' : 'Additional Details (Optional)'}
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder={isRtl ? 'اشرح لنا المزيد عن المشكلة...' : 'Tell us more about the issue...'}
                      className="w-full h-32 p-4 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm font-medium resize-none transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                    <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                    <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                      {isRtl 
                        ? 'سيتم مراجعة هذا الإبلاغ من قبل فريق الإدارة. الإبلاغات الكاذبة قد تؤدي إلى تقييد حسابك.' 
                        : 'This report will be reviewed by the admin team. False reports may lead to account restrictions.'}
                    </p>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !reason}
                    className="w-full py-4 bg-brand-error text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-error/90 transition-all shadow-lg shadow-brand-error/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                    {isRtl ? 'إرسال الإبلاغ' : 'Submit Report'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
