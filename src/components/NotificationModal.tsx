import React from 'react';
import { motion } from 'motion/react';
import { Notification } from '../types';
import { useTranslation } from 'react-i18next';

interface NotificationModalProps {
  notification: Notification;
  onClose: () => void;
  isRtl: boolean;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ notification, onClose, isRtl }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-brand-surface rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-brand-border"
      >
        <h3 className="font-bold text-lg mb-4 text-brand-text-main">{isRtl ? notification.titleAr : notification.titleEn}</h3>
        {notification.imageUrl && (
          <img src={notification.imageUrl} alt="Notification" className="w-full rounded-lg mb-4" referrerPolicy="no-referrer" />
        )}
        <p className="text-brand-text-muted mb-6">{isRtl ? notification.bodyAr : notification.bodyEn}</p>
        <button 
          onClick={onClose}
          className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-all"
        >
          {isRtl ? 'إغلاق' : 'Close'}
        </button>
      </motion.div>
    </div>
  );
};
