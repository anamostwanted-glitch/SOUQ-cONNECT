import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  MessageCircle, 
  PlusCircle, 
  Zap, 
  UserCircle, 
  LogIn, 
  Eye, 
  Clock,
  ChevronDown,
  Activity
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';

interface UserActivity {
  id: string;
  userId: string;
  type: 'message_sent' | 'request_created' | 'offer_received' | 'profile_updated' | 'login' | 'view_product';
  descriptionAr: string;
  descriptionEn: string;
  metadata?: any;
  createdAt: string;
}

export const UserActivityFeed: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'activities'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched: UserActivity[] = [];
      snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as UserActivity));
      setActivities(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getIcon = (type: UserActivity['type']) => {
    switch (type) {
      case 'message_sent': return <MessageCircle size={18} />;
      case 'request_created': return <PlusCircle size={18} />;
      case 'offer_received': return <Zap size={18} />;
      case 'profile_updated': return <UserCircle size={18} />;
      case 'login': return <LogIn size={18} />;
      case 'view_product': return <Eye size={18} />;
      default: return <Activity size={18} />;
    }
  };

  const getColor = (type: UserActivity['type']) => {
    switch (type) {
      case 'message_sent': return 'text-brand-primary bg-brand-primary/10';
      case 'request_created': return 'text-brand-teal bg-brand-teal/10';
      case 'offer_received': return 'text-brand-warning bg-brand-warning/10';
      case 'profile_updated': return 'text-emerald-500 bg-emerald-500/10';
      case 'login': return 'text-brand-secondary bg-brand-secondary/10';
      case 'view_product': return 'text-brand-text-muted bg-brand-surface';
      default: return 'text-brand-primary bg-brand-primary/5';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full" />
        <p className="text-sm font-bold text-brand-text-muted animate-pulse">
          {isRtl ? 'جاري استرجاع السجل العشبي...' : 'Retrieving neural logs...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 flex items-center justify-center text-brand-teal">
            <History size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-brand-text-main">{isRtl ? 'سجل الحركات' : 'Activity Logs'}</h2>
            <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'تتبع زمني لجميع تفاعلات النظام' : 'Timeline of all system interactions'}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Timeline Path */}
        <div className={`absolute top-0 bottom-0 ${isRtl ? 'right-10' : 'left-10'} w-1 bg-brand-border/30 rounded-full`} />

        <div className="space-y-6">
          {activities.length > 0 ? (
            activities.map((activity, idx) => (
              <motion.div
                key={`${activity.id || 'activity'}-${idx}`}
                initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="relative pl-20 pr-6 rtl:pl-6 rtl:pr-20"
              >
                {/* Visual Connector Dot */}
                <div className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-[2.1rem]' : 'left-[2.1rem]'} w-10 h-10 rounded-2xl ${getColor(activity.type)} border-4 border-white dark:border-slate-900 z-10 flex items-center justify-center shadow-lg transition-transform hover:scale-110`}>
                  {getIcon(activity.type)}
                </div>

                {/* Card Content */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-brand-border shadow-sm hover:shadow-xl hover:border-brand-primary/20 transition-all group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-black text-brand-text-main group-hover:text-brand-primary transition-colors">
                        {isRtl ? activity.descriptionAr : activity.descriptionEn}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-black uppercase px-3 py-1 bg-brand-surface rounded-lg text-brand-text-muted tracking-wider">
                          {activity.type.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-brand-text-muted">
                          <Clock size={10} />
                          {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-brand-text-muted">
                      {new Date(activity.createdAt).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-brand-surface/50 rounded-[3rem] border-2 border-dashed border-brand-border">
              <Activity className="mx-auto text-brand-text-muted mb-4 opacity-20" size={64} />
              <p className="text-brand-text-muted font-bold tracking-widest uppercase text-sm">
                {isRtl ? 'لا توجد حركات مسجلة بعد' : 'No movements logged yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {activities.length >= 20 && (
        <div className="text-center pt-8">
          <button className="px-8 py-3 bg-brand-surface border border-brand-border rounded-2xl font-black text-xs uppercase tracking-widest text-brand-text-muted hover:text-brand-primary hover:border-brand-primary transition-all flex items-center gap-2 mx-auto">
            <ChevronDown size={14} />
            {isRtl ? 'عرض المزيد من الحركات' : 'View more movements'}
          </button>
        </div>
      )}
    </div>
  );
};
