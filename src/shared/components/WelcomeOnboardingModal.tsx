import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Building2, ShoppingBag, ShieldCheck, ArrowRight, ArrowLeft, X, Check, Store, Users, Zap } from 'lucide-react';
import { UserRole } from '../../core/types';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserRole;
  userName?: string;
  onNavigate: (view: string) => void;
}

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  isOpen,
  onClose,
  userRole = 'customer',
  userName = '',
  onNavigate
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const isSupplier = userRole === 'supplier';
  const isAdmin = userRole === 'admin';

  const steps = isSupplier ? [
    {
      icon: Building2,
      title: isRtl ? 'إكمال ملف المورد المعتمد' : 'Complete Verified Supplier Profile',
      desc: isRtl 
        ? 'أضف بيانات شركتك، وسائل التواصل، وشارة المورد المعتمد لزيادة موثوقية طلبات الشراء'
        : 'Add your business details, social links, and verification badge to build buyer trust',
      actionLabel: isRtl ? 'تحديث البيانات' : 'Update Profile',
      view: 'supplier'
    },
    {
      icon: Sparkles,
      title: isRtl ? 'التصنيف الذكي للفئات' : 'Smart Category Selection',
      desc: isRtl
        ? 'اختر الفئات التي توردها بدقة ليصلك تنبيهات فورية بالطلبيات والمناقصات المطابقة لنشاطك'
        : 'Select supply categories to automatically receive matching buyer RFQs and leads',
      actionLabel: isRtl ? 'اختيار الفئات' : 'Select Categories',
      view: 'supplier'
    },
    {
      icon: Zap,
      title: isRtl ? 'تقديم العروض والتوصل المباشر' : 'Submit Quotes & Chat',
      desc: isRtl
        ? 'قدم أسعارك وعروضك للمشتري ودردش فورياً عبر المحادثة الذكية أو الواتساب المباشر'
        : 'Send quotes to buyers and communicate via live chat or direct WhatsApp',
      actionLabel: isRtl ? 'استعراض الطلبيات' : 'View RFQs',
      view: 'marketplace'
    }
  ] : isAdmin ? [
    {
      icon: Users,
      title: isRtl ? 'إدارة المستخدمين والموردين' : 'Manage Users & Suppliers',
      desc: isRtl
        ? 'اعتماد حسابات الموردين الجديدة ومتابعة صلاحيات المستخدمين والتقارير'
        : 'Approve new supplier registrations, manage user accounts, and track metrics',
      actionLabel: isRtl ? 'لوحة الإدارة' : 'Admin Dashboard',
      view: 'admin'
    },
    {
      icon: Sparkles,
      title: isRtl ? 'قاموس الطلب والذكاء الاصطناعي (Lexicon)' : 'Demand Lexicon & AI',
      desc: isRtl
        ? 'حلل الكلمات الأكثر بحثاً وطلباً وتوقع اتجاهات السوق والمجالات المطلوبة'
        : 'Analyze trending buyer search terms and predict market supply demands',
      actionLabel: isRtl ? 'تحليلات الذكاء' : 'AI Analytics',
      view: 'admin'
    }
  ] : [
    {
      icon: ShoppingBag,
      title: isRtl ? 'استكشاف السوق والموردين' : 'Explore Market & Suppliers',
      desc: isRtl
        ? 'تصفح آلاف المنتجات والخدمات والموردين المعتمدين بأسعار تنافسية'
        : 'Browse thousands of products, services, and verified suppliers with competitive prices',
      actionLabel: isRtl ? 'تصفح السوق' : 'Browse Marketplace',
      view: 'marketplace'
    },
    {
      icon: Sparkles,
      title: isRtl ? 'إنشاء طلب توريد بالذكاء الاصطناعي' : 'Post AI Buying Request',
      desc: isRtl
        ? 'اكتب مواصفات طلبك وسيقوم الذكاء الاصطناعي بربطك بأفضل الموردين المناسبين تلقائياً'
        : 'Describe what you need and AI will automatically match you with top verified suppliers',
      actionLabel: isRtl ? 'إنشاء طلب جديد' : 'Post RFQ',
      view: 'home'
    }
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleAction = (targetView: string) => {
    onClose();
    onNavigate(targetView);
  };

  const currentStep = steps[activeStep];
  const IconComp = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden dir-rtl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Decorative Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold flex items-center gap-1.5">
            <Sparkles size={14} />
            <span>
              {isRtl ? `دليل البداية السريعة ${userName ? `• أهلاً ${userName}` : ''}` : `Quick Start Guide ${userName ? `• Welcome ${userName}` : ''}`}
            </span>
          </div>
        </div>

        {/* Welcome Headline */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
          {isRtl ? 'مرحباً بك في سوق كونكت!' : 'Welcome to Souq Connect!'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          {isRtl
            ? 'منصتك المعتمدة للربط بين المؤسسات والموردين بالذكاء الاصطناعي. إليك خطوات البداية:'
            : 'Your AI-powered procurement marketplace. Here is how to get started:'}
        </p>

        {/* Step Progress Dots */}
        <div className="flex gap-2 mb-6">
          {steps.map((_, idx) => (
            <div
              key={`welcome-dot-${idx}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === activeStep ? 'w-8 bg-brand-primary' : 'w-2 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step Visual Card */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <IconComp size={24} />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {currentStep.title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {currentStep.desc}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => handleAction(currentStep.view)}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all"
          >
            {currentStep.actionLabel}
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-lg shadow-brand-primary/20 hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <span>{activeStep < steps.length - 1 ? (isRtl ? 'التالي' : 'Next') : (isRtl ? 'فهمت، ابدأ الآن' : 'Got it, let\'s go')}</span>
            {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
