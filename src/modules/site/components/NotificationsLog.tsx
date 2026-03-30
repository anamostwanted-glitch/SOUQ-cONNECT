import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Notification } from '../../../core/types';
import { db, auth } from '../../../core/firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { NotificationModal } from '../../../shared/components/NotificationModal';
import { ArrowLeft, ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Skeleton } from '../../../shared/components/Skeleton';

interface NotificationsLogProps {
  onBack: () => void;
}

export const NotificationsLog: React.FC<NotificationsLogProps> = ({ onBack }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    await markAsRead(n.id);
    setSelectedNotification(n);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-brand-text-muted hover:text-brand-primary transition-colors">
          {isRtl ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
          {isRtl ? 'عودة' : 'Back'}
        </button>
        {notifications.some(n => !n.read) && (
          <button onClick={markAllAsRead} className="flex items-center gap-2 text-sm font-bold text-brand-primary hover:text-brand-primary-hover transition-colors">
            <CheckCheck size={18} />
            {isRtl ? 'تحديد الكل كمقروء' : 'Mark all as read'}
          </button>
        )}
      </div>

      <h1 className="text-2xl font-extrabold text-brand-text-main mb-8">{isRtl ? 'سجل الإشعارات' : 'Notifications Log'}</h1>

      <div className="space-y-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-5 rounded-2xl border border-brand-border bg-white flex gap-4">
              <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="w-1/2 h-4" />
                <Skeleton className="w-full h-3" />
              </div>
            </div>
          ))
        ) : notifications.length > 0 ? (
          notifications.map(n => (
            <motion.div 
              key={n.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleNotificationClick(n)}
              className={`p-5 rounded-2xl border border-brand-border cursor-pointer transition-all hover:bg-brand-surface ${!n.read ? 'bg-brand-primary/5 border-brand-primary/20' : 'bg-white'}`}
            >
              <div className="flex gap-4">
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-brand-primary' : 'bg-transparent'}`} />
                {n.imageUrl && (
                  <img src={n.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" referrerPolicy="no-referrer" />
                )}
                <div>
                  <p className="text-base font-bold text-brand-text-main leading-tight mb-1">{isRtl ? n.titleAr : n.titleEn}</p>
                  <p className="text-sm text-brand-text-muted leading-relaxed">{isRtl ? n.bodyAr : n.bodyEn}</p>
                  <p className="text-[11px] text-brand-text-muted/60 mt-3 font-medium">
                    {new Date(n.createdAt).toLocaleDateString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20">
            <Bell size={48} className="mx-auto text-brand-text-muted/30 mb-4" />
            <p className="text-brand-text-muted font-medium">{isRtl ? 'لا توجد إشعارات قديمة' : 'No old notifications'}</p>
          </div>
        )}
      </div>

      {selectedNotification && (
        <NotificationModal 
          notification={selectedNotification} 
          onClose={() => setSelectedNotification(null)} 
          isRtl={isRtl}
        />
      )}
    </div>
  );
};
