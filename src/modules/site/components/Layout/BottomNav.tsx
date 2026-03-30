import React from 'react';
import { motion } from 'motion/react';
import { Home as HomeIcon, Sparkles, LayoutDashboard, ShoppingBag, User, Bell } from 'lucide-react';
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
        y: scrollDirection === ScrollDirection.DOWN ? 120 : 0,
        opacity: scrollDirection === ScrollDirection.DOWN ? 0 : 1
      }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="fixed bottom-[calc(1.5rem+var(--sab))] left-4 right-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-[40px] border border-white/40 dark:border-gray-800/50 rounded-[2rem] px-2 py-2 flex items-center justify-between md:hidden z-50 shadow-[0_15px_40px_rgba(0,0,0,0.2)]"
    >
      <HapticButton 
        onClick={() => setView('home')}
        onPrefetch={() => onPrefetch?.('home')}
        className={`flex-1 flex flex-col items-center gap-1 p-2 transition-all relative ${currentView === 'home' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
      >
        <HomeIcon size={20} strokeWidth={currentView === 'home' ? 2.5 : 2} />
        <span className="text-[9px] font-black tracking-tight uppercase">{t('home')}</span>
      </HapticButton>

      <HapticButton 
        onClick={() => { setView('dashboard'); setSupplierTab?.('dashboard'); }}
        onPrefetch={() => onPrefetch?.('dashboard')}
        className={`flex-1 flex flex-col items-center gap-1 p-2 transition-all relative ${currentView === 'dashboard' && supplierTab === 'dashboard' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
      >
        <LayoutDashboard size={20} strokeWidth={currentView === 'dashboard' && supplierTab === 'dashboard' ? 2.5 : 2} />
        <span className="text-[9px] font-black tracking-tight uppercase">{t('dashboard')}</span>
      </HapticButton>

      <HapticButton 
        onClick={onVisualSearch}
        className="flex flex-col items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-primary via-brand-primary to-brand-teal text-white rounded-2xl shadow-xl shadow-brand-primary/30 -mt-10 scale-110 border-[4px] border-white dark:border-gray-900 transition-transform active:scale-95 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles size={24} className="relative z-10" />
      </HapticButton>

      <HapticButton 
        onClick={() => setView('marketplace')}
        onPrefetch={() => onPrefetch?.('marketplace')}
        className={`flex-1 flex flex-col items-center gap-1 p-2 transition-all relative ${currentView === 'marketplace' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
      >
        <ShoppingBag size={20} strokeWidth={currentView === 'marketplace' ? 2.5 : 2} />
        <span className="text-[9px] font-black tracking-tight uppercase">{t('marketplace')}</span>
      </HapticButton>

      <HapticButton 
        onClick={() => setView('profile')}
        onPrefetch={() => onPrefetch?.('profile')}
        className={`flex-1 flex flex-col items-center gap-1 p-2 transition-all relative ${currentView === 'profile' ? 'text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
      >
        <User size={20} strokeWidth={currentView === 'profile' ? 2.5 : 2} />
        <span className="text-[9px] font-black tracking-tight uppercase">{t('profile')}</span>
      </HapticButton>
    </motion.div>
  );
};
