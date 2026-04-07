import React from 'react';
import { motion } from 'motion/react';
import { Home as HomeIcon, Bot, LayoutDashboard, ShoppingBag, MessageSquare, Bell, Sparkles, Store, Compass, LayoutGrid } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { useTranslation } from 'react-i18next';
import { ScrollDirection } from '../../../../shared/hooks/useScrollDirection';

interface BottomNavProps {
  currentView: string;
  setView: (view: any) => void;
  supplierTab: string;
  setSupplierTab?: (tab: any) => void;
  isRtl: boolean;
  unreadCount: number;
  scrollDirection: ScrollDirection;
  onVisualSearch: () => void;
  onToggleNotifications: () => void;
  showNotifications: boolean;
  onPrefetch?: (view: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  setView,
  supplierTab,
  setSupplierTab,
  isRtl,
  unreadCount,
  scrollDirection,
  onVisualSearch,
  onToggleNotifications,
  showNotifications,
  onPrefetch
}) => {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ 
        y: 0,
        opacity: 1,
        scale: 1
      }}
      transition={{ 
        duration: 0.4, 
        ease: [0.23, 1, 0.32, 1]
      }}
      className="fixed bottom-[calc(1rem+var(--sab))] left-4 right-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-[40px] border border-white/40 dark:border-gray-800/50 rounded-[2rem] px-2 py-2 flex items-center justify-between md:hidden z-50 shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
    >
      <HapticButton 
        onClick={() => setView('home')}
        onPrefetch={() => onPrefetch?.('home')}
        className={`flex-1 flex flex-col items-center gap-1 p-2 transition-all relative ${currentView === 'home' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
      >
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <HomeIcon size={20} strokeWidth={currentView === 'home' ? 2.5 : 2} />
        </motion.div>
        <span className="text-[9px] font-black tracking-tight uppercase">{t('home')}</span>
      </HapticButton>

      <HapticButton 
        onClick={onVisualSearch}
        className="flex flex-col items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-primary via-brand-primary to-brand-teal text-white rounded-[1.5rem] shadow-2xl shadow-brand-primary/40 -mt-12 scale-110 border-[4px] border-white dark:border-gray-900 transition-all duration-300 active:scale-95 relative overflow-hidden group"
      >
        {/* Animated Background Glow */}
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 bg-white/30 blur-xl"
        />
        
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="relative"
          >
            <Bot size={24} className="relative z-10" />
            <Sparkles size={12} className="absolute -top-1 -right-2 text-white/80 animate-pulse" />
          </motion.div>
          <span className="text-[7px] font-black tracking-widest uppercase mt-0.5">AI</span>
        </div>
      </HapticButton>

      <HapticButton 
        onClick={() => { setView('dashboard'); setSupplierTab?.('dashboard'); }}
        onPrefetch={() => onPrefetch?.('dashboard')}
        className={`flex-1 flex flex-col items-center gap-1 p-2 transition-all relative ${currentView === 'dashboard' && supplierTab === 'dashboard' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
      >
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <LayoutGrid size={20} strokeWidth={currentView === 'dashboard' && supplierTab === 'dashboard' ? 2.5 : 2} />
        </motion.div>
        <span className="text-[9px] font-black tracking-tight uppercase">{isRtl ? 'المركز' : 'Nexus'}</span>
      </HapticButton>

      <HapticButton 
        onClick={() => setView('chat')}
        onPrefetch={() => onPrefetch?.('chat')}
        className={`flex-1 flex flex-col items-center gap-1 p-2 transition-all relative ${currentView === 'chat' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
      >
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="relative">
          <MessageSquare size={20} strokeWidth={currentView === 'chat' ? 2.5 : 2} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-error text-white text-[7px] font-black flex items-center justify-center rounded-full border border-white dark:border-gray-900">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </motion.div>
        <span className="text-[9px] font-black tracking-tight uppercase">{t('messages')}</span>
      </HapticButton>
    </motion.div>
  );
};
