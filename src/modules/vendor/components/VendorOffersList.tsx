import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { MessageSquare, Clock, CheckCircle2, XCircle, DollarSign } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { db } from '../../../core/firebase';
import { UserProfile, Offer, ProductRequest } from '../../../core/types';

interface VendorOffersListProps {
  profile: UserProfile;
  onOpenChat: (chatId: string) => void;
}

interface OfferWithRequest extends Offer {
  requestDetails?: ProductRequest;
}

export const VendorOffersList: React.FC<VendorOffersListProps> = ({ profile, onOpenChat }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [offers, setOffers] = useState<OfferWithRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'offers'),
      where('supplierId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const fetchedOffers: OfferWithRequest[] = [];
      
      for (const document of snap.docs) {
        const offerData = { id: document.id, ...document.data() } as OfferWithRequest;
        
        // Fetch associated request details
        try {
          const requestRef = doc(db, 'requests', offerData.requestId);
          const requestSnap = await getDoc(requestRef);
          if (requestSnap.exists()) {
            offerData.requestDetails = { id: requestSnap.id, ...requestSnap.data() } as ProductRequest;
          }
        } catch (error) {
          console.error("Error fetching request details for offer:", error);
        }
        
        fetchedOffers.push(offerData);
      }
      
      setOffers(fetchedOffers);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'offers');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile.uid]);

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-sm";

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className={`${glassClass} p-5 rounded-2xl animate-pulse`}>
            <div className="h-6 bg-brand-border rounded w-1/3 mb-4" />
            <div className="h-4 bg-brand-border rounded w-1/4 mb-6" />
            <div className="h-10 bg-brand-border rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className={`text-center py-12 ${glassClass} rounded-3xl`}>
        <div className="w-16 h-16 bg-brand-background rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={24} className="text-brand-text-muted" />
        </div>
        <h3 className="text-lg font-bold text-brand-text-main mb-2">
          {isRtl ? 'لا توجد عروض نشطة' : 'No active offers'}
        </h3>
        <p className="text-brand-text-muted text-sm max-w-md mx-auto">
          {isRtl ? 'لم تقم بتقديم أي عروض حتى الآن. تصفح الطلبات المتاحة لتقديم عروضك.' : 'You haven\'t submitted any offers yet. Browse available requests to submit your offers.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {offers.map((offer, index) => (
        <motion.div
          key={offer.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`${glassClass} p-5 rounded-2xl hover:shadow-md transition-all`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-lg font-bold text-brand-text-main">
                {offer.requestDetails?.productName || (isRtl ? 'طلب غير معروف' : 'Unknown Request')}
              </h4>
              <div className="flex items-center gap-2 text-xs text-brand-text-muted mt-1">
                <Clock size={12} />
                {new Date(offer.createdAt).toLocaleDateString()}
              </div>
            </div>
            
            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border flex items-center gap-1 ${
              offer.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
              offer.status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
              'bg-amber-500/10 text-amber-600 border-amber-500/20'
            }`}>
              {offer.status === 'accepted' && <CheckCircle2 size={12} />}
              {offer.status === 'rejected' && <XCircle size={12} />}
              {offer.status === 'pending' && <Clock size={12} />}
              
              {offer.status === 'accepted' ? (isRtl ? 'مقبول' : 'Accepted') :
               offer.status === 'rejected' ? (isRtl ? 'مرفوض' : 'Rejected') :
               (isRtl ? 'قيد الانتظار' : 'Pending')}
            </span>
          </div>

          <div className="bg-brand-background rounded-xl p-4 border border-brand-border mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                {isRtl ? 'السعر المقترح' : 'Proposed Price'}
              </span>
              <span className="text-lg font-black text-brand-primary flex items-center">
                <DollarSign size={16} />
                {offer.price}
              </span>
            </div>
            <p className="text-sm text-brand-text-main line-clamp-2">
              {offer.message}
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                // Find chat and open
                const findAndOpenChat = async () => {
                  const q = query(
                    collection(db, 'chats'),
                    where('supplierId', '==', profile.uid),
                    where('requestId', '==', offer.requestId)
                  );
                  const snap = await getDocs(q);
                  if (!snap.empty) {
                    onOpenChat(snap.docs[0].id);
                  }
                };
                findAndOpenChat();
              }}
              className="px-4 py-2 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-xl hover:bg-brand-primary/20 transition-colors flex items-center gap-2"
            >
              <MessageSquare size={14} />
              {isRtl ? 'متابعة المحادثة' : 'Continue Chat'}
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
