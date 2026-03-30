import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Chat, UserProfile } from '../../../../core/types';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../../core/firebase';
import { handleFirestoreError, OperationType } from '../../../../core/utils/errorHandling';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
  otherUser: UserProfile | null;
  onRateSuccess: (rating: number, review: string) => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  chat,
  otherUser,
  onRateSuccess
}) => {
  const { t, i18n } = useTranslation();
  
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const handleRateUser = async () => {
    if (!chat || !otherUser || ratingValue === 0) return;
    
    setIsSubmittingRating(true);
    try {
      // Update Chat
      await updateDoc(doc(db, 'chats', chat.id), {
        status: 'closed',
        rating: ratingValue,
        review: reviewText,
        updatedAt: new Date().toISOString()
      });

      // Update User Profile
      const userRef = doc(db, 'users', otherUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        const currentRating = userData.rating || 0;
        const currentCount = userData.reviewCount || 0;
        
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + ratingValue) / newCount;
        
        await updateDoc(userRef, {
          rating: newRating,
          reviewCount: newCount
        });
      }
      
      onRateSuccess(ratingValue, reviewText);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chat.id} or users/${otherUser.uid}`);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-text-main/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-modal w-full max-w-md overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-brand-border-light flex items-center justify-between bg-brand-background">
              <h3 className="text-xl font-black text-brand-text-main flex items-center gap-2">
                <Star size={24} className="text-brand-warning fill-brand-warning" />
                {i18n.language === 'ar' ? 'تقييم المستخدم' : 'Rate User'}
              </h3>
              <button onClick={onClose} className="p-3 hover:bg-brand-border rounded-full text-brand-text-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-sm text-brand-text-muted mb-4">
                  {i18n.language === 'ar' 
                    ? 'كيف كانت تجربتك مع هذا المستخدم من حيث جودة التواصل وسرعة الرد؟' 
                    : 'How was your experience with this user regarding communication quality and response speed?'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingValue(star)}
                      className={`p-3 transition-all ${ratingValue >= star ? 'text-brand-warning scale-110' : 'text-brand-text-muted hover:text-brand-warning'}`}
                    >
                      <Star size={32} className={ratingValue >= star ? 'fill-brand-warning' : ''} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">
                  {i18n.language === 'ar' ? 'تعليق إضافي (اختياري)' : 'Additional Comment (Optional)'}
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder={i18n.language === 'ar' ? 'أضف تعليقاً حول أسلوب الرد والتعامل...' : 'Add a comment about the response style and interaction...'}
                  className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary h-24 resize-none text-sm"
                />
              </div>
            </div>

            <div className="p-6 bg-brand-background border-t border-brand-border-light flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-2 rounded-xl font-bold text-brand-text-muted hover:bg-brand-border transition-all"
              >
                {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={handleRateUser}
                disabled={ratingValue === 0 || isSubmittingRating}
                className="px-6 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingRating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                {i18n.language === 'ar' ? 'تأكيد التقييم' : 'Submit Rating'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
