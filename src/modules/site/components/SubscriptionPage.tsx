import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { SubscriptionManager } from '../../../components/SubscriptionManager';
import { HapticButton } from '../../../shared/components/HapticButton';
import { UserProfile } from '../../../core/types';
import { 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  HelpCircle, 
  Headphones, 
  Settings,
  Crown,
  Lock,
  RefreshCw
} from 'lucide-react';

interface SubscriptionPageProps {
  profile?: UserProfile | null;
  viewMode?: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  setDashboardTab?: (tab: string) => void;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  profile,
  viewMode,
  onNavigate,
  setDashboardTab
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const isAdmin = viewMode === 'admin' || profile?.role === 'admin';
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      qAr: 'هل يمكنني تغيير خطة الاشتراكات في أي وقت؟',
      qEn: 'Can I change my subscription plan at any time?',
      aAr: 'نعم، يمكنك الترقية أو التعديل في أي وقت وسيرتكز الفارق الزمني على تسوية حسابك تلقائياً.',
      aEn: 'Yes, you can upgrade or modify your plan at any time, and billing will auto-prorate accordingly.'
    },
    {
      qAr: 'ما هي الوسائل المتاحة لخصم واشتراك العضوية؟',
      qEn: 'What payment methods are supported for subscriptions?',
      aAr: 'ندعم الفيزا، الماستركارد، المحافظ الرقمية المحلية (Zain Cash, CliQ, Orange Money) ووسائل الدفع الآمنة.',
      aEn: 'We support Visa, Mastercard, local e-wallets (Zain Cash, CliQ, Orange Money), and secure gateway payments.'
    },
    {
      qAr: 'هل تتضمن باقات الموردين أولوية في الذكاء الاصطناعي (AI Predictive Match)؟',
      qEn: 'Do supplier plans include AI Predictive Match priority?',
      aAr: 'نعم، الباقات الاحترافية والنخبة تمنح منتجاتك وخدماتك أولوية الظهور التلقائي أمام طلبات الشراء ذات الصلة.',
      aEn: 'Yes, Pro and VIP plans give your products & services top predictive match priority for relevant RFQs.'
    },
    {
      qAr: 'هل توجد عمولة على الصفقات في باقة النخبة VIP؟',
      qEn: 'Is there a commission fee on deals for Enterprise VIP plan?',
      aAr: 'لا، باقة النخبة توفر 0% عمولات منصة مع تقديم عروض أسعار لا محدودة ومدير حساب خاص.',
      aEn: 'No, the Enterprise VIP plan offers 0% platform commission with unlimited quotes and a dedicated account manager.'
    }
  ];

  return (
    <div className="min-h-screen bg-brand-background pt-24 pb-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Navigation / Back Bar */}
        <div className="flex items-center justify-between">
          <HapticButton
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-brand-text-muted hover:text-brand-text-main text-sm font-bold transition-all bg-brand-surface px-4 py-2 rounded-xl border border-brand-border"
          >
            <ArrowRight size={16} className={isRtl ? '' : 'rotate-180'} />
            {isRtl ? 'الرجوع للرئيسية' : 'Back to Home'}
          </HapticButton>

          {isAdmin && (
            <HapticButton
              onClick={() => {
                onNavigate('dashboard');
                setDashboardTab?.('site-settings');
              }}
              className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:bg-amber-500/20 transition-all"
            >
              <Settings size={16} />
              {isRtl ? 'إدارة وتعديل خطط الاشتراكات (مختبر الضبط)' : 'Manage Subscription Plans (Admin)'}
            </HapticButton>
          )}
        </div>

        {/* Hero Section Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-surface via-brand-surface to-brand-primary/5 p-8 md:p-14 rounded-[3rem] border border-brand-border shadow-xl text-center space-y-6">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black border border-brand-primary/20">
            <Sparkles size={14} className="animate-pulse" />
            {isRtl ? 'خطط وباقات منصة كونكت AI' : 'Connect AI Subscription Plans'}
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-brand-text-main tracking-tight max-w-3xl mx-auto leading-tight">
            {isRtl ? (
              <>طور أعمالك مع <span className="text-brand-primary">باقات الاشتراك الذكية</span></>
            ) : (
              <>Scale Your Business with <span className="text-brand-primary">Smart Subscriptions</span></>
            )}
          </h1>

          <p className="text-brand-text-muted text-sm md:text-base font-bold max-w-2xl mx-auto">
            {isRtl 
              ? 'اختر الباقة المناسبة لتوسيع نطاق أعمالك، الوصول إلى أحدث أدوات التنبؤ بالطلب بالذكاء الاصطناعي، وزيادة المبيعات والربط المباشر مع المشترين والموردين.'
              : 'Choose the ideal plan to expand your scope, access AI predictive demand matching, and increase direct connections with buyers & suppliers.'}
          </p>

          {/* Key Value Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 bg-brand-background px-4 py-2 rounded-2xl border border-brand-border text-xs font-bold text-brand-text-main shadow-sm">
              <ShieldCheck size={16} className="text-emerald-500" />
              {isRtl ? 'دفع آمن ومضمون 100%' : '100% Secure Payment'}
            </div>
            <div className="flex items-center gap-2 bg-brand-background px-4 py-2 rounded-2xl border border-brand-border text-xs font-bold text-brand-text-main shadow-sm">
              <RefreshCw size={16} className="text-brand-primary" />
              {isRtl ? 'إلغاء أو تعديل في أي وقت' : 'Cancel or change anytime'}
            </div>
            <div className="flex items-center gap-2 bg-brand-background px-4 py-2 rounded-2xl border border-brand-border text-xs font-bold text-brand-text-main shadow-sm">
              <Crown size={16} className="text-amber-500" />
              {isRtl ? 'أولوية الظهور بالذكاء الاصطناعي' : 'AI Predictive Priority'}
            </div>
          </div>
        </div>

        {/* Subscription Manager Component */}
        <div className="bg-brand-surface p-6 md:p-10 rounded-[3rem] border border-brand-border shadow-lg">
          <SubscriptionManager isRtl={isRtl} />
        </div>

        {/* FAQ Section */}
        <div className="bg-brand-surface p-8 md:p-12 rounded-[3rem] border border-brand-border shadow-md space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
              <HelpCircle size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-brand-text-main">
                {isRtl ? 'الأسئلة الشائعة عن الاشتراكات' : 'Subscription FAQs'}
              </h2>
              <p className="text-xs font-bold text-brand-text-muted mt-0.5">
                {isRtl ? 'إجابات مباشرة على أكثر استفسارات المشتركين' : 'Direct answers to key subscriber questions'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="bg-brand-background p-6 rounded-2xl border border-brand-border/60 hover:border-brand-primary/30 transition-all space-y-2"
              >
                <h3 className="text-sm font-black text-brand-text-main flex items-start gap-2">
                  <span className="text-brand-primary font-black">•</span>
                  {isRtl ? faq.qAr : faq.qEn}
                </h3>
                <p className="text-xs font-bold text-brand-text-muted leading-relaxed">
                  {isRtl ? faq.aAr : faq.aEn}
                </p>
              </div>
            ))}
          </div>

          {/* Support Banner */}
          <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <Headphones size={24} className="text-brand-primary" />
              <div>
                <h4 className="text-sm font-black text-brand-text-main">
                  {isRtl ? 'هل لديك أسئلة خاصة بالمؤسسات أو الصفقات الكبرى؟' : 'Have custom enterprise or large deal inquiries?'}
                </h4>
                <p className="text-xs font-bold text-brand-text-muted">
                  {isRtl ? 'فريق المبيعات والدعم الفني متواجد لمساعدتك في اختيار الباقة المناسبة.' : 'Our sales & support team is here to assist you with custom plans.'}
                </p>
              </div>
            </div>
            <HapticButton
              onClick={() => onNavigate('chat')}
              className="bg-brand-primary text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-brand-primary/90 transition-all shadow-md shadow-brand-primary/20 whitespace-nowrap"
            >
              {isRtl ? 'تواصل مع المبيعات' : 'Contact Sales'}
            </HapticButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
