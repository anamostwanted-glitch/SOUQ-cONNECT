import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, Check, MessageSquare, User, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Chat, UserProfile } from '../../../../core/types';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../../core/firebase';
import { handleFirestoreError, OperationType } from '../../../../core/utils/errorHandling';
import { HapticButton } from '../../../../shared/components/HapticButton';

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
  const isRtl = i18n.language === 'ar';
  
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

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

  const getRatingLabel = (val: number) => {
    if (isRtl) {
      if (val === 5) return 'ممتاز جداً';
      if (val === 4) return 'جيد جداً';
      if (val === 3) return 'جيد';
      if (val === 2) return 'مقبول';
      if (val === 1) return 'سيء';
      return 'اختر تقييماً';
    }
    if (val === 5) return 'Excellent';
    if (val === 4) return 'Very Good';
    if (val === 3) return 'Good';
    if (val === 2) return 'Fair';
    if (val === 1) return 'Poor';
    return 'Select a rating';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-text-main/60 backdrop-blur-xl">
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white dark:bg-brand-surface w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden flex flex-col max-h-[95vh] shadow-2xl relative border-t border-white/20 dark:border-white/10"
          >
            {/* Header Background Gradient */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-primary/10 to-transparent pointer-events-none" />

            <div className="p-8 pb-4 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-warning/10 rounded-2xl text-brand-warning">
                  <Star size={24} className="fill-brand-warning" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-text-main tracking-tight leading-none">
                    {isRtl ? 'تقييم التجربة' : 'Rate Experience'}
                  </h3>
                  <p className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] mt-1.5">
                    Feedback & Quality
                  </p>
                </div>
              </div>
              <HapticButton 
                onClick={onClose} 
                className="w-12 h-12 flex items-center justify-center bg-brand-background/50 hover:bg-brand-background rounded-2xl text-brand-text-muted transition-all border border-brand-border/30"
              >
                <X size={20} />
              </HapticButton>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar relative z-10">
              {/* User Info Card */}
              {otherUser && (
                <div className="flex items-center gap-4 p-5 bg-brand-background/50 rounded-3xl border border-brand-border/30">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-brand-primary/5 border border-brand-border/50">
                    {otherUser.logoUrl || otherUser.photoURL ? (
                      <img 
                        src={otherUser.logoUrl || otherUser.photoURL || ''} 
                        alt={otherUser.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-primary">
                        <User size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-brand-text-main truncate tracking-tight">
                      {otherUser.companyName || otherUser.name}
                    </h4>
                    <p className="text-xs text-brand-text-muted font-medium">
                      {isRtl ? 'محادثة منتهية' : 'Completed conversation'}
                    </p>
                  </div>
                </div>
              )}

              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-brand-text-muted font-medium px-4">
                    {isRtl 
                      ? 'كيف كانت تجربتك مع هذا المستخدم من حيث جودة التواصل وسرعة الرد؟' 
                      : 'How was your experience with this user regarding communication quality and response speed?'}
                  </p>
                  <div className="text-lg font-black text-brand-primary tracking-tight h-7">
                    {getRatingLabel(hoveredRating || ratingValue)}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <HapticButton
                      key={star}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRatingValue(star)}
                      className={`p-2 transition-all transform ${
                        (hoveredRating || ratingValue) >= star 
                          ? 'text-brand-warning scale-110' 
                          : 'text-brand-text-muted hover:text-brand-warning/50'
                      }`}
                    >
                      <Star 
                        size={44} 
                        className={(hoveredRating || ratingValue) >= star ? 'fill-brand-warning' : 'fill-transparent'} 
                        strokeWidth={1.5}
                      />
                    </HapticButton>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                    {isRtl ? 'تعليق إضافي (اختياري)' : 'Additional Comment (Optional)'}
                  </label>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-brand-primary">
                    <Sparkles size={10} />
                    {isRtl ? 'رؤى ذكية' : 'Smart Insights'}
                  </div>
                </div>
                <div className="relative group">
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder={isRtl ? 'أضف تعليقاً حول أسلوب الرد والتعامل...' : 'Add a comment about the response style and interaction...'}
                    className="w-full px-6 py-5 bg-brand-background border border-brand-border/50 rounded-[2rem] outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary h-32 resize-none text-sm font-medium transition-all group-hover:border-brand-primary/30"
                  />
                  <div className="absolute bottom-4 right-6 text-[10px] font-bold text-brand-text-muted">
                    {reviewText.length}/500
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 pt-4 bg-brand-background/50 border-t border-brand-border/30 flex flex-col sm:flex-row gap-3 relative z-10">
              <HapticButton 
                onClick={onClose}
                className="flex-1 px-8 py-4 rounded-2xl font-black text-brand-text-muted hover:bg-brand-background transition-all border border-brand-border/50 text-sm"
              >
                {isRtl ? 'تجاهل' : 'Dismiss'}
              </HapticButton>
              <HapticButton 
                onClick={handleRateUser}
                disabled={ratingValue === 0 || isSubmittingRating}
                className="flex-[2] px-8 py-4 bg-gradient-to-r from-brand-primary to-brand-teal text-white rounded-2xl font-black shadow-xl shadow-brand-primary/20 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {isSubmittingRating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={20} strokeWidth={3} />
                    <span className="text-sm uppercase tracking-wider">
                      {isRtl ? 'تأكيد التقييم' : 'Confirm Rating'}
                    </span>
                  </>
                )}
              </HapticButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

