import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  MessageSquare, 
  ShoppingBag, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Clock,
  Trash2,
  Target,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { HapticButton } from '../../../shared/components/HapticButton';
import { Notification } from '../../../core/types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (link: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, onNavigate }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser || !isOpen) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched: Notification[] = [];
      snap.forEach(doc => fetched.push({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const markAllAsRead = async () => {
    if (!auth.currentUser) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read && notif.id) {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    }
    if (notif.link) {
      onNavigate(notif.link);
      onClose();
    }
  };

  const getIcon = (link?: string) => {
    const safeLink = (typeof link === 'string') ? link : '';
    if (safeLink.includes('chat')) return <MessageSquare size={18} />;
    if (safeLink.includes('request')) return <ShoppingBag size={18} />;
    if (safeLink.includes('requestId')) return <Target size={18} />;
    if (safeLink.includes('offer')) return <Zap size={18} />;
    return <Info size={18} />;
  };

  const getColor = (link?: string) => {
    const safeLink = (typeof link === 'string') ? link : '';
    if (safeLink.includes('chat')) return 'text-brand-primary bg-brand-primary/10';
    if (safeLink.includes('requestId')) return 'text-brand-primary bg-brand-primary/10 animate-pulse';
    if (safeLink.includes('request')) return 'text-brand-teal bg-brand-teal/10';
    if (safeLink.includes('offer')) return 'text-brand-warning bg-brand-warning/10';
    return 'text-brand-text-muted bg-brand-background';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: isRtl ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRtl ? '-100%' : '100%' }}
            className={`fixed top-0 bottom-0 ${isRtl ? 'left-0' : 'right-0'} w-full sm:w-[480px] bg-brand-background z-[101] shadow-2xl flex flex-col border-l border-brand-border`}
          >
            {/* Header */}
            <div className="p-8 border-b border-brand-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Bell size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-brand-text-main">{isRtl ? 'الإشعارات الذكية' : 'Smart Notifications'}</h2>
                  <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'مركز التنبيهات العصبية' : 'Neural Alert Hub'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <HapticButton onClick={markAllAsRead} className="text-[10px] font-black text-brand-primary hover:bg-brand-primary/5 px-4 py-2 rounded-xl transition-all">
                  {isRtl ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                </HapticButton>
                <button onClick={onClose} className="p-3 hover:bg-brand-surface rounded-2xl text-brand-text-muted transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
                  <p className="text-sm font-bold text-brand-text-muted">{isRtl ? 'جاري المزامنة...' : 'Syncing...'}</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notif, idx) => {
                  if (!notif) return null;
                  const itemKey = `notif-${notif.id || idx}-${idx}`;
                  
                  return (
                    <motion.div
                      key={itemKey}
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-5 rounded-3xl border-2 cursor-pointer group transition-all relative ${
                        notif.read 
                          ? 'bg-brand-surface/50 border-transparent grayscale-[0.3]' 
                          : 'bg-white dark:bg-slate-900 border-brand-primary/20 shadow-lg shadow-brand-primary/5'
                      }`}
                    >
                      {!notif.read && (
                        <div className="absolute top-5 right-5 w-3 h-3 bg-brand-primary rounded-full animate-pulse shadow-lg shadow-brand-primary/50" />
                      )}
                      
                      <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${getColor(notif.link)}`}>
                          {getIcon(notif.link)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className={`font-black text-sm ${notif.read ? 'text-brand-text-main' : 'text-brand-primary'}`}>
                            {isRtl ? notif.titleAr : notif.titleEn}
                          </h3>
                          <p className="text-xs font-medium text-brand-text-muted leading-relaxed">
                            {isRtl ? notif.bodyAr : notif.bodyEn}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            {notif.matchScore && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[9px] font-black uppercase tracking-wider">
                                <Target size={10} />
                                {notif.matchScore}% {isRtl ? 'مطابقة' : 'Match'}
                              </div>
                            )}
                            {notif.isUrgent && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                <AlertCircle size={10} />
                                {isRtl ? 'عاجل' : 'Urgent'}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-[10px] font-bold text-brand-text-muted uppercase">
                              <Clock size={10} />
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-all self-center text-brand-primary">
                          <ArrowRight size={20} className={isRtl ? 'rotate-180' : ''} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                  <div className="w-20 h-20 bg-brand-primary/5 rounded-[2rem] flex items-center justify-center text-brand-primary/30 mb-6">
                    <Bell size={40} />
                  </div>
                  <h3 className="text-lg font-black text-brand-text-main mb-2">{isRtl ? 'لا توجد إشعارات' : 'No Notifications'}</h3>
                  <p className="text-sm text-brand-text-muted font-medium">{isRtl ? 'أنت على اطلاع دائم بكل شيء!' : "You're all caught up with everything!"}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-brand-border bg-brand-surface group">
              <HapticButton className="w-full py-4 bg-brand-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                <CheckCircle2 size={18} />
                {isRtl ? 'تخصيص مركز التنبيهات' : 'Customize Neural Hub'}
              </HapticButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
