import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, 
  Home, 
  ShoppingBag, 
  MessageSquare, 
  Zap, 
  User, 
  Settings, 
  HelpCircle, 
  LogOut,
  Sparkles,
  Bot,
  Search,
  Bell,
  Building2,
  ShieldCheck,
  Smartphone,
  Activity,
  Handshake
} from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { getUserImageUrl } from '../../../../core/utils/imageUtils';
import { UserProfile, AppFeatures } from '../../../../core/types';
import { useTranslation } from 'react-i18next';

interface BentoMenuProps {
  profile: UserProfile | null;
  features: AppFeatures;
  currentView: string;
  setView: (view: any) => void;
  dashboardTab?: string;
  setDashboardTab?: (tab: string) => void;
  viewMode: string;
  setViewMode: (mode: any) => void;
  isRtl: boolean;
  onLogout?: () => void;
}

export const BentoMenu: React.FC<BentoMenuProps> = ({
  profile,
  features,
  currentView,
  setView,
  dashboardTab,
  setDashboardTab,
  viewMode,
  setViewMode,
  isRtl,
  onLogout
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const handleAiSearch = () => {
    if (!aiQuery.trim()) return;
    
    // Dispatch global search event
    window.dispatchEvent(new CustomEvent('global-search', { 
      detail: { query: aiQuery.trim() } 
    }));
    
    // Navigate to marketplace for results
    setView('marketplace');
    setIsOpen(false);
    setAiQuery('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { id: 'home', icon: Home, labelAr: 'الرئيسية', labelEn: 'Home', color: 'text-blue-500', roles: ['customer', 'supplier', 'admin'] },
    { id: 'smart_pulse', icon: Activity, labelAr: 'النبض الذكي', labelEn: 'Smart Pulse', color: 'text-brand-teal', roles: ['customer', 'supplier', 'admin'] },
    { id: 'marketplace', icon: ShoppingBag, labelAr: 'السوق', labelEn: 'Market', color: 'text-green-500', roles: ['customer', 'supplier', 'admin'] },
    { id: 'chat', icon: MessageSquare, labelAr: 'المحادثات', labelEn: 'Chats', color: 'text-yellow-500', roles: ['customer', 'supplier', 'admin'] },
    { id: 'connect', icon: Zap, labelAr: 'المكافآت', labelEn: 'Connect', color: 'text-purple-500', roles: ['customer', 'supplier', 'admin'] },
    { id: 'dashboard', icon: LayoutGrid, labelAr: 'لوحة التحكم', labelEn: 'Dashboard', color: 'text-red-500', roles: ['supplier', 'admin'] },
    { id: 'profile', icon: User, labelAr: 'الملف الشخصي', labelEn: 'Profile', color: 'text-indigo-500', roles: ['customer', 'supplier', 'admin'] },
    { id: 'supplier_landing', icon: Building2, labelAr: 'كن مورداً', labelEn: 'Become Supplier', color: 'text-orange-600', roles: ['customer'] },
    { id: 'partnerships', icon: Handshake, labelAr: 'الشراكات', labelEn: 'Partnerships', color: 'text-pink-500', roles: ['customer', 'supplier', 'admin'] },
    { id: 'help', icon: HelpCircle, labelAr: 'مركز المساعدة', labelEn: 'Help Center', color: 'text-orange-500', roles: ['customer', 'supplier', 'admin'] },
  ].filter(item => item.roles.includes(viewMode));

  const adminItems = [
    { id: 'admin-settings', icon: Settings, labelAr: 'الإعدادات', labelEn: 'Settings', tab: 'site' },
    { id: 'admin-users', icon: ShieldCheck, labelAr: 'المستخدمين', labelEn: 'Users', tab: 'users' },
    { id: 'admin-analytics', icon: Bot, labelAr: 'التحليلات', labelEn: 'AI Analytics', tab: 'ai' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <HapticButton
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${
          isOpen ? 'bg-brand-primary text-white shadow-lg' : 'hover:bg-brand-surface text-brand-text-muted'
        }`}
      >
        <LayoutGrid size={18} />
      </HapticButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10, x: isRtl ? 20 : -20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className={`fixed md:absolute top-20 md:top-12 left-4 right-4 md:left-auto ${isRtl ? 'md:left-0' : 'md:right-0'} md:w-[360px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-brand-border/50 overflow-hidden z-[100] pointer-events-auto`}
          >
            <div className="p-6">
              {/* User Profile Header (Google Style) */}
              {profile ? (
                <div className="flex items-center gap-4 mb-8 p-4 bg-brand-surface rounded-[24px] border border-brand-border/30">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand-primary/20">
                    <img src={getUserImageUrl(profile)} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-brand-text-main truncate">{profile.name}</h4>
                    <p className="text-[10px] text-brand-text-muted truncate">{profile.email}</p>
                    {viewMode === 'customer' && profile.loyaltyPoints !== undefined && (
                      <div className="flex items-center gap-1 mt-1">
                        <Sparkles size={10} className="text-brand-primary" />
                        <span className="text-[9px] font-bold text-brand-primary">
                          {profile.loyaltyPoints} {isRtl ? 'نقطة ولاء' : 'Loyalty Points'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-1 bg-brand-primary/10 rounded-lg">
                    <span className="text-[9px] font-black text-brand-primary uppercase tracking-tighter">
                      {isRtl ? (viewMode === 'admin' ? 'مدير' : viewMode === 'supplier' ? 'مورد' : 'عميل') : viewMode.toUpperCase()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mb-8 p-6 bg-gradient-to-br from-brand-primary/10 to-brand-teal/10 rounded-[24px] border border-brand-primary/20 text-center">
                  <Bot size={32} className="mx-auto mb-3 text-brand-primary animate-bounce" />
                  <h4 className="text-sm font-bold text-brand-text-main mb-1">
                    {isRtl ? 'مرحباً بك في عالمنا الذكي' : 'Welcome to our Neural World'}
                  </h4>
                  <p className="text-[10px] text-brand-text-muted mb-4">
                    {isRtl ? 'سجل دخولك لتجربة القوة الكاملة للذكاء الاصطناعي' : 'Login to experience the full power of AI'}
                  </p>
                  <HapticButton
                    onClick={() => { setView('role-selection'); setIsOpen(false); }}
                    className="w-full py-2.5 bg-brand-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/20"
                  >
                    {isRtl ? 'انضم إلينا الآن' : 'Join Us Now'}
                  </HapticButton>
                </div>
              )}

              {/* Smart Search / AI Command Bar */}
              <div className="relative mb-8 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary/20 to-brand-teal/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-3 bg-brand-surface p-3 rounded-2xl border border-brand-border/30">
                  <Search size={18} className="text-brand-text-muted" />
                  <input 
                    type="text" 
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                    placeholder={isRtl ? 'اسأل الذكاء الاصطناعي...' : 'Ask AI anything...'}
                    className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-brand-text-muted/50"
                  />
                  <HapticButton 
                    onClick={handleAiSearch}
                    className="flex items-center gap-1 px-2 py-1 bg-brand-primary/10 rounded-lg hover:bg-brand-primary/20 transition-colors"
                  >
                    <Sparkles size={12} className="text-brand-primary animate-pulse" />
                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-tighter">AI</span>
                  </HapticButton>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="text-xs font-black text-brand-text-muted uppercase tracking-[0.2em]">
                  {isRtl ? 'المفضلات الذكية' : 'Neural Favorites'}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-brand-text-muted uppercase">Live</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-y-8 gap-x-4">
                {menuItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (item.id === 'dashboard') {
                        setDashboardTab?.('overview');
                      } else if (item.id === 'profile') {
                        // If user is admin/supplier, profile is often in dashboard
                        if (viewMode === 'supplier' || viewMode === 'admin') {
                          setView('dashboard');
                          setDashboardTab?.('overview');
                          setIsOpen(false);
                          return;
                        }
                      }
                      setView(item.id);
                      setIsOpen(false);
                    }}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-brand-surface flex items-center justify-center transition-all duration-300 group-hover:shadow-md group-hover:bg-white dark:group-hover:bg-gray-800 ${item.color}`}>
                      <item.icon size={24} />
                    </div>
                    <span className="text-[11px] font-medium text-brand-text-main text-center leading-tight">
                      {isRtl ? item.labelAr : item.labelEn}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Role Switcher Section */}
              {profile && (
                <div className="mt-8 pt-6 border-t border-brand-border/50">
                  <h3 className="text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em] mb-4 px-2">
                    {isRtl ? 'تبديل وضع العرض' : 'Switch View Mode'}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'customer', labelAr: 'عميل', labelEn: 'Customer', icon: User, color: 'text-blue-500' },
                      { id: 'supplier', labelAr: 'مورد', labelEn: 'Supplier', icon: Building2, color: 'text-orange-500' },
                      { id: 'admin', labelAr: 'أدمن', labelEn: 'Admin', icon: ShieldCheck, color: 'text-red-500', restricted: true },
                    ].map((role) => {
                      const isRestricted = role.restricted && profile.role !== 'admin';
                      if (isRestricted) return null;

                      return (
                        <HapticButton
                          key={role.id}
                          onClick={() => {
                            setViewMode(role.id as any);
                            if (role.id === 'admin') setView('dashboard');
                            else if (role.id === 'supplier') setView('dashboard');
                            else setView('home');
                            setIsOpen(false);
                          }}
                          className={`flex flex-col items-center gap-2 p-2 rounded-2xl border transition-all ${
                            viewMode === role.id 
                              ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' 
                              : 'bg-brand-surface border-brand-border/30 text-brand-text-muted hover:border-brand-primary/50'
                          }`}
                        >
                          <role.icon size={18} className={viewMode === role.id ? 'text-brand-primary' : role.color} />
                          <span className="text-[9px] font-bold uppercase tracking-tighter">
                            {isRtl ? role.labelAr : role.labelEn}
                          </span>
                        </HapticButton>
                      );
                    })}
                  </div>
                </div>
              )}

              {profile?.role === 'admin' && (
                <div className="mt-8 pt-6 border-t border-brand-border/50">
                  <div className="flex items-center gap-2 mb-4 text-brand-primary">
                    <ShieldCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {isRtl ? 'إدارة النظام' : 'Admin Console'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {adminItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setViewMode('admin');
                          setView('dashboard');
                          setDashboardTab?.(item.tab);
                          setIsOpen(false);
                        }}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/5 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all">
                          <item.icon size={18} />
                        </div>
                        <span className="text-[10px] font-medium text-brand-text-muted text-center">
                          {isRtl ? item.labelAr : item.labelEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-brand-surface/50 p-4 flex items-center justify-between">
              <HapticButton 
                onClick={() => {
                  if (viewMode === 'admin' || viewMode === 'supplier') {
                    setView('dashboard');
                    setDashboardTab?.('settings');
                  } else {
                    setView('profile');
                  }
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 text-xs font-bold text-brand-text-muted hover:text-brand-primary transition-colors"
              >
                <Settings size={14} />
                {isRtl ? 'إعدادات الحساب' : 'Account Settings'}
              </HapticButton>
              <HapticButton 
                onClick={() => {
                  if (onLogout) onLogout();
                  setIsOpen(false);
                }}
                className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
              >
                {isRtl ? 'خروج' : 'Sign Out'}
              </HapticButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
