import React from 'react';
import { motion } from 'motion/react';
import { Notification } from '../../core/types';
import { useTranslation } from 'react-i18next';

interface NotificationModalProps {
  notification: Notification;
  onClose: () => void;
  isRtl: boolean;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ notification, onClose, isRtl }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-text-main/60 p-4 backdrop-blur-xl safe-top safe-bottom">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-brand-surface rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-brand-border overflow-hidden"
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
