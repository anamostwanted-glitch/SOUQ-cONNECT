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
import { calculateDistributionMetrics, isRequestVisible } from '../../../core/services/distributionService';
import { Info, TrendingUp, ShieldCheck, Star } from 'lucide-react';

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
  const [showFairnessInfo, setShowFairnessInfo] = useState(false);

  const metrics = calculateDistributionMetrics(profile);

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
    // Apply Smart Distribution Visibility
    if (profile.role === 'supplier') {
      const visible = isRequestVisible(req.createdAt, metrics.visibilityDelayMinutes);
      if (!visible) return false;
    }

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
      {/* Supplier Priority Status Card */}
      {profile.role === 'supplier' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-brand-border shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-brand-primary/10 transition-all" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                metrics.priorityLevel === 'high' ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                metrics.priorityLevel === 'boost' ? 'bg-brand-primary text-white shadow-brand-primary/20' :
                metrics.priorityLevel === 'medium' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                'bg-slate-400 text-white shadow-slate-400/20'
              }`}>
                {metrics.priorityLevel === 'high' ? <ShieldCheck size={28} /> :
                 metrics.priorityLevel === 'boost' ? <TrendingUp size={28} /> :
                 metrics.priorityLevel === 'medium' ? <Star size={28} /> :
                 <Clock size={28} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-brand-text-main">
                    {isRtl ? 'حالة أولوية التوزيع' : 'Distribution Priority Status'}
                  </h4>
                  <button 
                    onClick={() => setShowFairnessInfo(!showFairnessInfo)}
                    className="p-1 text-brand-text-muted hover:text-brand-primary transition-colors"
                  >
                    <Info size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    metrics.priorityLevel === 'high' ? 'bg-emerald-100 text-emerald-700' :
                    metrics.priorityLevel === 'boost' ? 'bg-brand-primary/10 text-brand-primary' :
                    metrics.priorityLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {metrics.priorityLevel === 'high' ? (isRtl ? 'أولوية قصوى' : 'High Priority') :
                     metrics.priorityLevel === 'boost' ? (isRtl ? 'دعم البداية' : 'Newcomer Boost') :
                     metrics.priorityLevel === 'medium' ? (isRtl ? 'أولوية متوسطة' : 'Medium Priority') :
                     (isRtl ? 'أولوية منخفضة' : 'Low Priority')}
                  </span>
                  <span className="text-[10px] font-bold text-brand-text-muted">
                    • {isRtl ? 'معدل الأداء:' : 'Performance Score:'} {Math.round(metrics.score)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">
                {isRtl ? 'تأخير ظهور الطلبات' : 'Request Visibility Delay'}
              </div>
              <div className="text-2xl font-black text-brand-text-main flex items-baseline gap-1">
                {metrics.visibilityDelayMinutes}
                <span className="text-xs font-bold text-brand-text-muted">{isRtl ? 'دقيقة' : 'min'}</span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFairnessInfo && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-6 pt-6 border-t border-brand-border/50 text-xs text-brand-text-muted leading-relaxed space-y-2"
              >
                <p className="font-bold text-brand-text-main">
                  {isRtl ? 'كيف يعمل التوزيع العادل؟' : 'How does Fair Distribution work?'}
                </p>
                <p>
                  {isRtl 
                    ? 'يتم توزيع الطلبات بناءً على نشاطك، سرعة استجابتك، وتقييم العملاء. الموردون الأكثر فاعلية يحصلون على الطلبات فوراً، بينما يحصل الآخرون عليها بتأخير بسيط لضمان جودة الخدمة.'
                    : 'Requests are distributed based on your activity, response speed, and customer ratings. Most effective suppliers see requests instantly, while others see them with a slight delay to ensure service quality.'}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-brand-background p-3 rounded-xl">
                    <span className="font-bold block mb-1 text-brand-primary">{isRtl ? 'لتحسين رتبتك:' : 'To improve rank:'}</span>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{isRtl ? 'الرد السريع على المحادثات' : 'Fast response to chats'}</li>
                      <li>{isRtl ? 'تسجيل الدخول اليومي' : 'Daily login'}</li>
                      <li>{isRtl ? 'الحصول على تقييمات إيجابية' : 'Get positive ratings'}</li>
                    </ul>
                  </div>
                  <div className="bg-brand-background p-3 rounded-xl">
                    <span className="font-bold block mb-1 text-brand-teal">{isRtl ? 'دعم الموردين الجدد:' : 'Newcomer Support:'}</span>
                    <p>{isRtl ? 'الموردون الجدد يحصلون على أولوية قصوى لمدة 30 يوماً لمساعدتهم على البدء.' : 'New suppliers get high priority for 30 days to help them start.'}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
                    <div className="w-14 h-14 rounded-2xl bg-brand-background border border-brand-border flex items-center justify-center text-brand-primary shrink-0 group-hover:scale-110 transition-transform relative">
                      <Package size={26} />
                      {profile.categories?.includes(req.categoryId) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary rounded-full border-2 border-brand-surface animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-black text-brand-text-main group-hover:text-brand-primary transition-colors truncate">
                        {req.productName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest bg-brand-background px-2 py-1 rounded-lg">
                          <Tag size={12} className="text-brand-primary" />
                          {isRtl ? req.categoryNameAr : req.categoryNameEn}
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                          <Clock size={12} />
                          {new Date(req.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                        </span>
                        <div className="flex items-center gap-1.5">
                           <div className="w-1 h-1 bg-brand-border rounded-full" />
                           <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
                             {req.offerCount || 0} {isRtl ? 'عروض مقدمة' : 'Offers Submitted'}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 mt-2 md:mt-0 p-3 md:p-0 bg-brand-background md:bg-transparent rounded-2xl border border-brand-border md:border-transparent">
                    <div className="text-right">
                      <div className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-0.5">
                        {isRtl ? 'الكمية المطلوبة' : 'Needed Qty'}
                      </div>
                      <div className="text-lg font-black text-brand-text-main">
                        {req.quantity}
                      </div>
                    </div>
                    <HapticButton className="px-6 py-3 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/20 group-hover:translate-x-1 transition-transform flex items-center gap-2">
                      {isRtl ? 'تقديم عرض' : 'Make Offer'}
                      <ChevronRight size={16} className={isRtl ? 'rotate-180' : ''} />
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
