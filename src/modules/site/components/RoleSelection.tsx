import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Package, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { soundService, SoundType } from '../../../core/utils/soundService';

interface RoleSelectionProps {
  onSelect: (role: 'customer' | 'supplier') => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelect }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const handleSelect = (role: 'customer' | 'supplier') => {
    soundService.play(SoundType.SUCCESS);
    if (navigator.vibrate) navigator.vibrate(20);
    onSelect(role);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 bg-brand-background/30">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold mb-4">
          <ShieldCheck size={14} />
          {isAr ? 'بيئة آمنة ومدققة برمجياً' : 'Secure & Audited Environment'}
        </div>
        <p className="text-brand-text-muted text-lg max-w-md mx-auto">
          {isAr 
            ? 'اختر نوع الحساب للمتابعة والوصول إلى الخدمات المخصصة لك' 
            : 'Choose your account type to continue and access personalized services'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Customer Option */}
        <motion.button
          whileHover={{ scale: 1.02, y: -8 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelect('customer')}
          className="group relative bg-white p-10 rounded-[3rem] shadow-2xl shadow-brand-primary/5 border border-brand-border-light text-right flex flex-col items-start transition-all hover:border-brand-primary/50 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/5 rounded-bl-[6rem] -mr-12 -mt-12 transition-all group-hover:bg-brand-primary/10" />
          
          <div className="relative z-10 p-5 bg-gradient-to-br from-brand-primary to-brand-teal rounded-2xl text-white mb-8 shadow-xl shadow-brand-primary/30">
            <User size={36} />
          </div>
          
          <h3 className="relative z-10 text-3xl font-black text-brand-text-main mb-3">
            {isAr ? 'أنا مستخدم / عميل' : 'I am a User / Customer'}
          </h3>
          <p className="relative z-10 text-brand-text-muted text-base mb-10 text-right leading-relaxed opacity-90">
            {isAr 
              ? 'ابحث عن المنتجات، اطلب عروض أسعار، وتواصل مع الموردين مباشرة بكل سهولة.' 
              : 'Search for products, request quotes, and communicate with suppliers directly with ease.'}
          </p>
          
          <div className="relative z-10 mt-auto flex items-center gap-3 text-brand-primary font-black uppercase tracking-wider text-sm group-hover:gap-5 transition-all">
            <span>{isAr ? 'دخول المستخدمين' : 'User Portal'}</span>
            <ArrowRight size={20} className={isAr ? 'rotate-180' : ''} />
          </div>
        </motion.button>

        {/* Supplier Option */}
        <motion.button
          whileHover={{ scale: 1.02, y: -8 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelect('supplier')}
          className="group relative bg-slate-900 p-10 rounded-[3rem] shadow-2xl shadow-slate-900/40 border border-slate-800 text-right flex flex-col items-start transition-all hover:border-brand-primary/50 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/10 rounded-bl-[6rem] -mr-12 -mt-12 transition-all group-hover:bg-brand-primary/20" />
          
          <div className="relative z-10 p-5 bg-brand-primary rounded-2xl text-white mb-8 shadow-xl shadow-brand-primary/50">
            <Package size={36} />
          </div>
          
          <h3 className="relative z-10 text-3xl font-black text-white mb-3">
            {isAr ? 'أنا مورد / شركة' : 'I am a Supplier / Company'}
          </h3>
          <p className="relative z-10 text-slate-400 text-base mb-10 text-right leading-relaxed opacity-90">
            {isAr 
              ? 'اعرض منتجاتك، استقبل طلبات العملاء، وقم بزيادة مبيعاتك من خلال منصتنا.' 
              : 'Showcase your products, receive customer requests, and increase your sales through our platform.'}
          </p>
          
          <div className="relative z-10 mt-auto flex items-center gap-3 text-brand-primary font-black uppercase tracking-wider text-sm group-hover:gap-5 transition-all">
            <span>{isAr ? 'دخول الموردين' : 'Supplier Hub'}</span>
            <ArrowRight size={20} className={isAr ? 'rotate-180' : ''} />
          </div>
        </motion.button>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 flex items-center gap-4 text-brand-text-muted text-sm font-medium"
      >
        <span className="w-8 h-[1px] bg-brand-border-light" />
        {isAr ? 'مدعوم بتقنيات الذكاء الاصطناعي' : 'Powered by Connect AI Technologies'}
        <span className="w-8 h-[1px] bg-brand-border-light" />
      </motion.div>
    </div>
  );
};

export default RoleSelection;
