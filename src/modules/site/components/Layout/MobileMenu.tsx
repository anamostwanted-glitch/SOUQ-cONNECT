import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X as CloseIcon, Building2, Home as HomeIcon, LayoutDashboard, Megaphone, ShoppingBag, User, Sun, Moon, Globe, LogOut, Bot, ArrowRight } from 'lucide-react';
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
  supplierTab: string;
  setSupplierTab?: (tab: any) => void;
  isRtl: boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  toggleLanguage: () => void;
  siteLogo: string;
  siteName: string;
  onPrefetch?: (view: string) => void;
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
  supplierTab,
  setSupplierTab,
  isRtl,
  isDarkMode,
  toggleDarkMode,
  toggleLanguage,
  siteLogo,
  siteName,
  onPrefetch
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
            className={`fixed inset-y-0 w-[85%] sm:w-[380px] bg-white/80 dark:bg-black/80 backdrop-blur-[50px] shadow-2xl z-[70] border-r border-white/30 dark:border-white/10 ${isRtl ? 'right-0' : 'left-0'} safe-top safe-bottom`}
          >
            <div className="flex flex-col h-full relative overflow-hidden">
              {/* Premium Gradient Overlays */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-primary/5 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-brand-teal/5 to-transparent pointer-events-none" />

              <div className="p-6 flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <div className="absolute -inset-1.5 bg-gradient-to-tr from-brand-primary/30 to-brand-teal/30 rounded-xl blur-md opacity-50" />
                      {siteLogo ? (
                        <img src={siteLogo} alt="Logo" className="h-10 w-auto relative object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="p-2.5 bg-brand-primary rounded-xl text-white relative shadow-lg shadow-brand-primary/20">
                          <Building2 size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-brand-text-main text-lg tracking-tight leading-none">{siteName || 'B2B Connect'}</span>
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

                <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1">
                  {[
                    { id: 'home', label: t('home'), icon: HomeIcon, view: 'home' },
                    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, view: 'dashboard', tab: 'dashboard' },
                    { id: 'marketing', label: isRtl ? 'التسويق والنمو' : 'Marketing & Growth', icon: Megaphone, view: 'dashboard', tab: 'marketing', condition: profile && viewMode !== 'admin' },
                    { id: 'marketplace', label: t('marketplace'), icon: ShoppingBag, view: 'marketplace', condition: features.marketplace },
                    { id: 'profile', label: t('profile'), icon: User, view: 'profile' },
                  ].map((item) => {
                    if (item.condition === false) return null;
                    const isActive = currentView === item.view && (!item.tab || supplierTab === item.tab);
                    
                    return (
                      <HapticButton 
                        key={item.id}
                        onClick={() => { 
                          setView(item.view); 
                          if (item.tab) setSupplierTab?.(item.tab);
                          setIsOpen(false); 
                        }}
                        onPrefetch={() => onPrefetch?.(item.view)}
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
                    className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-brand-primary/10 to-brand-teal/10 border border-brand-primary/20 rounded-2xl group overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-brand-teal/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm relative z-10">
                      <Bot size={20} className="text-brand-primary" />
                    </div>
                    <div className="flex flex-col items-start relative z-10">
                      <span className="text-sm font-black text-brand-text-main">{isRtl ? 'المساعد الذكي' : 'Smart Assistant'}</span>
                      <span className="text-[10px] font-bold text-brand-text-muted">{isRtl ? 'اطلب أي شيء الآن' : 'Ask anything now'}</span>
                    </div>
                    <ArrowRight size={16} className={`ml-auto text-brand-primary transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180' : ''}`} />
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
