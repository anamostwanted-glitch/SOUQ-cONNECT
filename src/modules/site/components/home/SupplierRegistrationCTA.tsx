import React from 'react';
import { motion } from 'motion/react';
import { Sparkles as SparklesIcon, ArrowRight, Building2, Package } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';

interface SupplierRegistrationCTAProps {
  isRtl: boolean;
  i18n: any;
  onNavigate: (view: any) => void;
}

export const SupplierRegistrationCTA: React.FC<SupplierRegistrationCTAProps> = ({ isRtl, i18n, onNavigate }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-32 relative group overflow-hidden rounded-[4rem] bg-white/40 dark:bg-gray-900/40 backdrop-blur-3xl border border-white/40 dark:border-gray-700/50 shadow-2xl shadow-brand-primary/10"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-teal/5 group-hover:opacity-100 transition-opacity duration-1000" />
      <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-brand-teal/10 rounded-full blur-[120px] group-hover:scale-125 transition-transform duration-1000" />
      <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] bg-brand-primary/10 rounded-full blur-[120px] group-hover:scale-125 transition-transform duration-1000" />
      
      <div className="relative z-10 p-8 md:p-24 flex flex-col lg:flex-row items-center justify-between gap-16">
        <div className="text-center lg:text-left max-w-3xl">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-brand-teal/10 text-brand-teal font-black text-sm mb-8 border border-brand-teal/20 shadow-sm">
            <SparklesIcon size={18} />
            {i18n.language === 'ar' ? 'للموردين والشركات المتميزة' : 'For Premium Suppliers & Businesses'}
          </div>
          <h3 className="text-3xl md:text-6xl lg:text-7xl font-black mb-8 text-brand-text-main tracking-tight leading-[1.1]">
            {i18n.language === 'ar' ? 'هل أنت مورد؟' : 'Are you a supplier?'}
          </h3>
          <p className="text-lg md:text-2xl text-brand-text-muted mb-12 leading-relaxed font-medium">
            {i18n.language === 'ar' 
              ? 'انضم إلى شبكتنا الحصرية من الموردين المتميزين. ابدأ في تلقي طلبات المنتجات من العملاء، وسّع نطاق عملك، وزد مبيعاتك بكل سهولة واحترافية.' 
              : 'Join our exclusive network of premium suppliers. Start receiving product requests from customers, expand your reach, and grow your sales with ease and professionalism.'}
          </p>
          <HapticButton
            onClick={() => onNavigate('auth-supplier')}
            className="group/btn relative overflow-hidden bg-gradient-to-r from-brand-teal via-brand-primary to-brand-teal bg-[length:200%_auto] animate-gradient-x text-white px-12 py-6 rounded-[2rem] text-xl font-black shadow-2xl shadow-brand-teal/30 hover:shadow-brand-teal/50 transition-all hover:-translate-y-2 flex items-center justify-center gap-4 w-full md:w-auto"
          >
            <span className="relative z-10 flex items-center gap-4">
              {i18n.language === 'ar' ? 'سجل كمورد الآن' : 'Register as Supplier Now'}
              <ArrowRight size={28} className={`group-hover/btn:translate-x-2 transition-transform ${isRtl ? 'rotate-180 group-hover/btn:-translate-x-2' : ''}`} />
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-out" />
          </HapticButton>
        </div>
        
        <div className="hidden lg:flex relative w-80 h-80 shrink-0 items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/30 to-brand-primary/30 rounded-full animate-pulse-slow blur-3xl" />
          <motion.div 
            animate={{ 
              y: [0, -20, 0],
              rotate: [0, 5, 0]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-64 h-64 bg-white/60 dark:bg-gray-900/60 backdrop-blur-3xl rounded-[3rem] border border-white/40 dark:border-gray-700/50 shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-1000"
          >
            <Building2 size={120} className="text-brand-teal opacity-80" strokeWidth={1} />
            {/* Floating Elements */}
            <div className="absolute -top-6 -right-6 p-4 bg-brand-primary text-white rounded-2xl shadow-xl animate-bounce-slow">
              <Package size={32} />
            </div>
            <div className="absolute -bottom-6 -left-6 p-4 bg-brand-teal text-white rounded-2xl shadow-xl animate-bounce-slow" style={{ animationDelay: '1s' }}>
              <SparklesIcon size={32} />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
