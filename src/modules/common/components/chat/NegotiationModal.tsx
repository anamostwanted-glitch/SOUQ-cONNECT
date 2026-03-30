import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, X, SparklesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Chat, UserProfile } from '../../../../core/types';
import { negotiateOffer } from '../../../../core/services/geminiService';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../core/firebase';

interface NegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateReply: (reply: string) => void;
  chat: Chat | null;
  profile: UserProfile | null;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({
  isOpen,
  onClose,
  onGenerateReply,
  chat,
  profile
}) => {
  const { t, i18n } = useTranslation();
  
  const [negotiationCustomerMessage, setNegotiationCustomerMessage] = useState('');
  const [negotiationCurrentOffer, setNegotiationCurrentOffer] = useState('');
  const [negotiationMinPrice, setNegotiationMinPrice] = useState('');
  const [isNegotiating, setIsNegotiating] = useState(false);

  if (!isOpen) return null;

  const handleNegotiate = async () => {
    if (!negotiationCurrentOffer || !negotiationMinPrice || !negotiationCustomerMessage) return;
    setIsNegotiating(true);
    try {
      const response = await negotiateOffer(
        negotiationCustomerMessage,
        parseFloat(negotiationCurrentOffer),
        parseFloat(negotiationMinPrice),
        i18n.language
      );
      onGenerateReply(response.message || '');
      onClose();
    } catch (error) {
      console.error('Negotiation error:', error);
    } finally {
      setIsNegotiating(false);
    }
  };

  const handleToggleAutoNegotiate = async () => {
    if (!chat?.requestId || !profile?.uid) return;
    try {
      const offersSnap = await getDocs(query(
        collection(db, 'offers'),
        where('requestId', '==', chat.requestId),
        where('supplierId', '==', profile.uid)
      ));
      if (!offersSnap.empty) {
        const offerId = offersSnap.docs[0].id;
        const currentAuto = offersSnap.docs[0].data().autoNegotiate || false;
        await updateDoc(doc(db, 'offers', offerId), {
          autoNegotiate: !currentAuto,
          minPrice: Number(negotiationMinPrice) || 0
        });
      }
    } catch (error) {
      console.error("Error updating auto-negotiate:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-text-main/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md glass-modal overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-brand-border-light flex items-center justify-between bg-brand-success text-white">
          <div className="flex items-center gap-3">
            <Bot size={24} />
            <h3 className="text-xl font-black">{i18n.language === 'ar' ? 'مفاوض الذكاء الاصطناعي' : 'AI Negotiator'}</h3>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-brand-text-main mb-1">{i18n.language === 'ar' ? 'رسالة العميل الأخيرة' : 'Last Customer Message'}</label>
            <textarea
              value={negotiationCustomerMessage}
              onChange={e => setNegotiationCustomerMessage(e.target.value)}
              className="w-full p-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-success transition-all resize-none h-24"
              placeholder={i18n.language === 'ar' ? 'أدخل رسالة العميل...' : 'Enter customer message...'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-brand-text-main mb-1">{i18n.language === 'ar' ? 'العرض الحالي' : 'Current Offer'}</label>
              <input
                type="number"
                value={negotiationCurrentOffer}
                onChange={e => setNegotiationCurrentOffer(e.target.value)}
                className="w-full p-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-success transition-all"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-text-main mb-1">{i18n.language === 'ar' ? 'الحد الأدنى للسعر' : 'Minimum Price'}</label>
              <input
                type="number"
                value={negotiationMinPrice}
                onChange={e => setNegotiationMinPrice(e.target.value)}
                className="w-full p-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-success transition-all"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                <Bot size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-text-main">{i18n.language === 'ar' ? 'التفاوض التلقائي' : 'Auto-Negotiate'}</p>
                <p className="text-[10px] text-brand-text-muted">{i18n.language === 'ar' ? 'دع الذكاء الاصطناعي يتفاوض نيابة عنك' : 'Let AI negotiate on your behalf'}</p>
              </div>
            </div>
            <button
              onClick={handleToggleAutoNegotiate}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none bg-brand-primary`}
            >
              <span className="sr-only">Toggle Auto-Negotiate</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6`}
              />
            </button>
          </div>
        </div>
        <div className="p-6 border-t border-brand-border-light flex justify-end gap-3 bg-brand-background">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-brand-text-muted hover:bg-brand-border transition-colors"
          >
            {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleNegotiate}
            disabled={isNegotiating || !negotiationCurrentOffer || !negotiationMinPrice || !negotiationCustomerMessage}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-success hover:bg-brand-success transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isNegotiating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <SparklesIcon size={18} />
            )}
            {i18n.language === 'ar' ? 'توليد الرد' : 'Generate Reply'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
