import React from 'react';
import { Mail, Phone, MapPin, Globe, Shield, ArrowUpRight } from 'lucide-react';
import { useSettings } from '../../../../core/providers/SettingsProvider';

interface FooterProps {
  onNavigate: (view: string) => void;
  isRtl: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isRtl }) => {
  const { settings } = useSettings();
  const currentYear = new Date().getFullYear();

  const platformAbout = isRtl 
    ? (settings?.footerAboutAr || 'سوق كونكت هو المنصة الأولى المدعومة بالذكاء الاصطناعي للربط بين المؤسسات والموردين في الشرق الأوسط.') 
    : (settings?.footerAboutEn || 'Connect is the Middle East\'s premier AI-powered B2B marketplace, connecting institutions with trusted suppliers.');

  const copyrightText = isRtl
    ? (settings?.footerCopyrightAr || `جميع الحقوق محفوظة © ${currentYear} سوق كونكت.`)
    : (settings?.footerCopyrightEn || `All rights reserved © ${currentYear} Connect Marketplace.`);

  const address = isRtl
    ? (settings?.footerAddressAr || 'دبي، الإمارات العربية المتحدة')
    : (settings?.footerAddressEn || 'Dubai, United Arab Emirates');

  const links = [
    { label: isRtl ? 'الرئيسية' : 'Home', action: () => onNavigate('home') },
    { label: isRtl ? 'السوق' : 'Market', action: () => onNavigate('marketplace') },
    { label: isRtl ? 'الأحكام' : 'Terms', action: () => onNavigate('terms') },
    { label: isRtl ? 'الخصوصية' : 'Privacy', action: () => onNavigate('privacy') },
    { label: isRtl ? 'المساعدة' : 'Help', action: () => onNavigate('help') },
  ];

  return (
    <footer className="hidden md:block bg-brand-background border-t border-brand-border pt-12 pb-8 overflow-hidden relative">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-primary/2 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-12">
          {/* Brand & About */}
          <div className="max-w-md space-y-4">
            <div className="flex flex-col items-start gap-3 group cursor-pointer" onClick={() => onNavigate('home')}>
              {settings?.footerLogoUrl ? (
                <img src={settings.footerLogoUrl} alt="Connect Logo" className="h-10 w-auto object-contain transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                  <span className="text-white font-black text-sm tracking-tighter">C</span>
                </div>
              )}
              <span className="text-xl font-black text-brand-text-main tracking-tighter uppercase">
                {settings?.siteName || 'CONNECT'}<span className="text-brand-primary">.</span>
              </span>
            </div>
            <p className="text-sm text-brand-text-muted leading-relaxed font-medium">
              {platformAbout}
            </p>
          </div>

          {/* Quick Contact & Links */}
          <div className="flex flex-wrap gap-x-16 gap-y-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-brand-text-main uppercase tracking-[0.2em]">
                {isRtl ? 'روابط سريعة' : 'Quick Access'}
              </h4>
              <nav className="flex flex-wrap gap-x-6 gap-y-2">
                {links.map((link, idx) => (
                  <button
                    key={idx}
                    onClick={link.action}
                    className="text-sm text-brand-text-muted hover:text-brand-primary transition-colors font-semibold flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight size={12} className="opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" />
                  </button>
                ))}
              </nav>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-brand-text-main uppercase tracking-[0.2em]">
                {isRtl ? 'بيانات التواصل' : 'Contact'}
              </h4>
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {settings?.footerEmail && (
                  <a href={`mailto:${settings.footerEmail}`} className="text-sm text-brand-text-muted hover:text-brand-primary transition-colors flex items-center gap-2 font-semibold">
                    <Mail size={14} className="text-brand-primary" />
                    {settings.footerEmail}
                  </a>
                )}
                <div className="text-sm text-brand-text-muted flex items-center gap-2 font-semibold">
                  <MapPin size={14} className="text-brand-primary" />
                  {address}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Bottom Bar */}
        <div className="pt-8 border-t border-brand-border/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <p className="text-[11px] text-brand-text-muted font-bold opacity-70">
              {copyrightText}
            </p>
            {settings?.footerShowSecurityBadge && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-primary/5 border border-brand-primary/10 rounded-md">
                <Shield className="text-brand-primary" size={10} />
                <span className="text-[9px] font-black text-brand-primary uppercase tracking-wider">
                  {isRtl ? 'محمي' : 'Secured'}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {settings?.footerWebsite && (
              <a href={settings.footerWebsite} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-brand-text-muted hover:text-brand-primary flex items-center gap-1.5 transition-colors">
                <Globe size={12} />
                {settings.footerWebsite.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
