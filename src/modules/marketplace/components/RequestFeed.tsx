import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile, ProductRequest } from '../../../core/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Sparkles,
  Tag,
  MessageSquare,
  Zap,
  Filter
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface RequestFeedProps {
  profile: UserProfile;
  isRtl: boolean;
  onMakeOffer: (request: any) => void;
}

export const RequestFeed: React.FC<RequestFeedProps> = ({ 
  profile, 
  isRtl, 
  onMakeOffer 
}) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'matched'>('all');

  useEffect(() => {
    // If supplier, we can filter by their categories
    let q = query(
      collection(db, 'requests'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const reqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'requests_feed', false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredRequests = requests.filter(req => {
    if (filter === 'matched' && profile.role === 'supplier' && profile.categories) {
      return profile.categories.includes(req.categoryId);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-brand-surface rounded-3xl animate-pulse border border-brand-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-black text-brand-text-main flex items-center gap-2">
          <Zap size={20} className="text-brand-primary" />
          {isRtl ? 'طلبات السوق المفتوحة' : 'Open Market Requests'}
        </h3>
        
        <div className="flex bg-brand-surface p-1 rounded-xl border border-brand-border">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'all' ? 'bg-brand-primary text-white shadow-md' : 'text-brand-text-muted hover:text-brand-text-main'
            }`}
          >
            {isRtl ? 'الكل' : 'All'}
          </button>
          <button 
            onClick={() => setFilter('matched')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              filter === 'matched' ? 'bg-brand-primary text-white shadow-md' : 'text-brand-text-muted hover:text-brand-text-main'
            }`}
          >
            {isRtl ? 'مطابق لمجالي' : 'Matched'}
          </button>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-brand-surface p-12 rounded-[2.5rem] border border-brand-border text-center">
          <div className="w-16 h-16 bg-brand-background rounded-full flex items-center justify-center text-brand-text-muted mx-auto mb-4">
            <Package size={32} />
          </div>
          <p className="text-brand-text-muted font-bold">
            {isRtl ? 'لا توجد طلبات مفتوحة حالياً' : 'No open requests at the moment'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredRequests.map((req) => (
              <motion.div
                key={req.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-brand-surface p-5 md:p-6 rounded-[2rem] border border-brand-border hover:border-brand-primary/30 hover:shadow-xl hover:shadow-brand-primary/5 transition-all cursor-pointer relative overflow-hidden"
                onClick={() => onMakeOffer(req)}
              >
                {/* Match Indicator */}
                {profile.categories?.includes(req.categoryId) && (
                  <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} top-0 p-2`}>
                    <div className="bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-bl-2xl rounded-tr-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Sparkles size={12} />
                      {isRtl ? 'مطابق' : 'Match'}
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-background border border-brand-border flex items-center justify-center text-brand-primary shrink-0 group-hover:scale-110 transition-transform">
                      <Package size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-brand-text-main group-hover:text-brand-primary transition-colors">
                        {req.productName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
                          <Tag size={12} className="text-brand-primary" />
                          {isRtl ? req.categoryNameAr : req.categoryNameEn}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
                          <Clock size={12} />
                          {new Date(req.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-brand-primary uppercase tracking-widest">
                          <MessageSquare size={12} />
                          {req.offerCount || 0} {isRtl ? 'عروض' : 'Offers'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                      <div className="text-xs font-black text-brand-text-muted uppercase tracking-widest mb-1">
                        {isRtl ? 'الكمية' : 'Quantity'}
                      </div>
                      <div className="text-lg font-black text-brand-text-main">
                        {req.quantity}
                      </div>
                    </div>
                    <HapticButton className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-primary/20 group-hover:translate-x-1 transition-transform">
                      <ChevronRight size={20} className={isRtl ? 'rotate-180' : ''} />
                    </HapticButton>
                  </div>
                </div>

                {req.description && (
                  <p className="mt-4 text-sm text-brand-text-muted font-medium line-clamp-2 bg-brand-background/50 p-3 rounded-xl border border-brand-border/50">
                    {req.description}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
