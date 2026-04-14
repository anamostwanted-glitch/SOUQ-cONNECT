import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Rocket, Shield, Zap, Globe, BarChart3, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SiteSettings } from '../../../core/types';

interface SupplierLandingPageProps {
  onStart: () => void;
  settings: SiteSettings | null;
}

export const SupplierLandingPage: React.FC<SupplierLandingPageProps> = ({ onStart, settings }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const siteName = settings?.siteName || 'CONNECT AI';
  const siteLogo = settings?.logoUrl;

  const benefits = [
    {
      icon: <Zap className="w-6 h-6 text-orange-500" />,
      title: isAr ? 'وصول سريع للطلبات' : 'Fast Access to Requests',
      description: isAr ? 'احصل على إشعارات فورية بطلبات المنتجات التي تطابق تخصصك.' : 'Get instant notifications for product requests that match your specialty.'
    },
    {
      icon: <Shield className="w-6 h-6 text-blue-500" />,
      title: isAr ? 'منصة موثوقة' : 'Trusted Platform',
      description: isAr ? 'نحن نتحقق من جميع المشترين لضمان جدية التعاملات.' : 'We verify all buyers to ensure serious transactions.'
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-green-500" />,
      title: isAr ? 'تحليلات السوق الذكية' : 'Smart Market Analytics',
      description: isAr ? 'استخدم أدوات الذكاء الاصطناعي لفهم اتجاهات السوق والأسعار.' : 'Use AI tools to understand market trends and pricing.'
    },
    {
      icon: <Globe className="w-6 h-6 text-purple-500" />,
      title: isAr ? 'توسع عالمي' : 'Global Expansion',
      description: isAr ? 'تواصل مع مشترين من مختلف أنحاء العالم بكل سهولة.' : 'Connect with buyers from all over the world with ease.'
    }
  ];

  const steps = [
    {
      number: '01',
      title: isAr ? 'إنشاء حساب' : 'Create Account',
      description: isAr ? 'سجل كمورد في أقل من دقيقتين.' : 'Register as a supplier in less than 2 minutes.'
    },
    {
      number: '02',
      title: isAr ? 'تحديد التخصص' : 'Define Specialty',
      description: isAr ? 'اختر الفئات والمنتجات التي توفرها.' : 'Choose the categories and products you provide.'
    },
    {
      number: '03',
      title: isAr ? 'استلام الطلبات' : 'Receive Requests',
      description: isAr ? 'ابدأ في تقديم عروضك وزيادة مبيعاتك.' : 'Start submitting offers and increasing your sales.'
    }
  ];

  return (
    <div className="min-h-screen bg-brand-background text-brand-text-main font-sans overflow-x-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Hero Section - Split Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Side: Content */}
        <div className="flex flex-col justify-center p-8 lg:p-24 bg-white dark:bg-gray-950 border-b lg:border-b-0 lg:border-r border-brand-border">
          <motion.div
            initial={{ opacity: 0, x: isAr ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-2 mb-8">
              {siteLogo ? (
                <img src={siteLogo} alt={siteName} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center">
                  <Rocket className="text-white w-5 h-5" />
                </div>
              )}
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                {isAr ? 'برنامج الموردين المتميزين' : 'Premium Supplier Program'}
              </span>
            </div>

            <h1 className="text-5xl lg:text-8xl font-semibold leading-[0.88] tracking-tighter mb-8">
              {isAr ? (
                <>
                  نمِّ تجارتك <br />
                  <span className="text-brand-teal">بذكاء</span>
                </>
              ) : (
                <>
                  Grow Your <br />
                  Business <span className="text-brand-teal">Smarter</span>
                </>
              )}
            </h1>

            <p className="text-xl lg:text-2xl text-brand-text-muted mb-12 max-w-lg leading-relaxed">
              {isAr 
                ? 'انضم إلى منصة ' + siteName + ' وتواصل مع آلاف المشترين الجادين. ابدأ في استلام طلبات الشراء فوراً وزد من أرباحك باستخدام أدواتنا الذكية.'
                : 'Join ' + siteName + ' and connect with thousands of serious buyers. Start receiving purchase requests immediately and increase your profits using our smart tools.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onStart}
                className="group relative flex items-center justify-center gap-3 bg-brand-primary text-white px-8 py-5 rounded-full text-lg font-medium hover:bg-brand-teal transition-all duration-300 overflow-hidden shadow-xl hover:-translate-y-1"
              >
                <span className="relative z-10">{isAr ? 'سجل كمورد الآن' : 'Register as Supplier Now'}</span>
                <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isAr ? 'rotate-180' : ''}`} />
              </button>
              
              <div className="flex items-center gap-4 px-4">
                <div className="flex -space-x-3 rtl:space-x-reverse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src={`https://picsum.photos/seed/supplier${i}/100/100`} alt="Supplier" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <div className="text-sm opacity-60">
                  <span className="font-bold block text-[#0a0a0a]">500+</span>
                  {isAr ? 'مورد موثوق' : 'Trusted Suppliers'}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Visual/Feature Grid */}
        <div className="bg-brand-background p-8 lg:p-24 flex flex-col justify-center relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-10 right-10 w-32 h-32 border border-brand-border rounded-full animate-pulse" />
          <div className="absolute bottom-20 left-10 w-64 h-64 bg-brand-teal/5 rounded-full blur-3xl" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 * index }}
                className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-brand-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="mb-6 p-3 bg-brand-background rounded-2xl w-fit">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-brand-text-muted leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Vertical Rail Text */}
          <div className={`absolute top-1/2 ${isAr ? 'left-4' : 'right-4'} -translate-y-1/2 hidden xl:block`}>
            <span className="writing-vertical-rl rotate-180 text-[10px] uppercase tracking-[0.3em] opacity-30 font-bold whitespace-nowrap">
              {isAr ? `مستقبل التجارة الذكية • ${siteName}` : `FUTURE OF SMART TRADE • ${siteName}`}
            </span>
          </div>
        </div>
      </main>

      {/* How it Works Section */}
      <section className="py-24 px-8 lg:px-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl lg:text-6xl font-bold tracking-tighter mb-6">
                {isAr ? 'كيف تبدأ رحلتك معنا؟' : 'How to start your journey?'}
              </h2>
              <p className="text-xl text-brand-text-muted">
                {isAr 
                  ? 'عملية بسيطة وسريعة تضعك أمام آلاف الفرص التجارية يومياً.' 
                  : 'A simple and fast process that puts you in front of thousands of business opportunities daily.'}
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="w-24 h-24 rounded-full border border-brand-primary flex items-center justify-center text-xs uppercase tracking-widest font-bold rotate-12 hover:rotate-0 transition-transform duration-500">
                {isAr ? 'ابدأ الآن' : 'Start Now'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                <span className="text-8xl font-black text-brand-primary/5 absolute -top-10 -left-4 group-hover:text-brand-teal/10 transition-colors duration-500">
                  {step.number}
                </span>
                <div className="relative z-10 pt-8">
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-brand-teal opacity-0 group-hover:opacity-100 transition-opacity" />
                    {step.title}
                  </h3>
                  <p className="text-lg text-brand-text-muted leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-8 lg:px-24 bg-brand-primary text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-teal/10 blur-[120px]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl lg:text-7xl font-bold tracking-tighter mb-8">
            {isAr ? 'هل أنت مستعد لمضاعفة مبيعاتك؟' : 'Ready to double your sales?'}
          </h2>
          <p className="text-xl opacity-70 mb-12 max-w-2xl mx-auto">
            {isAr 
              ? 'انضم إلى شبكة الموردين الأكثر ذكاءً في المنطقة وابدأ في استلام الطلبات الحقيقية اليوم.' 
              : 'Join the smartest supplier network in the region and start receiving real requests today.'}
          </p>
          <button
            onClick={onStart}
            className="bg-white text-brand-primary px-12 py-6 rounded-full text-xl font-bold hover:bg-brand-teal hover:text-white transition-all duration-300 shadow-2xl hover:scale-105"
          >
            {isAr ? 'سجل حسابك مجاناً' : 'Register Your Account for Free'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 lg:px-24 border-t border-brand-border bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            {siteLogo ? (
              <img src={siteLogo} alt={siteName} className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                <Zap className="text-white w-4 h-4" />
              </div>
            )}
            <span className="font-bold tracking-tighter text-xl">{siteName}</span>
          </div>
          <div className="flex gap-8 text-sm font-medium opacity-60">
            <a href="#" className="hover:opacity-100 transition-opacity">{isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}</a>
            <a href="#" className="hover:opacity-100 transition-opacity">{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</a>
            <a href="#" className="hover:opacity-100 transition-opacity">{isAr ? 'اتصل بنا' : 'Contact Us'}</a>
          </div>
          <div className="text-sm opacity-40">
            © 2026 Connect AI. {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .writing-vertical-rl {
          writing-mode: vertical-rl;
        }
      `}} />
    </div>
  );
};

export default SupplierLandingPage;
