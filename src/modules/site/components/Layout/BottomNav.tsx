import React from 'react';
import { motion } from 'motion/react';
import { Home as HomeIcon, Bot, LayoutDashboard, ShoppingBag, MessageSquare, Bell, Sparkles, Store, Compass, LayoutGrid } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { useTranslation } from 'react-i18next';
import { ScrollDirection } from '../../../../shared/hooks/useScrollDirection';

interface BottomNavProps {
  currentView: string;
  setView: (view: any) => void;
  dashboardTab: string;
  setDashboardTab?: (tab: any) => void;
  isRtl: boolean;
  unreadCount: number;
  scrollDirection: ScrollDirection;
  onVisualSearch: () => void;
  onMobileMenuOpen: () => void;
  onToggleNotifications: () => void;
  showNotifications: boolean;
  onPrefetch?: (view: string) => void;
  viewMode: 'customer' | 'supplier' | 'admin';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  setView,
  dashboardTab,
  setDashboardTab,
  isRtl,
  unreadCount,
  scrollDirection,
  onVisualSearch,
  onMobileMenuOpen,
  onToggleNotifications,
  showNotifications,
  onPrefetch,
  viewMode
}) => {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ 
        y: scrollDirection === 'down' ? 100 : 0,
        opacity: scrollDirection === 'down' ? 0 : 1,
        scale: scrollDirection === 'down' ? 0.95 : 1
      }}
      transition={{ 
        duration: 0.4, 
        ease: [0.23, 1, 0.32, 1]
      }}
      className="fixed bottom-[calc(1rem+var(--sab))] left-4 right-4 bg-white/80 dark:bg-gray-900/90 backdrop-blur-[40px] border border-white/40 dark:border-gray-800/50 rounded-[2.5rem] px-2 py-2 flex items-center justify-between md:hidden z-50 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/5"
    >
      <HapticButton 
        onClick={() => setView('home')}
        onPrefetch={() => onPrefetch?.('home')}
        className={`flex-1 flex flex-col items-center gap-1.5 p-2 transition-all relative ${currentView === 'home' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
      >
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <HomeIcon size={20} strokeWidth={currentView === 'home' ? 2.5 : 2} />
        </motion.div>
        <span className="text-[9px] font-black tracking-tighter uppercase">{t('home')}</span>
      </HapticButton>

      {viewMode === 'supplier' ? (
        <HapticButton 
          onClick={() => { setView('dashboard'); setDashboardTab?.('overview'); }}
          onPrefetch={() => onPrefetch?.('dashboard')}
          className={`flex-1 flex flex-col items-center gap-1.5 p-2 transition-all relative ${currentView === 'dashboard' && (dashboardTab === 'overview' || dashboardTab === 'requests') ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
        >
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <LayoutDashboard size={20} strokeWidth={currentView === 'dashboard' ? 2.5 : 2} />
          </motion.div>
          <span className="text-[9px] font-black tracking-tighter uppercase">{isRtl ? 'الأعمال' : 'Business'}</span>
        </HapticButton>
      ) : (
        <HapticButton 
          onClick={() => setView('marketplace')}
          onPrefetch={() => onPrefetch?.('marketplace')}
          className={`flex-1 flex flex-col items-center gap-1.5 p-2 transition-all relative ${currentView === 'marketplace' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
        >
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <ShoppingBag size={20} strokeWidth={currentView === 'marketplace' ? 2.5 : 2} />
          </motion.div>
          <span className="text-[9px] font-black tracking-tighter uppercase">{isRtl ? 'السوق' : 'Market'}</span>
        </HapticButton>
      )}

      {/* Primary Action Button (Diamond AI) */}
      <div className="relative -mt-10 px-2">
        <HapticButton 
          onClick={onVisualSearch}
          className="flex flex-col items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-primary via-brand-primary to-brand-teal text-white rounded-[1.75rem] shadow-2xl shadow-brand-primary/40 scale-110 border-[6px] border-white dark:border-gray-900 transition-all duration-300 active:scale-95 relative overflow-hidden group"
        >
          {/* Animated Background Glow */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-white/30 blur-xl"
          />
          
          <div className="relative z-10 flex flex-col items-center">
            <motion.div whileHover={{ rotate: 15, scale: 1.1 }}>
              <Bot size={26} />
              <Sparkles size={14} className="absolute -top-1.5 -right-2 text-white animate-pulse" />
            </motion.div>
          </div>
        </HapticButton>
      </div>

      <HapticButton 
        onClick={() => setView('chat')}
        onPrefetch={() => onPrefetch?.('chat')}
        className={`flex-1 flex flex-col items-center gap-1.5 p-2 transition-all relative ${currentView === 'chat' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
      >
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="relative">
          <MessageSquare size={20} strokeWidth={currentView === 'chat' ? 2.5 : 2} />
          {unreadCount > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-error text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900 shadow-sm"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </motion.div>
        <span className="text-[9px] font-black tracking-tighter uppercase">{isRtl ? 'المحادثات' : 'Chats'}</span>
      </HapticButton>

      <HapticButton 
        onClick={onMobileMenuOpen}
        onPrefetch={() => onPrefetch?.('dashboard')}
        className={`flex-1 flex flex-col items-center gap-1.5 p-2 transition-all relative ${currentView === 'dashboard' && dashboardTab !== 'overview' && dashboardTab !== 'requests' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
      >
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <LayoutGrid size={20} strokeWidth={(currentView === 'dashboard' && dashboardTab !== 'overview' && dashboardTab !== 'requests') ? 2.5 : 2} />
        </motion.div>
        <span className="text-[9px] font-black tracking-tighter uppercase">{isRtl ? 'المزيد' : 'Menu'}</span>
      </HapticButton>
    </motion.div>
  );
};
