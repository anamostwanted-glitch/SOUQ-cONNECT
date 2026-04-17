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
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
            />
            
            {/* Dropdown / Drawer Content */}
            <motion.div 
              initial={
                typeof window !== 'undefined' && window.innerWidth < 768 
                  ? { x: isRtl ? -300 : 300 } 
                  : { opacity: 0, y: position === 'bottom' ? 10 : -10, scale: 0.95 }
              }
              animate={
                typeof window !== 'undefined' && window.innerWidth < 768 
                  ? { x: 0 } 
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={
                typeof window !== 'undefined' && window.innerWidth < 768 
                  ? { x: isRtl ? -300 : 300 } 
                  : { opacity: 0, y: position === 'bottom' ? 10 : -10, scale: 0.95 }
              }
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`fixed md:absolute inset-y-0 ${isRtl ? 'left-0' : 'right-0'} md:inset-y-auto ${position === 'bottom' ? 'md:top-full md:mt-3' : 'md:bottom-full md:mb-3'} w-[85%] sm:w-80 md:w-96 bg-brand-surface rounded-l-3xl md:rounded-2xl shadow-2xl border-l md:border border-brand-border overflow-hidden z-[110] flex flex-col`}
            >
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-surface/50 backdrop-blur-xl">
                <div>
                  <h3 className="text-xl font-black text-brand-text-main tracking-tight">
                    {isRtl ? 'الإشعارات' : 'Notifications'}
                  </h3>
                  {unreadCount > 0 && (
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mt-1">
                      {unreadCount} {isRtl ? 'إشعارات جديدة' : 'New notifications'}
                    </p>
                  )}
                </div>
                <HapticButton 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-brand-background rounded-xl text-brand-text-muted transition-colors md:hidden"
                >
                  <Bell size={20} />
                </HapticButton>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <motion.div 
                      key={n.id} 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => {
                        onNotificationClick(n);
                        setIsOpen(false);
                      }}
                      className={`p-5 mx-2 my-1 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-brand-border group ${!n.read ? 'bg-brand-primary/5 hover:bg-brand-primary/10' : 'hover:bg-brand-background'}`}
                    >
                      <div className="flex gap-4">
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 shadow-sm ${!n.read ? 'bg-brand-primary animate-pulse' : 'bg-brand-text-muted/20'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-brand-text-main leading-tight mb-1.5 group-hover:text-brand-primary transition-colors">
                            {isRtl ? n.titleAr : n.titleEn}
                          </p>
                          <p className="text-xs text-brand-text-muted leading-relaxed line-clamp-2">
                            {isRtl ? n.bodyAr : n.bodyEn}
                          </p>
                          <div className="flex items-center gap-2 mt-3 text-[10px] text-brand-text-muted/50 font-bold uppercase tracking-widest">
                            <Bell size={10} />
                            <span>
                              {new Date(n.createdAt).toLocaleDateString(isRtl ? 'ar' : 'en', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                ...(typeof window !== 'undefined' && window.innerWidth < 768 ? { day: 'numeric', month: 'short' } : {})
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-brand-background rounded-3xl flex items-center justify-center mx-auto mb-4 text-brand-text-muted/20 border-2 border-dashed border-brand-border">
                      <Bell size={32} />
                    </div>
                    <p className="text-sm text-brand-text-muted font-black tracking-tight">
                      {isRtl ? 'صندوق الوارد فارغ' : 'Your inbox is clear'}
                    </p>
                    <p className="text-[10px] text-brand-text-muted/50 mt-1 uppercase font-bold tracking-widest">
                      {isRtl ? 'لا توجد إشعارات جديدة حالياً' : 'No new notifications right now'}
                    </p>
                  </div>
                )}
              </div>

              {notifications.length > 5 && (
                <div className="p-4 border-t border-brand-border bg-brand-background/30">
                  <HapticButton 
                    onClick={() => setIsOpen(false)}
                    className="w-full py-3 bg-brand-surface border border-brand-border rounded-xl text-xs font-black uppercase tracking-widest text-brand-text-main hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all"
                  >
                    {isRtl ? 'عرض كل الإشعارات' : 'View All Notifications'}
                  </HapticButton>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
