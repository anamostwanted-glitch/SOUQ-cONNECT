import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from 'lucide-react';
import { Notification } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { useAutoFlip } from '../../../../shared/hooks/useAutoFlip';

interface NotificationDropdownProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  notifications: Notification[];
  unreadCount: number;
  isRtl: boolean;
  onNotificationClick: (n: Notification) => void;
  notifRef: React.RefObject<HTMLDivElement>;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  setIsOpen,
  notifications,
  unreadCount,
  isRtl,
  onNotificationClick,
  notifRef
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useAutoFlip(notifRef, isOpen);

  return (
    <div className="relative" ref={notifRef}>
      <HapticButton 
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-9 h-9 items-center justify-center hover:bg-brand-surface rounded-full transition-all relative text-brand-text-muted hover:text-brand-primary border border-transparent hover:border-brand-border"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-error rounded-full border-2 border-brand-surface"></span>
        )}
      </HapticButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: position === 'bottom' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'bottom' ? 10 : -10, scale: 0.95 }}
            className={`absolute ${position === 'bottom' ? 'top-full mt-3' : 'bottom-full mb-3'} w-80 bg-brand-surface rounded-2xl shadow-2xl border border-brand-border overflow-hidden z-50 ${isRtl ? 'left-0' : 'right-0'}`}
          >
            <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-background/50">
              <h3 className="font-bold text-brand-text-main">{isRtl ? 'الإشعارات' : 'Notifications'}</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-lg uppercase tracking-wider">
                  {unreadCount} {isRtl ? 'جديد' : 'New'}
                </span>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => onNotificationClick(n)}
                    className={`p-4 border-b border-brand-border-light last:border-0 cursor-pointer transition-colors hover:bg-brand-background ${!n.read ? 'bg-brand-primary/5' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-brand-primary' : 'bg-transparent'}`} />
                      <div>
                        <p className="text-sm font-bold text-brand-text-main leading-tight mb-1">{isRtl ? n.titleAr : n.titleEn}</p>
                        <p className="text-xs text-brand-text-muted leading-relaxed">{isRtl ? n.bodyAr : n.bodyEn}</p>
                        <p className="text-[10px] text-brand-text-muted/60 mt-2 font-medium">
                          {new Date(n.createdAt).toLocaleDateString(isRtl ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-brand-background rounded-full flex items-center justify-center mx-auto mb-3 text-brand-text-muted/30">
                    <Bell size={24} />
                  </div>
                  <p className="text-sm text-brand-text-muted font-medium">{isRtl ? 'لا توجد إشعارات' : 'No notifications yet'}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
