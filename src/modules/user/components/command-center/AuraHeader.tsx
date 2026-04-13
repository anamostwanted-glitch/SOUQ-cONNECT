import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { User as UserIcon, ShieldCheck, Camera, Share2, ExternalLink } from 'lucide-react';
import { UserProfile } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { Badge } from '../../../../shared/components/ui/badge';

interface AuraHeaderProps {
  profile: UserProfile;
  onViewProfile: (uid: string) => void;
  onShare: () => void;
  onOpenSettings: () => void;
  glassClass: string;
}

export const AuraHeader: React.FC<AuraHeaderProps> = ({
  profile,
  onViewProfile,
  onShare,
  onOpenSettings,
  glassClass
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-12"
    >
      <div className={`relative overflow-hidden rounded-[3.5rem] ${glassClass} p-8 md:p-14 border-2 border-white/50 dark:border-slate-700/50 shadow-2xl`}>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-brand-teal/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.05)_100%)]" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-16">
          <div className="relative group">
            <div className="absolute -inset-6 bg-gradient-to-tr from-brand-primary via-brand-warning to-brand-teal rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000 animate-gradient-xy" />
            <div className="relative w-36 h-36 md:w-48 md:h-48 rounded-[3rem] p-1 bg-gradient-to-tr from-brand-primary/20 to-brand-teal/20 shadow-2xl overflow-hidden">
              <div className="w-full h-full rounded-[2.8rem] bg-white dark:bg-slate-800 overflow-hidden border-4 border-white dark:border-slate-800">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-primary bg-brand-primary/5">
                    <UserIcon size={80} strokeWidth={1} />
                  </div>
                )}
              </div>
            </div>
            <HapticButton 
              onClick={onOpenSettings}
              className="absolute -bottom-2 -right-2 w-12 h-12 bg-brand-primary text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 transition-transform border-4 border-white dark:border-slate-900"
            >
              <Camera size={20} />
            </HapticButton>
          </div>

          <div className="flex-1 text-center md:text-left rtl:md:text-right">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 mb-6">
              <h1 className="text-4xl md:text-6xl font-black text-brand-text-main tracking-tight leading-none">
                {profile.name}
              </h1>
              {profile.isVerified && (
                <Badge className="bg-brand-primary/10 text-brand-primary border-none text-[10px] uppercase tracking-widest font-black py-2 px-4 rounded-full mb-1">
                  {isRtl ? 'حساب موثق' : 'Verified Identity'}
                </Badge>
              )}
            </div>
            
            <p className="text-brand-text-muted text-lg font-medium mb-8 max-w-2xl mx-auto md:mx-0 leading-relaxed">
              {profile.bio || (isRtl ? 'لم يتم إضافة نبذة شخصية بعد. ابدأ بتعريف نفسك للعالم!' : 'No bio added yet. Start by introducing yourself to the world!')}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <div className="px-6 py-3 rounded-[1.5rem] bg-brand-teal/5 border border-brand-teal/10 flex items-center gap-4 group hover:bg-brand-teal/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-brand-teal text-white flex items-center justify-center shadow-lg shadow-brand-teal/20">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest">{isRtl ? 'مؤشر الثقة' : 'Trust Index'}</p>
                  <p className="text-xl font-black text-brand-text-main">98%</p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <HapticButton 
                  onClick={onShare}
                  className="w-14 h-14 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-primary shadow-xl hover:bg-brand-primary hover:text-white transition-all"
                  title={isRtl ? 'مشاركة' : 'Share'}
                >
                  <Share2 size={24} />
                </HapticButton>
                <HapticButton 
                  onClick={() => onViewProfile(profile.uid)}
                  className="w-14 h-14 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-teal shadow-xl hover:bg-brand-teal hover:text-white transition-all"
                  title={isRtl ? 'معاينة المتجر' : 'Preview Store'}
                >
                  <ExternalLink size={24} />
                </HapticButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
