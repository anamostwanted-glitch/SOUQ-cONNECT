import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, MapPin, ChevronRight, ChevronDown, MessageSquare, 
  Sparkles, Send, DollarSign, FileText, CheckCircle2
} from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType, handleAiError } from '../../../core/utils/errorHandling';
import { db } from '../../../core/firebase';
import { ProductRequest, UserProfile } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { generateSupplierProposal } from '../../../core/services/geminiService';

interface VendorRequestCardProps {
  request: ProductRequest;
  profile: UserProfile;
  onOpenChat: (chatId: string) => void;
  hasOffer?: boolean;
}

export const VendorRequestCard: React.FC<VendorRequestCardProps> = ({
  request,
  profile,
  onOpenChat,
  hasOffer = false
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [offerSubmitted, setOfferSubmitted] = useState(hasOffer);

  const isNew = (new Date().getTime() - new Date(request.createdAt).getTime()) < 24 * 60 * 60 * 1000;

  const handleGenerateAiMessage = async () => {
    setIsGeneratingAi(true);
    try {
      const generatedMessage = await generateSupplierProposal(request.description || request.productName, i18n.language);
      if (generatedMessage) {
        setMessage(generatedMessage);
      }
    } catch (err) {
      handleAiError(err, 'VendorRequestCard:handleGenerateAiMessage', false);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleStartChat = async () => {
    setChatLoading(true);
    try {
      const q = query(
        collection(db, 'chats'), 
        where('supplierId', '==', profile.uid)
      );
      
      const snap = await getDocs(q);
      const existingChat = snap.docs.find(doc => {
        const data = doc.data();
        return data.requestId === request.id && data.customerId === request.customerId;
      });
      
      if (existingChat) {
        onOpenChat(existingChat.id);
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          requestId: request.id,
          supplierId: profile.uid,
          customerId: request.customerId,
          lastMessage: '',
          updatedAt: new Date().toISOString()
        });
        onOpenChat(newChat.id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chats', false);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || isNaN(Number(price))) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'offers'), {
        requestId: request.id,
        supplierId: profile.uid,
        customerId: request.customerId,
        price: Number(price),
        message,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      // Update request offers count
      const requestRef = doc(db, 'requests', request.id);
      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists()) {
        await updateDoc(requestRef, {
          offersCount: (requestSnap.data().offersCount || 0) + 1
        });
      }
      
      setOfferSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'offers/requests', false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-sm";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`${glassClass} p-4 md:p-5 rounded-2xl hover:shadow-md transition-all group relative overflow-hidden`}
    >
      <div 
        className="flex justify-between items-start mb-2 md:mb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base md:text-lg font-black text-brand-text-main group-hover:text-brand-primary transition-colors truncate">
              {request.productName}
            </h4>
            {isNew && (
              <span className="px-1.5 md:px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-full shrink-0">
                {isRtl ? 'جديد' : 'New'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-brand-text-muted mt-1 font-bold">
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
              {new Date(request.createdAt).toLocaleDateString()}
            </span>
            {request.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
                <span className="truncate">{request.location}</span>
              </span>
            )}
          </div>
        </div>
        <span className={`px-2 md:px-3 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg border shrink-0 ml-2 ${
          offerSubmitted ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
          'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
        }`}>
          {offerSubmitted ? (isRtl ? 'تم التقديم' : 'Sent') : (isRtl ? 'متاح' : 'Available')}
        </span>
      </div>
      
      <div 
        className="flex items-center justify-between mt-3 md:mt-4 pt-3 md:pt-4 border-t border-brand-border/30 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-xs md:text-sm font-bold text-brand-text-muted">
            {request.offersCount || 0} {isRtl ? 'عروض' : 'Offers'}
          </span>
          {request.quantity && (
            <span className="text-[10px] md:text-sm font-bold text-brand-text-main bg-brand-background px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-brand-border">
              {isRtl ? 'الكمية:' : 'Qty:'} {request.quantity}
            </span>
          )}
        </div>
        <HapticButton className="text-brand-primary text-xs md:text-sm font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          {isExpanded ? (isRtl ? 'إخفاء' : 'Hide') : (isRtl ? 'تفاصيل' : 'Details')}
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <ChevronRight className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isRtl ? 'rotate-180' : ''}`} />}
        </HapticButton>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-6 mt-2 border-t border-brand-border/30 space-y-6">
              {/* Request Description */}
              {request.description && (
                <div className="bg-brand-background p-4 rounded-xl border border-brand-border">
                  <h5 className="text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2">
                    {isRtl ? 'تفاصيل الطلب' : 'Request Details'}
                  </h5>
                  <p className="text-sm text-brand-text-main leading-relaxed">
                    {request.description}
                  </p>
                </div>
              )}

              {/* Action Area */}
              {offerSubmitted ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={24} className="text-emerald-500" />
                  </div>
                  <h4 className="text-emerald-600 font-bold mb-1">
                    {isRtl ? 'تم إرسال عرضك بنجاح' : 'Your offer was sent successfully'}
                  </h4>
                  <p className="text-sm text-emerald-600/70 mb-4">
                    {isRtl ? 'سيقوم العميل بمراجعة عرضك والتواصل معك' : 'The customer will review your offer and contact you'}
                  </p>
                  <button 
                    onClick={handleStartChat}
                    disabled={chatLoading}
                    className="px-6 py-2 bg-white text-emerald-600 text-sm font-bold rounded-xl border border-emerald-500/20 hover:bg-emerald-50 transition-colors inline-flex items-center gap-2"
                  >
                    {chatLoading ? (
                      <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                    ) : (
                      <MessageSquare size={16} />
                    )}
                    {isRtl ? 'مراسلة العميل' : 'Message Customer'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitOffer} className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1 h-6 bg-brand-primary rounded-full" />
                    <h5 className="text-sm font-black text-brand-text-main uppercase tracking-wider">
                      {isRtl ? 'تقديم عرض' : 'Submit Offer'}
                    </h5>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                        {isRtl ? 'السعر المقترح' : 'Proposed Price'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign size={16} className="text-brand-text-muted" />
                        </div>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0.00"
                          required
                          className="w-full pl-10 pr-4 py-3 bg-brand-background border border-brand-border rounded-xl text-brand-text-main focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                        {isRtl ? 'رسالة العرض' : 'Offer Message'}
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateAiMessage}
                        disabled={isGeneratingAi}
                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:text-brand-primary-hover transition-colors disabled:opacity-50"
                      >
                        {isGeneratingAi ? (
                          <div className="w-3 h-3 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        {isRtl ? 'توليد بالذكاء الاصطناعي' : 'Generate with AI'}
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute top-3 left-3 pointer-events-none">
                        <FileText size={16} className="text-brand-text-muted" />
                      </div>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={isRtl ? 'اكتب تفاصيل عرضك هنا...' : 'Write your offer details here...'}
                        rows={4}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-brand-background border border-brand-border rounded-xl text-brand-text-main focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleStartChat}
                      disabled={chatLoading}
                      className="flex-1 py-3 bg-brand-background text-brand-text-main font-bold rounded-xl border border-brand-border hover:bg-brand-surface transition-all flex items-center justify-center gap-2"
                    >
                      {chatLoading ? (
                        <div className="w-5 h-5 border-2 border-brand-text-main/30 border-t-brand-text-main rounded-full animate-spin" />
                      ) : (
                        <MessageSquare size={18} />
                      )}
                      {isRtl ? 'استفسار' : 'Inquire'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !price || !message}
                      className="flex-[2] py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-brand-primary/20"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      {isRtl ? 'إرسال العرض' : 'Send Offer'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
