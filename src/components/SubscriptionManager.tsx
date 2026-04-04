import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Zap, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { HapticButton } from '../shared/components/HapticButton';

interface SubscriptionManagerProps {
  isRtl: boolean;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ isRtl }) => {
  const { t } = useTranslation();

  const plans = [
    {
      id: 'free',
      nameAr: 'المجانية',
      nameEn: 'Free',
      price: 0,
      featuresAr: ['5 طلبات شهرياً', 'دعم فني محدود', 'الملف الشخصي الأساسي'],
      featuresEn: ['5 requests per month', 'Limited support', 'Basic profile'],
      isCurrent: true,
    },
    {
      id: 'pro',
      nameAr: 'المحترفة',
      nameEn: 'Pro',
      price: 29,
      featuresAr: ['طلبات غير محدودة', 'دعم فني 24/7', 'الملف الشخصي الموثق', 'تحليلات متقدمة'],
      featuresEn: ['Unlimited requests', '24/7 support', 'Verified profile', 'Advanced analytics'],
      isCurrent: false,
      recommended: true,
    },
    {
      id: 'enterprise',
      nameAr: 'المؤسسات',
      nameEn: 'Enterprise',
      price: 99,
      featuresAr: ['كل ميزات المحترفة', 'مدير حساب مخصص', 'وصول مبكر للميزات', 'تكامل API'],
      featuresEn: ['All Pro features', 'Dedicated account manager', 'Early access to features', 'API integration'],
      isCurrent: false,
    }
  ];

  return (
    <div className="space-y-8 p-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-brand-text-main">
          {isRtl ? 'خطط الاشتراك' : 'Subscription Plans'}
        </h2>
        <p className="text-brand-text-muted">
          {isRtl ? 'اختر الخطة المناسبة لنمو عملك' : 'Choose the right plan for your business growth'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -5 }}
            className={`relative p-6 rounded-[2rem] border-2 transition-all ${
              plan.recommended 
                ? 'bg-brand-primary/5 border-brand-primary shadow-xl shadow-brand-primary/10' 
                : 'bg-white dark:bg-slate-900 border-brand-border shadow-sm'
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
                {isRtl ? 'موصى به' : 'Recommended'}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-brand-text-main">
                  {isRtl ? plan.nameAr : plan.nameEn}
                </h3>
                {plan.id !== 'free' && <Zap className="text-brand-accent" size={20} />}
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-brand-text-main">${plan.price}</span>
                <span className="text-brand-text-muted text-sm">/{isRtl ? 'شهر' : 'mo'}</span>
              </div>

              <ul className="space-y-3 py-4 border-t border-brand-border">
                {(isRtl ? plan.featuresAr : plan.featuresEn).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-brand-text-main">
                    <CheckCircle2 className="text-brand-teal shrink-0" size={16} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <HapticButton
                className={`w-full py-3 rounded-2xl font-bold transition-all ${
                  plan.isCurrent
                    ? 'bg-brand-surface text-brand-text-muted cursor-default'
                    : plan.recommended
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-hover'
                    : 'bg-brand-surface text-brand-text-main hover:bg-brand-border'
                }`}
              >
                {plan.isCurrent 
                  ? (isRtl ? 'خطتك الحالية' : 'Current Plan') 
                  : (isRtl ? 'اشترك الآن' : 'Subscribe Now')}
              </HapticButton>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-brand-surface p-6 rounded-[2rem] border border-brand-border flex flex-col md:flex-row items-center gap-6">
        <div className="w-12 h-12 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal">
          <ShieldCheck size={24} />
        </div>
        <div className="flex-1 text-center md:text-start">
          <h4 className="font-bold text-brand-text-main">
            {isRtl ? 'أمان مضمون' : 'Guaranteed Security'}
          </h4>
          <p className="text-xs text-brand-text-muted mt-1">
            {isRtl 
              ? 'جميع معاملاتنا المالية مشفرة وآمنة تماماً. يمكنك إلغاء اشتراكك في أي وقت.' 
              : 'All our financial transactions are encrypted and completely secure. You can cancel your subscription at any time.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-brand-text-muted">
          <Clock size={16} />
          <span className="text-xs font-medium">
            {isRtl ? 'تحديث تلقائي شهرياً' : 'Auto-renews monthly'}
          </span>
        </div>
      </div>
    </div>
  );
};
