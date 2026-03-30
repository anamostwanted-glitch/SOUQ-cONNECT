import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Package, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface RoleSelectionProps {
  onSelect: (role: 'customer' | 'supplier') => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelect }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 bg-brand-background/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-brand-text-muted text-lg max-w-md mx-auto">
          {isAr 
            ? 'اختر نوع الحساب للمتابعة والوصول إلى الخدمات المخصصة لك' 
            : 'Choose your account type to continue and access personalized services'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Customer Option */}
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('customer')}
          className="group relative bg-white p-8 rounded-[2.5rem] shadow-xl shadow-brand-border/50 border border-brand-border-light text-right flex flex-col items-start transition-all hover:border-brand-primary overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:bg-brand-primary/20" />
          
          <div className="relative z-10 p-4 bg-brand-primary rounded-2xl text-white mb-6 shadow-lg shadow-brand-primary/30">
            <User size={32} />
          </div>
          
          <h3 className="relative z-10 text-2xl font-bold text-brand-text-main mb-2">
            {isAr ? 'أنا مستخدم / عميل' : 'I am a User / Customer'}
          </h3>
          <p className="relative z-10 text-brand-text-muted text-sm mb-8 text-right leading-relaxed">
            {isAr 
              ? 'ابحث عن المنتجات، اطلب عروض أسعار، وتواصل مع الموردين مباشرة بكل سهولة.' 
              : 'Search for products, request quotes, and communicate with suppliers directly with ease.'}
          </p>
          
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-primary font-bold group-hover:gap-4 transition-all">
            <span>{isAr ? 'دخول المستخدمين' : 'User Login'}</span>
            <ArrowRight size={20} className={isAr ? 'rotate-180' : ''} />
          </div>
        </motion.button>

        {/* Supplier Option */}
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect('supplier')}
          className="group relative bg-brand-text-main p-8 rounded-[2.5rem] shadow-xl shadow-brand-text-main/20 border border-brand-border text-right flex flex-col items-start transition-all hover:border-brand-primary overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-text-main rounded-bl-[5rem] -mr-8 -mt-8 transition-all group-hover:bg-brand-text-main" />
          
          <div className="relative z-10 p-4 bg-brand-primary rounded-2xl text-white mb-6 shadow-lg shadow-brand-primary/50/20">
            <Package size={32} />
          </div>
          
          <h3 className="relative z-10 text-2xl font-bold text-white mb-2">
            {isAr ? 'أنا مورد / شركة' : 'I am a Supplier / Company'}
          </h3>
          <p className="relative z-10 text-brand-text-muted text-sm mb-8 text-right leading-relaxed">
            {isAr 
              ? 'اعرض منتجاتك، استقبل طلبات العملاء، وقم بزيادة مبيعاتك من خلال منصتنا.' 
              : 'Showcase your products, receive customer requests, and increase your sales through our platform.'}
          </p>
          
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-primary font-bold group-hover:gap-4 transition-all">
            <span>{isAr ? 'دخول الموردين' : 'Supplier Login'}</span>
            <ArrowRight size={20} className={isAr ? 'rotate-180' : ''} />
          </div>
        </motion.button>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-brand-text-muted text-sm"
      >
        {isAr ? 'منصة الربط بين الموردين والعملاء بالذكاء الاصطناعي' : 'AI-Powered Platform Connecting Suppliers and Customers'}
      </motion.div>
    </div>
  );
};

export default RoleSelection;
