import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, HardHat, Mail, Globe, Sparkles } from 'lucide-react';
import { SiteSettings } from '../../core/types';

interface MaintenancePageProps {
  settings?: SiteSettings | null;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ settings }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  return (
    <div className="min-h-screen bg-brand-background flex flex-col items-center justify-center p-6 relative overflow-y-auto font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-teal/10 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      {/* Content Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-2xl w-full text-center space-y-12"
      >
        {/* Branding Section */}
        <div className="flex flex-col items-center space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="relative w-32 h-32 md:w-48 md:h-48"
          >
            <div className="absolute inset-0 bg-brand-primary/20 rounded-[2rem] md:rounded-[3rem] blur-2xl animate-pulse" />
            <div className="relative w-full h-full bg-brand-surface border border-brand-border rounded-[2rem] md:rounded-[3rem] flex items-center justify-center overflow-hidden shadow-2xl">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.siteName} className="w-10/12 h-10/12 object-contain" />
              ) : (
                <span className="text-4xl md:text-6xl font-black text-brand-primary">SC</span>
              )}
            </div>
            
            <div className="absolute -bottom-2 -right-2 bg-brand-primary text-white p-2 md:p-3 rounded-2xl shadow-xl border-4 border-brand-background">
              <HardHat size={20} className="md:w-6 md:h-6" />
            </div>
          </motion.div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-black text-brand-text-main tracking-tight">
              {isRtl ? 'نحن نبني المستقبل' : 'Building the Future'}
            </h1>
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-brand-border" />
              <div className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest border border-brand-primary/20">
                <Sparkles size={12} className="animate-pulse" />
                {isRtl ? 'سوق كونكت قيد التطوير' : 'Souq Connect Under Construction'}
              </div>
              <span className="h-px w-8 bg-brand-border" />
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="bg-brand-surface/40 backdrop-blur-xl border border-brand-border rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <ShieldCheck size={120} />
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <p className="text-base md:text-xl text-brand-text-main font-medium leading-relaxed">
                {isRtl 
                  ? 'مرحباً بكم في الموقع الرسمي لسوق كونكت. نحن نجري حالياً تحديثات جذرية لنقدم لكم تجربة تسوق Multi-Vendor MarketPlace فريدة وذكية.' 
                  : 'Welcome to the official Souq Connect platform. We are currently undergoing radical updates to bring you a unique and intelligent Multi-Vendor MarketPlace experience.'}
              </p>
              
              <p className="text-sm md:text-base text-brand-text-muted font-bold">
                {isRtl 
                  ? 'سنكون معكم قريباً بحلة جديدة وعروض حصرية. شكراً لصبركم.' 
                  : 'We will be back with you soon with a fresh look and exclusive offers. Thank you for your patience.'}
              </p>
            </div>

            {/* Admin Entry Button - Centered and Visible */}
            <div className="flex justify-center pt-4">
              <a 
                href="/auth" 
                className="flex items-center gap-2 px-8 py-4 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-primary/20"
              >
                <ShieldCheck size={18} />
                {isRtl ? 'دخول الإدارة' : 'Admin Access'}
              </a>
            </div>

            <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-brand-border/50">
              <div className="flex items-center gap-4 p-4 bg-brand-background/60 rounded-2xl border border-brand-border">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                  <Mail size={18} />
                </div>
                <div className="text-left rtl:text-right">
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'للتواصل' : 'Contact'}</p>
                  <p className="text-xs font-black text-brand-text-main">{settings?.footerEmail || 'support@connect.ai'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-brand-background/60 rounded-2xl border border-brand-border">
                <div className="w-10 h-10 bg-brand-teal/10 rounded-xl flex items-center justify-center text-brand-teal">
                  <Globe size={18} />
                </div>
                <div className="text-left rtl:text-right">
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'آخر التحديثات' : 'Stay Tuned'}</p>
                  <p className="text-xs font-black text-brand-text-main">@connect_marketplace</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-12 flex flex-col items-center gap-6">
          <div className="text-brand-text-muted text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">
            All Rights Reserved © 2026 {settings?.siteName || 'Souq Connect'}
          </div>
          
          <a 
            href="/auth" 
            className="text-[10px] font-bold text-brand-text-muted/40 hover:text-brand-primary transition-colors uppercase tracking-widest flex items-center gap-2 group"
          >
            <div className="w-1 h-1 rounded-full bg-current opacity-20 group-hover:opacity-100" />
            {isRtl ? 'دخول الإدارة' : 'Admin Login'}
          </a>
        </div>
      </motion.div>
    </div>
  );
};
