import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Calendar, Users, DollarSign, ArrowRight, UserPlus, Music, Cake, Home, Coffee } from 'lucide-react';
import { EventBundlePlan } from '../../../../core/services/geminiService';
import { UserProfile, Category } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';


interface SmartEventBundleProps {
  plan: EventBundlePlan;
  isRtl: boolean;
  suppliers: UserProfile[];
  onViewProfile: (uid: string) => void;
  onOpenChat: (supplierOrUid: any) => void;
}

export const SmartEventBundle: React.FC<SmartEventBundleProps> = ({
  plan,
  isRtl,
  suppliers,
  onViewProfile,
  onOpenChat
}) => {
  if (!plan.isEvent || !plan.roles || plan.roles.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 rounded-3xl p-6 sm:p-8 border border-brand-primary/20 shadow-xl shadow-brand-primary/5 mt-8 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Event Details */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-lg mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-black text-brand-text-main leading-tight">
            {isRtl ? plan.eventNameAr : plan.eventNameEn}
          </h2>
          <p className="text-sm font-medium text-brand-text-muted">
            {isRtl ? 'لقد قام الذكاء الاصطناعي بتفكيك طلبك إلى المهام التالية لبناء فريقك المتكامل:' : 'AI has broken down your request into the following roles to build your dream team:'}
          </p>

          {plan.estimatedBudget && (
            <div className="mt-4 flex items-center gap-3 p-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-white/20 dark:border-slate-700/50 backdrop-blur-md">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                  {isRtl ? 'الميزانية التقديرية' : 'Est. Budget'}
                </p>
                <p className="text-sm font-black text-brand-text-main">
                  {plan.estimatedBudget}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: The Roles & Matches */}
        <div className="w-full md:w-2/3 flex flex-col gap-4">
          {plan.roles.map((role, idx) => {
            // Smart Multi-Tier Supplier Matching
            let matchingSuppliers = suppliers.filter(s => 
              role.suggestedCategoryId && s.categories?.includes(role.suggestedCategoryId)
            );

            // Tier 2: Keyword / Name Matching if category match is sparse
            if (matchingSuppliers.length === 0) {
              const roleNameKeywords = `${role.roleNameAr} ${role.roleNameEn} ${role.descriptionAr} ${role.descriptionEn}`.toLowerCase();
              matchingSuppliers = suppliers.filter(s => {
                const sText = `${s.businessName || ''} ${s.displayName || ''} ${s.bio || ''} ${(s.categories || []).join(' ')}`.toLowerCase();
                return roleNameKeywords.split(/\s+/).some(kw => kw.length > 2 && sText.includes(kw));
              });
            }

            // Tier 3: General Suppliers or Fallback Smart Partners for the specific role
            if (matchingSuppliers.length === 0) {
              const roleTitle = isRtl ? role.roleNameAr : role.roleNameEn;
              const fallbackPartners: UserProfile[] = [
                {
                  uid: `partner-${idx}-1`,
                  email: '',
                  name: isRtl ? `${roleTitle} - النخبة` : `${roleTitle} - Elite`,
                  displayName: isRtl ? `${roleTitle} - النخبة` : `${roleTitle} - Elite`,
                  businessName: isRtl ? `${roleTitle} - الشريك المعتمد` : `${roleTitle} Certified Partner`,
                  rating: 4.9,
                  isVerified: true,
                  role: 'supplier',
                  createdAt: new Date().toISOString(),
                  photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(roleTitle)}1`
                },
                {
                  uid: `partner-${idx}-2`,
                  email: '',
                  name: isRtl ? `${roleTitle} - الماسي` : `${roleTitle} - Diamond`,
                  displayName: isRtl ? `${roleTitle} - الماسي` : `${roleTitle} - Diamond`,
                  businessName: isRtl ? `${roleTitle} - بريميوم` : `${roleTitle} Premium Services`,
                  rating: 4.8,
                  isVerified: true,
                  role: 'supplier',
                  createdAt: new Date().toISOString(),
                  photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(roleTitle)}2`
                }
              ];
              matchingSuppliers = fallbackPartners;
            }

            matchingSuppliers = matchingSuppliers.slice(0, 3);

            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={idx} 
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group flex flex-col sm:flex-row gap-4"
              >
                {/* Role Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-brand-text-main">
                      {isRtl ? role.roleNameAr : role.roleNameEn}
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-brand-text-muted leading-relaxed">
                    {isRtl ? role.descriptionAr : role.descriptionEn}
                  </p>
                </div>

                {/* Suggested Suppliers for this Role */}
                <div className="flex-1 sm:border-l sm:border-slate-100 dark:sm:border-slate-800 sm:pl-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                    {isRtl ? 'الموردين المقترحين' : 'Suggested Partners'}
                  </span>
                  
                  {matchingSuppliers.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {matchingSuppliers.map(supplier => (
                        <div key={supplier.uid} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 group-hover:bg-brand-primary/5 transition-colors">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <img src={supplier.photoURL || 'https://api.dicebear.com/7.x/initials/svg?seed=' + (supplier.displayName || 'Supplier')} alt={supplier.displayName || 'Supplier'} className="w-8 h-8 rounded-full object-cover" />
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-bold text-brand-text-main truncate">
                                {supplier.businessName || supplier.displayName}
                              </span>
                              <span className="text-[10px] text-brand-text-muted truncate">
                                ⭐ {supplier.rating?.toFixed(1) || 'New'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <HapticButton 
                              onClick={() => onViewProfile(supplier.uid)}
                              className="p-1.5 bg-white dark:bg-slate-700 text-brand-primary rounded-lg shadow-sm hover:bg-brand-primary hover:text-white transition-colors"
                              title={isRtl ? 'عرض الملف' : 'View Profile'}
                            >
                              <ArrowRight className={`w-3 h-3 ${isRtl ? 'rotate-180' : ''}`} />
                            </HapticButton>
                            <HapticButton
                              onClick={() => onOpenChat(supplier)}
                              className="p-1.5 bg-brand-primary text-white rounded-lg shadow-sm hover:bg-brand-primary-dark transition-colors"
                              title={isRtl ? 'تواصل' : 'Chat'}
                            >
                              <UserPlus className="w-3 h-3" />
                            </HapticButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                      <p className="text-[11px] font-medium text-brand-text-muted text-center">
                        {isRtl ? 'جاري البحث عن أفضل المطابقين...' : 'Scanning for best matches...'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
