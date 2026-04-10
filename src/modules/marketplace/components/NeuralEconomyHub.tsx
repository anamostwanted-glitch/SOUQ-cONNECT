import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ChevronRight,
  BrainCircuit,
  Star,
  Clock,
  CheckCircle2,
  Lock,
  CreditCard,
  Gift
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { UserProfile } from '../../../core/types';

interface NeuralEconomyHubProps {
  profile: UserProfile | null;
  isRtl: boolean;
  onClose: () => void;
}

export const NeuralEconomyHub: React.FC<NeuralEconomyHubProps> = ({ 
  profile, 
  isRtl, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'plans' | 'stats'>('wallet');

  const plans = [
    {
      id: 'basic',
      nameAr: 'النبض الأساسي',
      nameEn: 'Basic Pulse',
      price: 0,
      featuresAr: ['5 عمليات بحث بصري يومياً', 'تحليل أساسي للمنتجات', 'دعم فني عادي'],
      featuresEn: ['5 Visual searches daily', 'Basic product analysis', 'Standard support'],
      color: 'from-slate-400 to-slate-500',
      isCurrent: profile?.role === 'customer'
    },
    {
      id: 'pro',
      nameAr: 'المدار الذهبي',
      nameEn: 'Golden Orbit',
      price: 29,
      featuresAr: ['بحث بصري غير محدود', 'AI Auto-Negotiator', 'أولوية في الظهور', 'تحليل المنافسين'],
      featuresEn: ['Unlimited visual search', 'AI Auto-Negotiator', 'Priority visibility', 'Competitor analysis'],
      color: 'from-amber-400 to-orange-500',
      isPopular: true
    },
    {
      id: 'enterprise',
      nameAr: 'الذكاء المطلق',
      nameEn: 'Absolute Intelligence',
      price: 99,
      featuresAr: ['كل ميزات برو', 'توليد شعارات غير محدود', 'مدير حساب مخصص', 'API Access'],
      featuresEn: ['All Pro features', 'Unlimited logo generation', 'Dedicated manager', 'API Access'],
      color: 'from-brand-primary to-brand-teal',
      isCurrent: profile?.role === 'admin'
    }
  ];

  const stats = [
    { label: isRtl ? 'وقت تم توفيره' : 'Time Saved', value: '12h', icon: Clock, color: 'text-blue-500' },
    { label: isRtl ? 'عائد الاستثمار' : 'AI ROI', value: '+24%', icon: TrendingUp, color: 'text-emerald-500' },
    { label: isRtl ? 'دقة المطابقة' : 'Match Accuracy', value: '98%', icon: CheckCircle2, color: 'text-brand-primary' },
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl h-[90vh] bg-brand-background rounded-[3rem] border border-white/20 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header Section */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center text-white shadow-2xl shadow-brand-primary/20">
              <BrainCircuit size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-text-main flex items-center gap-2">
                {isRtl ? 'اقتصاد كونكت العصبي' : 'Connect Neural Economy'}
                <Sparkles size={18} className="text-brand-primary animate-pulse" />
              </h2>
              <p className="text-brand-text-muted text-sm font-medium">
                {isRtl ? 'أدر رصيدك العصبي واستكشف ميزات الذكاء الاصطناعي' : 'Manage your neural credits and explore AI features'}
              </p>
            </div>
          </div>
          <HapticButton 
            onClick={onClose}
            className="p-3 bg-brand-surface border border-brand-border rounded-2xl text-brand-text-muted hover:text-red-500 transition-colors"
          >
            <Lock size={20} />
          </HapticButton>
        </div>

        {/* Tabs */}
        <div className="px-8 mb-6 flex items-center gap-2">
          {[
            { id: 'wallet', label: isRtl ? 'المحفظة' : 'Wallet', icon: Wallet },
            { id: 'plans', label: isRtl ? 'الباقات' : 'Plans', icon: Zap },
            { id: 'stats', label: isRtl ? 'إحصائيات القيمة' : 'Value Stats', icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'bg-brand-surface text-brand-text-muted hover:bg-brand-primary/5'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 pt-0 scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === 'wallet' && (
              <motion.div
                key="wallet"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {/* Credit Card Style Wallet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <BrainCircuit size={120} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Neural Wallet</span>
                        <Zap size={24} className="text-brand-primary" />
                      </div>
                      <div className="text-4xl font-black mb-2 flex items-baseline gap-2">
                        {profile?.neuralCredits || 0}
                        <span className="text-sm font-bold text-white/60 uppercase">Credits</span>
                      </div>
                      <p className="text-white/40 text-xs font-medium mb-8">
                        {isRtl 
                          ? `ما يعادل ${(profile?.neuralCredits || 0) / 100} دولار أمريكي` 
                          : `Equivalent to $${((profile?.neuralCredits || 0) / 100).toFixed(2)} USD`}
                      </p>
                      <div className="flex items-center gap-3">
                        <HapticButton className="px-6 py-2.5 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20">
                          {isRtl ? 'شحن الرصيد' : 'Top Up'}
                        </HapticButton>
                        <HapticButton className="px-6 py-2.5 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                          {isRtl ? 'تحويل النقاط' : 'Convert Points'}
                        </HapticButton>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 rounded-[2.5rem] bg-brand-surface border border-brand-border flex flex-col justify-center">
                    <h3 className="text-lg font-black text-brand-text-main mb-4 flex items-center gap-2">
                      <Gift size={20} className="text-brand-primary" />
                      {isRtl ? 'مكافآت كونكت' : 'Connect Rewards'}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-brand-background border border-brand-border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Star size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-brand-text-main">{isRtl ? 'نقاط الإحالة' : 'Referral Points'}</div>
                            <div className="text-[10px] font-bold text-brand-text-muted">{isRtl ? 'من دعوة الأصدقاء' : 'From inviting friends'}</div>
                          </div>
                        </div>
                        <div className="text-lg font-black text-emerald-500">{profile?.referralPoints || 0}</div>
                      </div>
                      <HapticButton className="w-full py-3 border-2 border-dashed border-brand-primary/30 text-brand-primary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary/5 transition-all">
                        {isRtl ? 'عرض سجل العمليات' : 'View Transaction History'}
                      </HapticButton>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: isRtl ? 'شراء نبضات' : 'Buy Pulses', icon: Zap, color: 'text-brand-primary' },
                    { label: isRtl ? 'بطاقة هدايا' : 'Gift Card', icon: CreditCard, color: 'text-purple-500' },
                    { label: isRtl ? 'ترقية الباقة' : 'Upgrade', icon: Sparkles, color: 'text-amber-500' },
                    { label: isRtl ? 'سحب كاش' : 'Withdraw', icon: Wallet, color: 'text-emerald-500' },
                  ].map((action, idx) => (
                    <HapticButton key={idx} className="p-6 rounded-[2rem] bg-brand-surface border border-brand-border flex flex-col items-center text-center group hover:border-brand-primary/30 transition-all">
                      <action.icon size={24} className={`${action.color} mb-3 group-hover:scale-110 transition-transform`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-text-main">{action.label}</span>
                    </HapticButton>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'plans' && (
              <motion.div
                key="plans"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {plans.map(plan => (
                  <div 
                    key={plan.id}
                    className={`relative p-8 rounded-[2.5rem] border-2 flex flex-col ${
                      plan.isPopular ? 'border-brand-primary bg-brand-primary/5 shadow-xl shadow-brand-primary/10 scale-105 z-10' : 'border-brand-border bg-brand-surface'
                    }`}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                        {isRtl ? 'الأكثر طلباً' : 'Most Popular'}
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white mb-6 shadow-lg`}>
                      <Sparkles size={24} />
                    </div>
                    <h3 className="text-xl font-black text-brand-text-main mb-1">{isRtl ? plan.nameAr : plan.nameEn}</h3>
                    <div className="text-3xl font-black text-brand-text-main mb-6 flex items-baseline gap-1">
                      ${plan.price}
                      <span className="text-xs font-bold text-brand-text-muted uppercase">/ mo</span>
                    </div>
                    <div className="space-y-3 mb-8 flex-1">
                      {(isRtl ? plan.featuresAr : plan.featuresEn).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm font-medium text-brand-text-muted">
                          <CheckCircle2 size={16} className="text-brand-primary shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                    <HapticButton className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      plan.isCurrent 
                        ? 'bg-slate-100 text-slate-400 cursor-default' 
                        : 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover'
                    }`}>
                      {plan.isCurrent ? (isRtl ? 'باقتك الحالية' : 'Current Plan') : (isRtl ? 'اختر الباقة' : 'Choose Plan')}
                    </HapticButton>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                {/* ROI Dashboard */}
                <div className="p-8 rounded-[2.5rem] bg-brand-surface border border-brand-border">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-black text-brand-text-main">{isRtl ? 'تحليل القيمة العصبية' : 'Neural Value Analysis'}</h3>
                      <p className="text-xs text-brand-text-muted font-medium">{isRtl ? 'كيف ساعدك الذكاء الاصطناعي هذا الشهر' : 'How AI helped you this month'}</p>
                    </div>
                    <div className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-widest">
                      April 2026
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat, idx) => (
                      <div key={idx} className="p-6 rounded-3xl bg-brand-background border border-brand-border flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center ${stat.color} mb-4 shadow-sm`}>
                          <stat.icon size={24} />
                        </div>
                        <div className="text-2xl font-black text-brand-text-main mb-1">{stat.value}</div>
                        <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Efficiency Chart Placeholder */}
                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-brand-primary/5 to-brand-teal/5 border border-brand-primary/10 flex flex-col items-center justify-center min-h-[200px] text-center">
                  <BrainCircuit size={48} className="text-brand-primary opacity-20 mb-4" />
                  <h4 className="text-sm font-black text-brand-text-main mb-2">{isRtl ? 'تقرير الكفاءة الذكي' : 'Smart Efficiency Report'}</h4>
                  <p className="text-xs text-brand-text-muted max-w-sm leading-relaxed">
                    {isRtl 
                      ? 'بناءً على نشاطك، وفرت ميزة "المفاوض الآلي" ما يقارب 4 ساعات من المحادثات اليدوية هذا الأسبوع.' 
                      : 'Based on your activity, the "Auto-Negotiator" feature saved approximately 4 hours of manual chat this week.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <div className="p-8 pt-4 border-t border-brand-border bg-brand-surface/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
            <ShieldCheck size={14} className="text-emerald-500" />
            {isRtl ? 'جميع المعاملات مؤمنة بتشفير كونكت' : 'All transactions secured by Connect Encryption'}
          </div>
          <div className="flex items-center gap-4">
            <button className="text-[10px] font-black text-brand-text-muted hover:text-brand-primary transition-colors uppercase tracking-widest">
              {isRtl ? 'الشروط والأحكام' : 'Terms & Conditions'}
            </button>
            <button className="text-[10px] font-black text-brand-text-muted hover:text-brand-primary transition-colors uppercase tracking-widest">
              {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
