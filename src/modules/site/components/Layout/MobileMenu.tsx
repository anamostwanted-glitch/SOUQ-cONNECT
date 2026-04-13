import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X as CloseIcon, Building2, Home as HomeIcon, LayoutDashboard, Megaphone, ShoppingBag, User, Sun, Moon, Globe, LogOut, Bot, ArrowRight, Sparkles, MessageSquare, BookOpen, Zap, LayoutGrid } from 'lucide-react';
import { UserProfile, AppFeatures } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { signOut } from 'firebase/auth';
import { auth } from '../../../../core/firebase';
import { useTranslation } from 'react-i18next';

interface MobileMenuProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  profile: UserProfile | null;
  features: AppFeatures;
  currentView: string;
  setView: (view: any) => void;
  viewMode: string;
  setViewMode: (mode: any) => void;
  dashboardTab: string;
  setDashboardTab?: (tab: any) => void;
  isRtl: boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  toggleLanguage: () => void;
  siteLogo: string;
  siteName: string;
  logoScale?: number;
  onPrefetch?: (view: string) => void;
  onVisualSearch?: () => void;
  onOpenHelpCenter?: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  setIsOpen,
  profile,
  features,
  currentView,
  setView,
  viewMode,
  setViewMode,
  dashboardTab,
  setDashboardTab,
  isRtl,
  isDarkMode,
  toggleDarkMode,
  toggleLanguage,
  siteLogo,
  siteName,
  logoScale = 1,
  onPrefetch,
  onVisualSearch,
  onOpenHelpCenter
}) => {
  const { t, i18n } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-brand-text-main/40 backdrop-blur-md z-[60] md:hidden"
          />
          <motion.div 
            initial={{ x: isRtl ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: isRtl ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 150 }}
            className={`fixed inset-y-0 w-[85%] sm:w-[400px] bg-white/90 dark:bg-black/90 backdrop-blur-[50px] shadow-2xl z-[70] border-r border-white/30 dark:border-white/10 ${isRtl ? 'right-0' : 'left-0'} safe-top safe-bottom`}
          >
            <div className="flex flex-col h-full relative overflow-hidden">
              {/* Premium Gradient Overlays */}
              <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-brand-primary/10 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-brand-teal/10 to-transparent pointer-events-none" />

              <div className="p-6 flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <div className="relative z-10">
                        {siteLogo ? (
                          <img 
                            src={siteLogo} 
                            alt="Logo" 
                            className="h-10 w-auto relative object-contain drop-shadow-sm" 
                            style={{ transform: `scale(${logoScale})` }}
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <div className="p-2.5 bg-brand-primary rounded-xl text-white relative shadow-lg shadow-brand-primary/20">
                            <Building2 size={20} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-brand-text-main text-lg tracking-tight leading-none">{siteName || 'Souq Connect'}</span>
                      <span className="text-[9px] font-bold text-brand-primary uppercase tracking-[0.2em] mt-1">Executive Suite</span>
                    </div>
                  </div>
                  <HapticButton 
                    onClick={() => setIsOpen(false)} 
                    className="w-10 h-10 flex items-center justify-center bg-brand-background/40 hover:bg-brand-background rounded-xl text-brand-text-muted transition-all border border-brand-border/30"
                  >
                    <CloseIcon size={20} />
                  </HapticButton>
                </div>

                {/* Profile Header Section */}
                {profile && (
                  <div className="mb-8 p-6 bg-white/40 dark:bg-white/5 rounded-[2.5rem] border border-white/40 dark:border-white/10 backdrop-blur-xl shadow-xl shadow-black/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-gray-800 shadow-lg">
                          {profile.photoURL ? (
                            <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                              <User size={28} />
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-success rounded-full border-2 border-white dark:border-gray-900 shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-brand-text-main text-lg truncate tracking-tight">{profile.name}</h3>
                        <p className="text-xs text-brand-text-muted truncate font-medium">{profile.email}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-md text-[9px] font-black uppercase tracking-wider">
                          <Sparkles size={10} />
                          {profile.role}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1">
                  {[
                    { id: 'home', label: t('home'), icon: HomeIcon, view: 'home' },
                    { id: 'dashboard', label: isRtl ? 'مركز كونكت' : 'Connect Center', icon: LayoutGrid, view: 'dashboard', tab: 'dashboard' },
                    { id: 'connect', label: isRtl ? 'مكافآت كونكت' : 'Connect Rewards', icon: Zap, view: 'connect' },
                    { id: 'marketing', label: isRtl ? 'التسويق والنمو' : 'Marketing & Growth', icon: Megaphone, view: 'dashboard', tab: 'marketing', condition: profile && viewMode !== 'admin' },
                    {id: 'help', label: isRtl ? 'مركز المساعدة' : 'Help Center', icon: BookOpen, action: onOpenHelpCenter},
                  ].map((item) => {
                    if (item.condition === false) return null;
                    const isActive = item.view && currentView === item.view && (!item.tab || dashboardTab === item.tab);
                    
                    return (
                      <HapticButton 
                        key={item.id}
                        onClick={() => { 
                          if (item.action) {
                            item.action();
                          } else if (item.view) {
                            setView(item.view); 
                            if (item.tab) setDashboardTab?.(item.tab);
                          }
                          setIsOpen(false); 
                        }}
                        onPrefetch={() => item.view && onPrefetch?.(item.view)}
                        className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                          isActive 
                            ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                            : 'text-brand-text-muted hover:bg-brand-background/50 hover:text-brand-text-main'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            isActive ? 'bg-white/20' : 'bg-brand-background/50 group-hover:bg-brand-primary/10 group-hover:text-brand-primary'
                          }`}>
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                          </div>
                          <span className={`text-base font-bold tracking-tight ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'} transition-transform`}>
                            {item.label}
                          </span>
                        </div>
                        {isActive && (
                          <motion.div 
                            layoutId="active-indicator"
                            className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                          />
                        )}
                      </HapticButton>
                    );
                  })}
                </nav>

                <div className="mt-auto pt-6 border-t border-brand-border/30 space-y-4">
                  {profile?.role === 'admin' && (
                    <div className="bg-brand-background/40 rounded-2xl p-4 border border-brand-border/30">
                      <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-3">{isRtl ? 'تبديل الواجهة' : 'Switch View'}</p>
                      <div className="flex flex-col gap-2">
                        {viewMode !== 'admin' && (
                          <HapticButton 
                            onClick={() => { setViewMode('admin'); setIsOpen(false); setView('home'); }}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-brand-text-main hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
                          >
                            {isRtl ? 'العودة للوحة الإدارة' : 'Back to Admin'}
                          </HapticButton>
                        )}
                        {viewMode !== 'supplier' && (
                          <HapticButton 
                            onClick={() => { setViewMode('supplier'); setIsOpen(false); setView('home'); }}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-brand-text-main hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
                          >
                            {isRtl ? 'عرض كـ مورد' : 'View as Supplier'}
                          </HapticButton>
                        )}
                        {viewMode !== 'customer' && (
                          <HapticButton 
                            onClick={() => { setViewMode('customer'); setIsOpen(false); setView('home'); }}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-brand-text-main hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
                          >
                            {isRtl ? 'عرض كـ عميل' : 'View as Customer'}
                          </HapticButton>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Quick Action */}
                  <HapticButton
                    onClick={() => {
                      onVisualSearch?.();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-4 p-5 bg-gradient-to-br from-brand-primary via-brand-primary to-brand-teal text-white rounded-3xl group overflow-hidden relative shadow-xl shadow-brand-primary/20 border border-white/20"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Animated Glow */}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute -right-4 -top-4 w-24 h-24 bg-white/30 blur-2xl rounded-full"
                    />

                    <div className="relative w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30">
                      <Bot size={24} className="text-white" />
                      <Sparkles size={12} className="absolute -top-1 -right-1 text-white animate-pulse" />
                    </div>
                    
                    <div className="flex-1 text-left relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black uppercase tracking-widest">{isRtl ? 'المساعد الذكي' : 'AI Hub'}</span>
                        <div className="px-1.5 py-0.5 bg-white/20 rounded-md text-[8px] font-bold uppercase tracking-tighter backdrop-blur-sm">PRO</div>
                      </div>
                      <p className="text-[10px] text-white/70 font-medium mt-0.5">
                        {isRtl ? 'البحث البصري والتحليل الذكي' : 'Visual Search & Smart Analysis'}
                      </p>
                    </div>

                    <ArrowRight size={20} className={`text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all ${isRtl ? 'rotate-180' : ''}`} />
                  </HapticButton>

                  <div className="flex items-center gap-3">
                    <HapticButton 
                      onClick={toggleLanguage}
                      className="flex-1 flex items-center justify-center gap-2 p-3.5 bg-brand-background/40 hover:bg-brand-background rounded-xl text-brand-text-muted hover:text-brand-primary transition-all border border-brand-border/30 font-bold text-sm"
                    >
                      <Globe size={18} />
                      {isRtl ? 'English' : 'العربية'}
                    </HapticButton>
                    <HapticButton 
                      onClick={toggleDarkMode}
                      className="w-12 h-12 flex items-center justify-center bg-brand-background/40 hover:bg-brand-background rounded-xl text-brand-text-muted transition-all border border-brand-border/30"
                    >
                      {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </HapticButton>
                  </div>

                  {profile ? (
                    <HapticButton 
                      onClick={async () => {
                        await signOut(auth);
                        setIsOpen(false);
                        setView('home');
                      }}
                      className="w-full flex items-center justify-center gap-3 p-5 bg-brand-error/5 hover:bg-brand-error/10 text-brand-error rounded-[2rem] transition-all border border-brand-error/10 font-black"
                    >
                      <LogOut size={22} />
                      {t('logout')}
                    </HapticButton>
                  ) : (
                    <HapticButton 
                      onClick={() => { setView('role-selection'); setIsOpen(false); }}
                      className="w-full flex items-center justify-center gap-3 p-5 bg-brand-primary text-white rounded-[2rem] transition-all shadow-xl shadow-brand-primary/20 font-black"
                    >
                      <User size={22} />
                      {t('login')}
                    </HapticButton>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
