import React from 'react';
import { ShieldAlert, Users, Plus, X, Mail, ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from '../../../../core/firebase';
import { SiteSettings } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';

interface MaintenanceSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const MaintenanceSettings: React.FC<MaintenanceSettingsProps> = ({ settings, setSettings, isRtl }) => {
  const [newEmail, setNewEmail] = React.useState('');
  const isMarketplaceActive = settings.marketplaceEnabled !== false;

  const handleToggleMarketplace = async () => {
    const nextState = !isMarketplaceActive;
    setSettings(prev => ({ ...prev, marketplaceEnabled: nextState }));
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        marketplaceEnabled: nextState,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, 'settings', 'features'), {
        marketplace: nextState
      }, { merge: true });

      toast.success(nextState
        ? (isRtl ? 'تم إظهار قسم السوق (المتجر) في كل أجزاء الموقع 🟢' : 'Marketplace is now VISIBLE site-wide 🟢')
        : (isRtl ? 'تم إخفاء قسم السوق (المتجر) بالكامل من الموقع 🔴' : 'Marketplace is now HIDDEN site-wide 🔴')
      );
    } catch (e) {
      toast.error(isRtl ? 'فشل تحديث حالة إخفاء السوق' : 'Failed to update marketplace status');
    }
  };

  const handleAddEmail = () => {
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      const currentEmails = settings.maintenanceBypassEmails || [];
      if (!currentEmails.includes(newEmail)) {
        setSettings({
          ...settings,
          maintenanceBypassEmails: [...currentEmails, newEmail]
        });
      }
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setSettings({
      ...settings,
      maintenanceBypassEmails: (settings.maintenanceBypassEmails || []).filter(e => e !== email)
    });
  };

  return (
    <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
      {/* 1. Marketplace Visibility Section */}
      <div className={`p-6 rounded-2xl border transition-all space-y-4 ${
        isMarketplaceActive 
          ? 'bg-emerald-500/5 border-emerald-500/20' 
          : 'bg-red-500/5 border-red-500/20'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${isMarketplaceActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                <ShoppingBag size={22} />
              </div>
              <h3 className="text-lg font-black text-brand-text-main">
                {isRtl ? 'مفتاح إظهار / إخفاء قسم المتجر والسوق (Marketplace)' : 'Marketplace Visibility Control'}
              </h3>
            </div>
            <p className="text-xs text-brand-text-muted font-medium max-w-xl leading-relaxed">
              {isRtl 
                ? 'عند إيقاف هذا المفتاح، سيتم إخفاء المتجر (السوق) بالكامل من القائمة الرئيسية، الشريط السفلي، شبكة Bento، وتوجيه أي رابط مباشر لصفحة التنبيه لحين إعادة تفعيله بواسطة الأدمن.' 
                : 'Turning off this switch completely hides the Marketplace module from all menus, bottom navigation, Bento grids, and locks direct route access until enabled by Admin.'}
            </p>
          </div>
          <button
            onClick={handleToggleMarketplace}
            className={`w-16 h-8 rounded-full transition-all relative shrink-0 shadow-inner ${
              isMarketplaceActive ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all flex items-center justify-center shadow-md ${
              isMarketplaceActive ? (isRtl ? 'right-9' : 'left-9') : (isRtl ? 'right-1' : 'left-1')
            }`}>
              {isMarketplaceActive ? (
                <Eye size={14} className="text-emerald-600" />
              ) : (
                <EyeOff size={14} className="text-red-600" />
              )}
            </div>
          </button>
        </div>
        <div className="pt-3 border-t border-brand-border/40 flex items-center justify-between text-xs font-bold">
          <span className="text-brand-text-muted">
            {isRtl ? 'حالة عرض المتجر والسوق:' : 'Store & Market Status:'}
          </span>
          <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
            isMarketplaceActive 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30'
          }`}>
            {isMarketplaceActive 
              ? (isRtl ? 'المتجر ظاهر ومتاح للجميع 🟢' : 'Marketplace Visible 🟢') 
              : (isRtl ? 'المتجر مخفي بالكامل 🔴' : 'Marketplace Hidden 🔴')}
          </span>
        </div>
      </div>

      {/* 2. Full Site Maintenance Section */}
      <div className="pt-4 border-t border-brand-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-error/10 rounded-xl text-brand-error">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-text-main">
                {isRtl ? 'وضع الصيانة العام للموقع' : 'Full Site Maintenance Mode'}
              </h2>
              <p className="text-xs text-brand-text-muted font-medium">
                {isRtl 
                  ? 'تفعيل هذا الوضع سيمنع المستخدمين العاديين من تصفح المنصة بالكامل وعرض صفحة "قيد الإنشاء".' 
                  : 'Enabling this mode will prevent regular users from browsing the entire site and show a "Coming Soon" page.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-black uppercase tracking-widest ${settings.maintenanceMode ? 'text-brand-error' : 'text-brand-text-muted'}`}>
              {settings.maintenanceMode ? (isRtl ? 'مفعل' : 'Enabled') : (isRtl ? 'معطل' : 'Disabled')}
            </span>
            <button
              onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
              className={`w-14 h-7 rounded-full transition-all relative ${settings.maintenanceMode ? 'bg-brand-error' : 'bg-brand-border'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isRtl ? (settings.maintenanceMode ? 'left-1' : 'right-1') : (settings.maintenanceMode ? 'right-1' : 'left-1')}`} />
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-brand-border/50 mt-6 space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
              <Users size={14} />
              {isRtl ? 'رسائل البريد المستثناة (الأدمن)' : 'Bypass Emails (Admins)'}
            </label>
            <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-wider">
              {isRtl 
                ? 'أصحاب هذه العناوين سيتمكنون من تصفح الموقع حتى أثناء وضع الصيانة.' 
                : 'Owners of these emails will be able to browse the site even during maintenance mode.'}
            </p>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={16} />
                <input 
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={isRtl ? 'أدخل البريد الإلكتروني...' : 'Enter email address...'}
                  className="w-full pl-10 pr-4 py-3 bg-brand-background rounded-xl border border-brand-border text-brand-text-main outline-none focus:border-brand-primary transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                />
              </div>
              <HapticButton 
                onClick={handleAddEmail}
                className="px-6 bg-brand-primary text-white rounded-xl font-bold flex items-center gap-2"
              >
                <Plus size={18} />
                {isRtl ? 'إضافة' : 'Add'}
              </HapticButton>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {(settings.maintenanceBypassEmails || []).map((email) => (
                <div 
                  key={email}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-background border border-brand-border rounded-lg text-xs font-bold text-brand-text-main group hover:border-brand-error transition-all"
                >
                  <span>{email}</span>
                  <button 
                    onClick={() => handleRemoveEmail(email)}
                    className="text-brand-text-muted hover:text-brand-error transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(settings.maintenanceBypassEmails || []).length === 0 && (
                <p className="text-xs text-brand-text-muted italic py-2">
                  {isRtl ? 'لم يتم إضافة عناوين بريد مستثناة بعد.' : 'No bypass emails added yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

