import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings, 
  Bell, 
  LogOut, 
  Shield, 
  LayoutDashboard, 
  ShoppingBag, 
  ChevronRight,
  CreditCard,
  Bookmark,
  History
} from 'lucide-react';
import { UserProfile } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { signOut } from 'firebase/auth';
import { auth } from '../../../../core/firebase';
import { useTranslation } from 'react-i18next';
import { useAutoFlip } from '../../../../shared/hooks/useAutoFlip';

interface ProfileMenuProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  profile: UserProfile;
  isRtl: boolean;
  setView: (view: any) => void;
  viewMode: 'admin' | 'supplier' | 'customer';
  setViewMode: (mode: 'admin' | 'supplier' | 'customer') => void;
  uiStyle: 'classic' | 'minimal';
  setUiStyle: (style: 'classic' | 'minimal') => void;
  profileRef: React.RefObject<HTMLDivElement>;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isOpen,
  setIsOpen,
  profile,
  isRtl,
  setView,
  viewMode,
  setViewMode,
  uiStyle,
  setUiStyle,
  profileRef
}) => {
  const { t } = useTranslation();
  const position = useAutoFlip(profileRef, isOpen);

  const menuGroups = [
    {
      label: isRtl ? 'الحساب' : 'Account',
      items: [
        { id: 'profile', label: isRtl ? 'الملف الشخصي' : 'My Profile', icon: User, action: () => setView('profile') },
        { id: 'notifications', label: isRtl ? 'الإشعارات' : 'Notifications', icon: Bell, action: () => setView('notifications-log') },
        { id: 'saved', label: isRtl ? 'المحفوظات' : 'Saved Items', icon: Bookmark, action: () => setView('profile') }, // In profile tabs
      ]
    },
    {
      label: isRtl ? 'العمليات' : 'Operations',
      items: [
        { id: 'purchases', label: isRtl ? 'المشتريات' : 'Purchases', icon: History, action: () => setView('profile') },
        { id: 'wallet', label: isRtl ? 'المحفظة' : 'Wallet', icon: CreditCard, action: () => setView('profile') },
      ]
    }
  ];

  return (
    <div className="relative" ref={profileRef}>
      <HapticButton 
        onClick={() => setIsOpen(!isOpen)}
        className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-brand-surface/50 hover:bg-brand-surface rounded-2xl transition-all border border-brand-border/50 hover:border-brand-primary/30 group"
      >
        <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <User size={18} />
          )}
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs font-black text-brand-text-main leading-none">{profile.name}</span>
          <span className="text-[9px] font-bold text-brand-text-muted uppercase tracking-widest mt-1">
            {viewMode === 'admin' ? (isRtl ? 'مدير النظام' : 'Administrator') : 
             viewMode === 'supplier' ? (isRtl ? 'مورد' : 'Supplier') : 
             (isRtl ? 'عميل' : 'Customer')}
          </span>
        </div>
      </HapticButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: position === 'bottom' ? 15 : -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'bottom' ? 15 : -15, scale: 0.95 }}
            className={`absolute ${position === 'bottom' ? 'top-full mt-4' : 'bottom-full mb-4'} w-72 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 dark:border-gray-800/50 overflow-hidden z-50 ${isRtl ? 'left-0' : 'right-0'}`}
          >
            {/* User Header */}
            <div className="p-6 bg-gradient-to-br from-brand-primary/5 to-transparent border-b border-brand-border/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-brand-text-main truncate">{profile.name}</span>
                  <span className="text-[10px] font-bold text-brand-text-muted truncate">{profile.email}</span>
                </div>
              </div>
            </div>

            <div className="p-2 space-y-1">
              {/* Admin Switcher */}
              {profile.role === 'admin' && (
                <div className="px-3 py-2 mb-2">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Shield size={12} className="text-brand-primary" />
                    <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                      {isRtl ? 'تبديل الواجهة' : 'Switch View'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'admin', icon: Shield, label: isRtl ? 'مدير' : 'Admin' },
                      { id: 'supplier', icon: ShoppingBag, label: isRtl ? 'مورد' : 'Vendor' },
                      { id: 'customer', icon: User, label: isRtl ? 'عميل' : 'User' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => { 
                          setViewMode(mode.id as any); 
                          setIsOpen(false); 
                          setView('home');
                        }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                          viewMode === mode.id 
                            ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                            : 'bg-brand-background/50 text-brand-text-muted hover:bg-brand-background hover:text-brand-text-main'
                        }`}
                      >
                        <mode.icon size={14} />
                        <span className="text-[8px] font-black uppercase">{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* UI Style Switcher */}
              <div className="px-3 py-2 mb-2 border-b border-brand-border/30">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Settings size={12} className="text-brand-primary" />
                  <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                    {isRtl ? 'نمط الواجهة' : 'UI Style'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'classic', label: isRtl ? 'كلاسيكي' : 'Classic' },
                    { id: 'minimal', label: isRtl ? 'بسيط' : 'Minimal' }
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => { 
                        setUiStyle(style.id as any); 
                        setIsOpen(false); 
                      }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                        uiStyle === style.id 
                          ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20' 
                          : 'bg-brand-background/50 text-brand-text-muted hover:bg-brand-background hover:text-brand-text-main'
                      }`}
                    >
                      <span className="text-[8px] font-black uppercase">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Groups */}
              {menuGroups.map((group, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="px-4 py-1.5">
                    <span className="text-[9px] font-black text-brand-text-muted uppercase tracking-[0.2em]">
                      {group.label}
                    </span>
                  </div>
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { item.action(); setIsOpen(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-brand-text-main hover:bg-brand-background transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-background flex items-center justify-center text-brand-text-muted group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-all">
                          <item.icon size={16} />
                        </div>
                        <span className="text-xs font-bold">{item.label}</span>
                      </div>
                      <ChevronRight size={14} className={`text-brand-text-muted opacity-0 group-hover:opacity-100 transition-all ${isRtl ? 'rotate-180' : ''}`} />
                    </button>
                  ))}
                </div>
              ))}

              <div className="pt-2 mt-2 border-t border-brand-border/30">
                <button 
                  onClick={() => { signOut(auth); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-brand-error hover:bg-brand-error/10 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-error/10 flex items-center justify-center text-brand-error group-hover:scale-110 transition-transform">
                    <LogOut size={16} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider">{t('logout')}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
