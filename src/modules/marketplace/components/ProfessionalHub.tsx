import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { getChatId } from '../../../core/utils/utils';
import { 
  Briefcase, 
  Search, 
  MapPin, 
  Star, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  Zap,
  Filter,
  X,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { SmartCategoryExplorer } from './SmartCategoryExplorer';
import { SEOHead } from '../../../shared/components/SEOHead';
import { Category, UserProfile } from '../../../core/types';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface ProfessionalHubProps {
  categories: Category[];
  profile: UserProfile | null;
  onViewProfile: (uid: string) => void;
  onOpenChat: (sellerId: string) => void;
  isRtl: boolean;
}

export const ProfessionalHub: React.FC<ProfessionalHubProps> = ({
  categories,
  profile,
  onViewProfile,
  onOpenChat,
  isRtl
}) => {
  const { t } = useTranslation();
  const [showExplorer, setShowExplorer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [verifiedSuppliers, setVerifiedSuppliers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const uniqueSuppliers = React.useMemo(() => {
    return Array.from(new Map(verifiedSuppliers.map(s => [s.uid, s])).values());
  }, [verifiedSuppliers]);

  const uniqueCategories = React.useMemo(() => {
    const raw = categories.filter(c => c.categoryType === 'service' && !c.parentId);
    return Array.from(new Map(raw.map(c => [c.id, c])).values());
  }, [categories]);

  // Growth Hacker Strategy: Real-time dynamic fetching of experts
  useEffect(() => {
    const fetchExperts = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'supplier'),
          where('isVerified', '==', true),
          limit(6)
        );
        const snap = await getDocs(q);
        const suppliers = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setVerifiedSuppliers(suppliers);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'professional_hub_experts', false);
      } finally {
        setLoading(false);
      }
    };
    fetchExperts();
  }, []);

  return (
    <div className="space-y-8 pb-32">
      <SEOHead 
        title={isRtl ? 'رادار الخبراء والخدمات المهنية' : 'Expert Radar & Professional Services'}
        description={isRtl 
          ? 'استكشف واجهة تواصل المحترفين الأكبر. ابحث عن خبراء معتمدين في منطقتك لمشاريعك التجارية والتقنية.' 
          : 'Explore the premier professional radar. Find certified experts in your area for your business and technical projects.'
        }
        keywords={isRtl 
          ? ['خبراء', 'خدمات مهنية', 'استشارات', 'توظيف محترفين', 'سوق الخدمات'] 
          : ['experts', 'professional services', 'consultants', 'hire pros', 'service marketplace']
        }
        type="website"
      />
      
      {/* 1. Neural Service Radar Header (Solution Architect Layout) */}
      <div className="relative overflow-hidden bg-brand-primary rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl">
         <div className="absolute top-0 right-0 p-12 opacity-10 animate-pulse">
            <BrainCircuit size={180} />
         </div>
         
         <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-white/20">
               <Sparkles size={14} className="animate-bounce" />
               {isRtl ? 'رادار الخبراء الذكي' : 'Smart Expert Radar'}
            </span>
            <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
               {isRtl ? 'استقطب نخبة الخبرات لمشاريعك الكبرى' : 'Acquire Elite Expertise for Your Major Projects'}
            </h1>
            <p className="text-lg opacity-80 font-medium mb-8">
               {isRtl ? 'عبر رادار النبض العصبي، نربط منشأتك بأفضل المستشارين والتقنيين المعتمدين في ثوانٍ.' : 'Through our Neural Pulse radar, we connect your enterprise with certified consultants and technicians in seconds.'}
            </p>
            
            <div className="flex flex-wrap gap-4">
               <HapticButton 
                 onClick={() => setShowExplorer(true)}
                 className="px-8 py-4 bg-white text-brand-primary rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center gap-2"
               >
                 <Search size={18} />
                 {isRtl ? 'استكشاف الخدمات' : 'Explore Services'}
               </HapticButton>
               <div className="flex items-center -space-x-3 rtl:space-x-reverse">
                  {uniqueSuppliers.slice(0, 4).map((pro, i) => (
                    <div 
                      key={pro.uid} 
                      className="w-10 h-10 rounded-full border-2 border-brand-primary bg-slate-200 overflow-hidden cursor-pointer"
                      onClick={() => onViewProfile(pro.uid)}
                    >
                       <img src={pro.logoUrl || `https://picsum.photos/seed/${pro.uid}/100/100`} alt="Pro" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                  {verifiedSuppliers.length > 4 && (
                    <div className="w-10 h-10 rounded-full border-2 border-brand-primary bg-brand-primary/20 backdrop-blur-md flex items-center justify-center text-[10px] font-bold">
                       +{verifiedSuppliers.length - 4}
                    </div>
                  )}
               </div>
            </div>
         </div>
      </div>

      {/* 2. Professional Categories Spotlight & Expert List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-xl font-black text-brand-text-main flex items-center gap-2">
                  <Briefcase className="text-brand-primary" size={24} />
                  {isRtl ? 'الفئات المهنية الأكثر طلباً' : 'Top Professional Categories'}
               </h2>
               <button 
                 onClick={() => setShowExplorer(true)} 
                 className="text-xs font-bold text-brand-primary hover:underline"
                >
                  {isRtl ? 'عرض الكل' : 'View All'}
               </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {uniqueCategories.slice(0, 6).map((cat, i) => (
                 <HapticButton
                   key={cat.id}
                   className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 flex flex-col items-start gap-4 group hover:shadow-2xl hover:border-brand-primary/30 transition-all text-start"
                 >
                    <div className="w-14 h-14 rounded-2xl bg-brand-primary/5 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all duration-500">
                       <Zap size={28} />
                    </div>
                    <div>
                       <h4 className="text-sm font-black text-brand-text-main uppercase tracking-widest mb-2 group-hover:text-brand-primary transition-colors">
                          {isRtl ? cat.nameAr : cat.nameEn}
                       </h4>
                       <p className="text-xs text-brand-text-muted font-medium leading-relaxed line-clamp-2">
                          {isRtl ? (cat.descriptionAr || 'خبرات معتمدة لدعم نمو أعمالك وتحقيق أهدافك الإستراتيجية.') : (cat.descriptionEn || 'Certified expertise to support your business growth and strategic goals.')}
                       </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-brand-primary font-black text-[10px] uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                       {isRtl ? 'استكشف الخبراء' : 'Explore Experts'}
                       <ArrowRight size={12} className={isRtl ? 'rotate-180' : ''} />
                    </div>
                 </HapticButton>
               ))}
            </div>
         </div>

         {/* 3. Neural Verified Pros Sidebar (Growth Hacker Engagement) */}
         <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-8">
            <div className="flex items-center gap-3 mb-2">
               <UserCheck className="text-emerald-500" size={28} />
               <div>
                  <h3 className="font-black text-brand-text-main leading-none">{isRtl ? 'خبراء موثقون' : 'Verified Experts'}</h3>
                  <p className="text-[10px] font-bold text-brand-text-muted mt-1 uppercase tracking-widest">{isRtl ? 'نشط الآن' : 'Active Now'}</p>
               </div>
            </div>

            <div className="space-y-6">
               {loading ? (
                 [1, 2, 3].map(i => (
                   <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-12 h-12 rounded-2xl bg-brand-background" />
                      <div className="flex-1 space-y-2">
                         <div className="h-3 bg-brand-background rounded w-3/4" />
                         <div className="h-2 bg-brand-background rounded w-1/2" />
                      </div>
                   </div>
                 ))
               ) : uniqueSuppliers.map((pro, i) => (
                 <div 
                   key={pro.uid} 
                   className="flex items-center justify-between group cursor-pointer" 
                 >
                    <div className="flex items-center gap-4 flex-1" onClick={() => onViewProfile(pro.uid)}>
                       <div className="w-12 h-12 rounded-2xl bg-brand-background overflow-hidden border border-brand-border relative">
                          <img 
                            src={pro.logoUrl || `https://picsum.photos/seed/pro${i}/100/100`} 
                            alt={pro.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                          {/* Performance Marker: Online Status */}
                          <div className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 border-2 border-brand-surface rounded-full shadow-sm" />
                       </div>
                       <div>
                          <div className="flex items-center gap-1">
                             <p className="text-sm font-black text-brand-text-main group-hover:text-brand-primary transition-colors truncate max-w-[120px]">
                                {pro.name}
                             </p>
                             {pro.isVerified && <CheckCircle2 size={12} className="text-brand-primary" />}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                             <Clock size={10} className="text-brand-text-muted" />
                             <p className="text-[10px] text-brand-text-muted font-bold truncate max-w-[100px]">
                                {isRtl ? 'رد خلال دقائق' : 'Responds in mins'}
                             </p>
                          </div>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 px-2 mt-1 py-1 rounded-full text-[10px] font-black border border-amber-500/10 shrink-0">
                          <Star size={10} fill="currentColor" />
                          {pro.rating || '5.0'}
                       </div>
                       <HapticButton 
                         onClick={(e) => {
                           e.stopPropagation();
                           onOpenChat(pro.uid);
                         }}
                         className="w-8 h-8 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:bg-brand-primary/90 transition-all shadow-sm shrink-0"
                       >
                          <MessageSquare size={14} />
                       </HapticButton>
                    </div>
                 </div>
               ))}
            </div>

            <HapticButton className="w-full py-4 bg-brand-background border border-brand-border rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all">
               {isRtl ? 'بث طلب للخبراء' : 'Broadcast to Experts'}
            </HapticButton>
         </div>
      </div>

      {/* 4. Strategic Performance Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="p-8 bg-brand-surface border border-brand-border rounded-[2.5rem] relative overflow-hidden group">
            <div className="relative z-10">
               <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-4 block">
                  {isRtl ? 'تحليل الفرص' : 'Opportunity Analysis'}
               </span>
               <h3 className="text-2xl font-black text-brand-text-main mb-4">
                  {isRtl ? 'زيادة الطلب على الاستشارات التقنية' : 'Surge in Technical Consulting'}
               </h3>
               <p className="text-sm text-brand-text-muted mb-6">
                  {isRtl ? 'تشير بياناتنا أن 40% من الشركات تبحث عن خبراء في التحول الرقمي حالياً.' : 'Data shows 40% of enterprises are currently seeking Digital Transformation experts.'}
               </p>
               <div className="flex items-center gap-2 text-emerald-500 font-black text-xs">
                  <TrendingUp size={16} />
                  +35% {isRtl ? 'نمو في هذا القطاع' : 'Sector growth'}
               </div>
            </div>
         </div>

         <div className="p-8 bg-brand-surface border border-brand-border rounded-[2.5rem] flex items-center justify-between gap-6 group">
            <div>
               <h3 className="text-2xl font-black text-brand-text-main mb-2">
                  {isRtl ? 'ملف الخبير العصبي' : 'Neural Expert Profile'}
               </h3>
               <p className="text-sm text-brand-text-muted mb-6">
                  {isRtl ? 'دعم ملفك الشخصي بالذكاء الاصطناعي يزيد احتمالية اختيار العملاء لك بـ 3 أضعاف.' : 'Empowering your profile with AI insights triples your selection probability.'}
               </p>
               <HapticButton 
                 onClick={() => onOpenChat('admin_support')}
                 className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/20"
               >
                  {isRtl ? 'ترقية ملفي المهني' : 'Upgrade Professional Profile'}
               </HapticButton>
            </div>
            <div className="w-24 h-24 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0 group-hover:rotate-12 transition-transform">
               <ShieldCheck size={48} />
            </div>
         </div>
      </div>

      {/* Full Explorer Modal */}
      <AnimatePresence>
        {showExplorer && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[130] bg-brand-background md:p-4"
          >
            <div className="absolute top-4 right-4 z-50">
              <HapticButton 
                onClick={() => setShowExplorer(false)}
                className="w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full flex items-center justify-center text-brand-text-main shadow-lg border border-brand-border/50"
              >
                <X size={20} />
              </HapticButton>
            </div>
            <SmartCategoryExplorer 
              categories={categories}
              filterType="service"
              onSelectCategory={(id) => {
                setSelectedCategory(id);
                setShowExplorer(false);
              }}
              onVisualSearch={() => {}}
              onHoverCategory={() => {}}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
