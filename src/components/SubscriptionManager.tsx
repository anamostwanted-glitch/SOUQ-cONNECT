import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../core/firebase';
import { SubscriptionPlan } from '../core/types';
import { Zap, CheckCircle2, ShieldCheck, Clock, Star, Loader2 } from 'lucide-react';
import { HapticButton } from '../shared/components/HapticButton';
import { toast } from 'sonner';

interface SubscriptionManagerProps {
  isRtl: boolean;
}

const DEFAULT_DISPLAY_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    nameAr: 'الباقة المجانية الأساسية',
    nameEn: 'Basic Free Plan',
    code: 'basic',
    targetRole: 'supplier',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'JOD',
    descriptionAr: 'انطلاقة مثالية للموردين الجدد للربط المباشر مع الطلبات',
    descriptionEn: 'Ideal starting point for new suppliers to connect directly with buyers',
    badgeAr: 'المجانية',
    badgeEn: 'Free',
    featuresAr: [
      'إضافة حتى 10 منتجات / خدمات في المعرض',
      'تقديم حتى 15 عرض سعر شهرياً',
      'التواصل المباشر عبر المحادثات الذكية',
      'نسبة عمولة المنصة 5%'
    ],
    featuresEn: [
      'Add up to 10 products / services in showcase',
      'Submit up to 15 quotes monthly',
      'Direct smart chat communication',
      'Platform commission fee 5%'
    ],
    isPopular: false,
    isDefault: true,
    maxProductsLimit: 10,
    maxOffersMonthly: 15,
    commissionPercentage: 5,
    aiMatchPriority: false,
    supportLevel: 'standard',
    status: 'active',
    order: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'pro',
    nameAr: 'باقة المورد الاحترافي',
    nameEn: 'Pro Supplier Plan',
    code: 'pro',
    targetRole: 'supplier',
    priceMonthly: 25,
    priceYearly: 240,
    currency: 'JOD',
    descriptionAr: 'للموردين والشركات الراغبة بتوسيع المبيعات وأولوية الماتش بالذكاء الاصطناعي',
    descriptionEn: 'For suppliers & companies aiming to scale sales with AI match priority',
    badgeAr: 'الأكثر شعبية ⭐',
    badgeEn: 'Most Popular ⭐',
    featuresAr: [
      'منتجات وخدمات غير محدودة في المعرض',
      'تقديم حتى 100 عرض سعر شهرياً',
      'أولوية ظهور بالذكاء الاصطناعي (AI Predictive Match)',
      'تنبيهات فورية بالواتساب للطلبات الجديدة',
      'نسبة عمولة منخفضة 2.5%'
    ],
    featuresEn: [
      'Unlimited products & services in showcase',
      'Submit up to 100 quotes monthly',
      'AI Predictive Match top visibility',
      'Instant WhatsApp notifications for new RFQs',
      'Reduced platform commission 2.5%'
    ],
    isPopular: true,
    isDefault: false,
    maxProductsLimit: 9999,
    maxOffersMonthly: 100,
    commissionPercentage: 2.5,
    aiMatchPriority: true,
    supportLevel: 'priority',
    status: 'active',
    order: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'enterprise',
    nameAr: 'باقة النخبة B2B VIP',
    nameEn: 'Enterprise B2B VIP',
    code: 'enterprise',
    targetRole: 'supplier',
    priceMonthly: 60,
    priceYearly: 580,
    currency: 'JOD',
    descriptionAr: 'حلول الشركات الكبرى والمؤسسات، بدون عمولات مبيعات مع مدير حساب خاص',
    descriptionEn: 'Solutions for large enterprises & corporations with zero commission & dedicated manager',
    badgeAr: 'النخبة للمؤسسات',
    badgeEn: 'Enterprise VIP',
    featuresAr: [
      'معرض منتجات وخدمات لا محدود + توثيق شارة المورد المعتمد',
      'تقديم عروض أسعار لا محدودة',
      'عمولة مبيعات 0% (صفر عمولة)',
      'أولوية قصوى في ترشيحات الذكاء الاصطناعي Neural Pulse',
      'مدير حساب خاص لربط الصفقات المباشرة'
    ],
    featuresEn: [
      'Unlimited showcase + Verified Trust Badge',
      'Unlimited quotes submission',
      '0% Sales commission (Zero Commission)',
      'Top priority in Neural Pulse AI match',
      'Dedicated account manager for direct deals'
    ],
    isPopular: false,
    isDefault: false,
    maxProductsLimit: 99999,
    maxOffersMonthly: 99999,
    commissionPercentage: 0,
    aiMatchPriority: true,
    supportLevel: 'dedicated',
    status: 'active',
    order: 3,
    createdAt: new Date().toISOString()
  }
];

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ isRtl }) => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlanCode, setCurrentPlanCode] = useState<string>('basic');

  useEffect(() => {
    const q = query(collection(db, 'subscription_plans'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: SubscriptionPlan[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SubscriptionPlan;
          if (data.status === 'active' && !data.isDeleted) {
            const planId = docSnap.id || data.id || `plan-${list.length}`;
            list.push({ ...data, id: planId });
          }
        });
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setPlans(list.length > 0 ? list : DEFAULT_DISPLAY_PLANS);
        setLoading(false);
      },
      () => {
        setPlans(DEFAULT_DISPLAY_PLANS);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (plan.code === currentPlanCode) return;
    setCurrentPlanCode(plan.code);
    toast.success(
      isRtl
        ? `تم الانضمام إلى ${plan.nameAr} بنجاح`
        : `Successfully subscribed to ${plan.nameEn}`
    );
  };

  return (
    <div className="space-y-8 p-4">
      {/* Header & Cycle Selector */}
      <div className="text-center space-y-4 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-black">
          <Zap size={14} />
          <span>{isRtl ? 'خطط الباقات بالدينار الأردني JOD' : 'Subscription Plans in JOD'}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-brand-text-main">
          {isRtl ? 'اختر الباقة المناسبة لتنمية أعمالك' : 'Choose the Ideal Plan for Your Business'}
        </h2>
        <p className="text-xs sm:text-sm font-bold text-brand-text-muted">
          {isRtl ? 'جميع الباقات تشمل الربط الذكي بالطلبات والعمولات التفصيلية' : 'All plans include smart request matching and explicit commission rules'}
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="inline-flex items-center bg-brand-background border border-brand-border p-1 rounded-2xl">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
              billingCycle === 'monthly'
                ? 'bg-brand-primary text-white shadow-md'
                : 'text-brand-text-muted hover:text-brand-text-main'
            }`}
          >
            {isRtl ? 'الدفع الشهري' : 'Monthly Billing'}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-brand-primary text-white shadow-md'
                : 'text-brand-text-muted hover:text-brand-text-main'
            }`}
          >
            <span>{isRtl ? 'الدفع السنوي' : 'Yearly Billing'}</span>
            <span className="px-1.5 py-0.5 bg-amber-400 text-slate-900 text-[9px] font-black rounded-md">
              {isRtl ? 'توفير 20%' : 'Save 20%'}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-brand-text-muted">
          <Loader2 size={32} className="animate-spin mx-auto mb-3 text-brand-primary" />
          <span className="text-xs font-bold">{isRtl ? 'جاري تحميل باقات الاشتراك...' : 'Loading subscription tiers...'}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => {
            const isCurrent = plan.code === currentPlanCode || (plan.isDefault && currentPlanCode === 'basic');
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

            return (
              <motion.div
                key={`sub-plan-${plan.id || plan.code || idx}-${idx}`}
                whileHover={{ y: -5 }}
                className={`relative p-6 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between ${
                  plan.isPopular 
                    ? 'bg-brand-surface border-brand-primary shadow-xl shadow-brand-primary/10 ring-2 ring-brand-primary/20' 
                    : 'bg-brand-surface border-brand-border shadow-sm'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Star size={12} className="fill-white" />
                    <span>{isRtl ? plan.badgeAr || 'موصى به' : plan.badgeEn || 'Popular'}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-brand-text-main">
                      {isRtl ? plan.nameAr : plan.nameEn}
                    </h3>
                    <span className="px-2 py-1 bg-brand-background rounded-lg border border-brand-border text-[10px] font-black text-brand-primary uppercase">
                      {plan.currency || 'JOD'}
                    </span>
                  </div>

                  <p className="text-xs text-brand-text-muted font-bold min-h-[32px]">
                    {isRtl ? plan.descriptionAr : plan.descriptionEn}
                  </p>

                  <div className="flex items-baseline gap-1 py-2">
                    <span className="text-4xl font-black text-brand-primary">{price}</span>
                    <span className="text-xs font-black text-brand-text-main uppercase">{plan.currency || 'JOD'}</span>
                    <span className="text-brand-text-muted text-xs font-bold">
                      /{billingCycle === 'yearly' ? (isRtl ? 'سنة' : 'yr') : (isRtl ? 'شهر' : 'mo')}
                    </span>
                  </div>

                  <ul className="space-y-3 py-4 border-t border-brand-border">
                    {(isRtl ? plan.featuresAr : plan.featuresEn)?.map((feature, fIdx) => (
                      <li key={`feature-${plan.id || plan.code || idx}-${fIdx}`} className="flex items-start gap-3 text-xs font-bold text-brand-text-main">
                        <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 mt-auto">
                  <HapticButton
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrent}
                    className={`w-full py-3.5 rounded-2xl text-xs font-black transition-all ${
                      isCurrent
                        ? 'bg-brand-background border border-brand-border text-brand-text-muted cursor-default'
                        : plan.isPopular
                        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:scale-[1.01]'
                        : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white'
                    }`}
                  >
                    {isCurrent 
                      ? (isRtl ? 'باقك الحالية' : 'Current Active Plan') 
                      : (isRtl ? 'الانضمام والاشتراك الآن' : 'Subscribe Now')}
                  </HapticButton>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Security Footer */}
      <div className="bg-brand-surface p-6 rounded-[2rem] border border-brand-border flex flex-col md:flex-row items-center gap-6">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shrink-0">
          <ShieldCheck size={24} />
        </div>
        <div className="flex-1 text-center md:text-start">
          <h4 className="font-bold text-brand-text-main text-sm">
            {isRtl ? 'معاملات آمنة ومضمونة 100%' : '100% Guaranteed Secure Billing'}
          </h4>
          <p className="text-xs text-brand-text-muted mt-0.5 font-bold">
            {isRtl 
              ? 'جميع المعاملات بالدينار الأردني JOD عبر بوابات الدفع المرخصة والمحفظة الرقمية.' 
              : 'All transactions strictly in JOD via licensed payment gateways & digital wallet.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-brand-text-muted">
          <Clock size={16} />
          <span className="text-xs font-bold">
            {isRtl ? 'تجديد مرن بدون التزام' : 'Cancel or upgrade anytime'}
          </span>
        </div>
      </div>
    </div>
  );
};

