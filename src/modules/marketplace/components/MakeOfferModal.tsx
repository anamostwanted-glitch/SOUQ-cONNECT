import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile } from '../../../core/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  DollarSign, 
  MessageCircle, 
  Zap, 
  ShieldCheck, 
  Loader2,
  Send,
  Info,
  Bot
} from 'lucide-react';
import { toast } from 'sonner';
import { HapticButton } from '../../../shared/components/HapticButton';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { notifyNewOffer } from '../../../core/services/notificationService';
import { analytics } from '../../../core/services/AnalyticsService';

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  profile: UserProfile;
  isRtl: boolean;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({ 
  isOpen, 
  onClose, 
  request, 
  profile, 
  isRtl 
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    price: '',
    minPrice: '',
    message: '',
    autoNegotiate: false
  });

  // Neural Logic: Competitive Intelligence Indicator
  const calculateCompetitiveness = () => {
    if (!formData.price) return 0;
    const price = Number(formData.price);
    // Simulated market logic: Imagine average is 1000 for context or fetch from request.budget if exists
    const budget = request.budget || 1000;
    const ratio = price / budget;
    
    if (ratio < 0.8) return 95; // Very competitive
    if (ratio < 1.0) return 80; // Competitive
    if (ratio < 1.2) return 50; // Average
    if (ratio < 1.5) return 25; // Low
    return 10; // Unlikely to be picked
  };

  const competitiveness = calculateCompetitiveness();

  const getCompetitivenessColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-500/10';
    if (score >= 50) return 'text-brand-primary bg-brand-primary/10';
    return 'text-rose-500 bg-rose-500/10';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.price) {
      toast.error(isRtl ? 'يرجى إدخال السعر' : 'Please enter price');
      return;
    }

    setLoading(true);
    try {
      // 1. Create the offer
      await addDoc(collection(db, 'offers'), {
        requestId: request.id,
        supplierId: profile.uid,
        supplierName: profile.name,
        supplierCompanyName: profile.companyName || profile.name,
        price: Number(formData.price),
        minPrice: formData.autoNegotiate ? Number(formData.minPrice) : null,
        autoNegotiate: formData.autoNegotiate,
        message: formData.message,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // 2. Update request offer count
      await updateDoc(doc(db, 'requests', request.id), {
        offerCount: increment(1)
      });

      analytics.trackEvent('offer_created', {
        requestId: request.id,
        price: Number(formData.price),
        autoNegotiate: formData.autoNegotiate
      });

      // 3. Growth: Smart Notifications (In-App & Email)
      await notifyNewOffer(
        request.customerId,
        profile.name,
        request.productName,
        request.id,
        isRtl
      );

      toast.success(isRtl ? 'تم إرسال عرضك بنجاح!' : 'Offer sent successfully!');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'offers', false);
      toast.error(isRtl ? 'فشل إرسال العرض' : 'Failed to send offer');
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-brand-surface w-full max-w-lg rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden"
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-brand-text-main">
                      {isRtl ? 'تقديم عرض سعر' : 'Make Price Offer'}
                    </h2>
                    <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest mt-1">
                      {isRtl ? `لطلب: ${request.productName}` : `For: ${request.productName}`}
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

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} />
                        {isRtl ? 'السعر المقترح' : 'Proposed Price'}
                      </div>
                      {competitiveness > 0 && (
                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase transition-all ${getCompetitivenessColor(competitiveness)}`}>
                          {isRtl ? 'ذكاء تنافسي' : 'Competitive Score'}: {competitiveness}%
                        </div>
                      )}
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main font-black focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                      placeholder="0.00"
                    />
                    
                    {/* Visual Progress Bar */}
                    <AnimatePresence>
                      {competitiveness > 0 && (
                        <motion.div 
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          className="h-1 bg-brand-border rounded-full overflow-hidden"
                        >
                          <motion.div 
                            className={`h-full transition-all duration-500 ${
                              competitiveness >= 80 ? 'bg-emerald-500' : 
                              competitiveness >= 50 ? 'bg-brand-primary' : 
                              'bg-rose-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${competitiveness}%` }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={14} />
                      {isRtl ? 'الضمان/التوصيل' : 'Warranty/Delivery'}
                    </label>
                    <div className="h-[58px] bg-brand-background border border-brand-border rounded-2xl p-4 flex items-center gap-2 text-xs font-bold text-brand-text-muted">
                      <Info size={14} className="text-brand-primary" />
                      {isRtl ? 'سيتم تضمين ملفك الموثق' : 'Your verified profile included'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                    <MessageCircle size={14} />
                    {isRtl ? 'رسالة للمشتري' : 'Message to Buyer'}
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                    className="w-full bg-brand-background border border-brand-border rounded-2xl p-4 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all resize-none"
                    placeholder={isRtl ? 'أضف تفاصيل حول العرض أو المنتج...' : 'Add details about the offer or product...'}
                  />
                </div>

                {/* AI Auto-Negotiation */}
                <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-3xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot size={20} className="text-brand-primary" />
                      <h4 className="text-sm font-black text-brand-text-main">
                        {isRtl ? 'التفاوض الذكي (AI)' : 'AI Auto-Negotiation'}
                      </h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.autoNegotiate}
                        onChange={(e) => setFormData({ ...formData, autoNegotiate: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
                    </label>
                  </div>
                  <p className="text-[10px] text-brand-text-muted font-medium leading-relaxed mb-4">
                    {isRtl 
                      ? 'سيقوم بوت الذكاء الاصطناعي بالتفاوض نيابة عنك للوصول لأفضل سعر لا يقل عن الحد الأدنى الذي تحدده.' 
                      : 'AI bot will negotiate on your behalf to reach the best price not lower than your minimum.'}
                  </p>
                  
                  <AnimatePresence>
                    {formData.autoNegotiate && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                            {isRtl ? 'الحد الأدنى للسعر (سري)' : 'Minimum Price (Secret)'}
                          </label>
                          <input
                            type="number"
                            value={formData.minPrice}
                            onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                            className="w-full bg-brand-surface border border-brand-border rounded-xl p-3 text-sm font-black focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                            placeholder="0.00"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-2">
                  <HapticButton
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-primary-hover transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    {isRtl ? 'إرسال العرض' : 'Send Offer'}
                  </HapticButton>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
