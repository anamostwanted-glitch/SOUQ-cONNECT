import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, 
  ShoppingBag, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { useTranslation } from 'react-i18next';

interface ActivityItem {
  id: string;
  type: 'user_joined' | 'request_created' | 'offer_made' | 'verification_approved' | 'system_alert';
  titleAr: string;
  titleEn: string;
  timestamp: string;
  details?: string;
}

export const AdminActivityFeed: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you might have a dedicated 'activities' collection
    // For this demo, we'll simulate it or listen to multiple collections
    // Here we'll just use a mock set that updates to show the UI
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'user_joined',
        titleAr: 'انضم مستخدم جديد: أحمد محمد',
        titleEn: 'New user joined: Ahmed Mohamed',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: '2',
        type: 'request_created',
        titleAr: 'طلب جديد: توريد مواد بناء',
        titleEn: 'New request: Construction materials supply',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: '3',
        type: 'verification_approved',
        titleAr: 'تم توثيق مورد: شركة النور',
        titleEn: 'Supplier verified: Al Noor Co.',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: '4',
        type: 'system_alert',
        titleAr: 'تنبيه: ضغط عالي على قسم التكنولوجيا',
        titleEn: 'Alert: High demand in Tech category',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      }
    ];

    setActivities(mockActivities);
    setLoading(false);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'user_joined': return <UserPlus size={16} className="text-blue-500" />;
      case 'request_created': return <ShoppingBag size={16} className="text-emerald-500" />;
      case 'offer_made': return <MessageSquare size={16} className="text-purple-500" />;
      case 'verification_approved': return <CheckCircle2 size={16} className="text-brand-primary" />;
      case 'system_alert': return <AlertCircle size={16} className="text-amber-500" />;
      default: return <Clock size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-black text-brand-text-main flex items-center gap-2">
          <Clock size={20} className="text-brand-primary" />
          {isRtl ? 'النشاط المباشر' : 'Live Activity'}
        </h3>
        <button className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline flex items-center gap-1">
          {isRtl ? 'عرض الكل' : 'View All'}
          <ArrowRight size={12} className={isRtl ? 'rotate-180' : ''} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {activities.map((activity, i) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-4 p-3 rounded-2xl hover:bg-brand-background transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-background border border-brand-border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-brand-text-main leading-tight mb-1">
                  {isRtl ? activity.titleAr : activity.titleEn}
                </p>
                <span className="text-[10px] font-medium text-brand-text-muted">
                  {new Date(activity.timestamp).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
