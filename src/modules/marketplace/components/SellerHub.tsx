import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  TrendingUp, 
  Eye, 
  MessageSquare, 
  Edit3, 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  Archive, 
  BarChart3,
  Plus,
  ArrowUpRight,
  Clock,
  ExternalLink,
  Trash2,
  Package,
  Share2,
  Copy,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { MarketplaceItem, UserProfile, Category } from '../../../core/types';
import { fetchMarketplaceItems, updateMarketplaceItemStatus, softDeleteMarketplaceItem, getStoreShareUrl } from '../services/marketService';
import { HapticButton } from '../../../shared/components/HapticButton';
import { BlurImage } from '../../../shared/components/BlurImage';
import { B2BAnalyticsDashboard } from './B2BAnalyticsDashboard';
import { toast } from 'sonner';

interface SellerHubProps {
  profile: UserProfile;
  categories: Category[];
  onEditItem: (item: MarketplaceItem) => void;
  isRtl: boolean;
}

export const SellerHub: React.FC<SellerHubProps> = ({ profile, categories, onEditItem, isRtl }) => {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'inventory' | 'intelligence'>('inventory');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'sold' | 'expired'>('all');

  const { data: itemsData = { items: [] }, isLoading } = useQuery({
    queryKey: ['seller-items', profile.uid],
    queryFn: () => fetchMarketplaceItems('myshop', profile.uid),
  });

  const items = itemsData.items;

  const statusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string, status: MarketplaceItem['status'] }) => 
      updateMarketplaceItemStatus(itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-items'] });
      toast.success(isRtl ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => softDeleteMarketplaceItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-items'] });
      toast.success(isRtl ? 'تم حذف الإعلان بنجاح' : 'Item deleted successfully');
    }
  });

  const stats = useMemo(() => {
    let totalViews = 0;
    items.forEach(i => {
      totalViews += (i.views || 0);
    });
    return {
      active: items.filter(i => i.status === 'active').length,
      sold: items.filter(i => i.status === 'sold').length,
      views: totalViews,
      sharedViews: profile.sharedViews || 0,
      growth: '+12%' // Placeholder for now
    };
  }, [items, profile.sharedViews]);

  // Simulated Intelligence Data for B2B Dashboard
  const intelligenceData = useMemo(() => ({
    marketDemand: [
      { name: isRtl ? 'بناء وإنشاء' : 'Construction', demand: 85, color: '#0D9488' },
      { name: isRtl ? 'كهرباء' : 'Electrical', demand: 62, color: '#14B8A6' },
      { name: isRtl ? 'سباكة' : 'Plumbing', demand: 48, color: '#2DD4BF' },
      { name: isRtl ? 'تقنية' : 'Technology', demand: 35, color: '#5EEAD4' },
      { name: isRtl ? 'صيانة' : 'Maintenance', demand: 28, color: '#99F6E4' },
    ],
    demandTrends: [
      { day: 'Mon', value: 40 },
      { day: 'Tue', value: 35 },
      { day: 'Wed', value: 55 },
      { day: 'Thu', value: 48 },
      { day: 'Fri', value: 70 },
      { day: 'Sat', value: 65 },
      { day: 'Sun', value: 82 },
    ],
    competitorPricing: [
      { name: isRtl ? 'أنظمة الحماية' : 'Security Systems', diff: -15, percentage: 85, status: 'optimal' },
      { name: isRtl ? 'مواد البناء' : 'Building Materials', diff: +5, percentage: 65, status: 'higher' },
      { name: isRtl ? 'الأدوات الكهربائية' : 'Electric Tools', diff: -2, percentage: 92, status: 'optimal' },
    ]
  }), [isRtl]);

  const uniqueItems = useMemo(() => {
    const itemsByStatus = filterStatus === 'all' 
      ? items 
      : items.filter(i => i.status === filterStatus);
      
    return Array.from(new Map(itemsByStatus.map(item => [item.id, item])).values());
  }, [items, filterStatus]);

  const handleShare = async () => {
    const url = getStoreShareUrl(profile.uid);
    const shareData = {
      title: isRtl ? `متجر ${profile.companyName || profile.name} الرسمي` : `${profile.companyName || profile.name}'s Official Store`,
      text: isRtl 
        ? `مرحباً بك في متجر ${profile.companyName || profile.name} الرسمي على منصة كونكت 🌐. \n\nاكتشف مجموعتنا الحصرية من المنتجات والخدمات المميزة، واطلب مباشرة من الرابط التالي: \n${url} \n\nيسعدنا خدمتكم دائماً!` 
        : `Welcome to ${profile.companyName || profile.name}'s official store on Connect 🌐. \n\nDiscover our exclusive range of premium products and services, and order directly from the link below: \n${url} \n\nWe are always happy to serve you!`,
      url: url,
    };

    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.error('Error sharing:', err); }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(isRtl ? 'تم نسخ رابط المتجر بنجاح' : 'Store link copied to clipboard');
      } catch (err) {
        toast.error(isRtl ? 'فشل نسخ الرابط' : 'Failed to copy link');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* View Toggle */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 border border-brand-border rounded-3xl w-full md:w-fit self-center md:self-start">
         <button 
           onClick={() => setActiveView('inventory')}
           className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
             activeView === 'inventory' 
               ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
               : 'text-brand-text-muted hover:text-brand-text-main'
           }`}
         >
           {isRtl ? 'مخزن المنتجات' : 'Inventory'}
         </button>
         <button 
           onClick={() => setActiveView('intelligence')}
           className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
             activeView === 'intelligence' 
               ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20 border-brand-teal' 
               : 'text-brand-text-muted hover:text-brand-text-main'
           }`}
         >
           <Zap size={14} className={activeView === 'intelligence' ? 'animate-pulse' : ''} />
           {isRtl ? 'ذكاء السوق' : 'Market Intel'}
         </button>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'inventory' ? (
          <motion.div 
            key="inventory"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Header & Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-1 md:col-span-4 p-8 bg-white dark:bg-slate-900 border border-brand-border rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-brand-background shadow-xl shrink-0">
                    <img src={profile.photoURL || 'https://picsum.photos/200'} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="text-center md:text-start">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                      <h2 className="text-2xl font-black text-brand-text-main">{profile.companyName || profile.name}</h2>
                      {profile.isVerified && <ShieldCheck size={20} className="text-brand-primary" />}
                    </div>
                    <p className="text-sm text-brand-text-muted font-bold flex items-center justify-center md:justify-start gap-2">
                      <Package size={14} /> {uniqueItems.length} {isRtl ? 'منتجات معروضة' : 'Listed Products'}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                       {profile.categories?.slice(0, 3).map((catId, idx) => {
                          const cat = categories.find(c => c.id === catId);
                          return cat ? (
                            <span key={`${catId}-${idx}`} className="px-3 py-1 bg-brand-background rounded-full text-[10px] font-black text-brand-text-muted uppercase tracking-widest border border-brand-border">
                                {isRtl ? cat.nameAr : cat.nameEn}
                            </span>
                          ) : null;
                       })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <HapticButton onClick={handleShare} className="flex-1 md:flex-none px-8 py-4 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all">
                    <Share2 size={18} /> {isRtl ? 'مشاركة المتجر' : 'Share Store'}
                  </HapticButton>
                  <HapticButton onClick={() => window.open(getStoreShareUrl(profile.uid), '_blank')} className="p-4 bg-brand-surface border border-brand-border text-brand-text-main rounded-2xl hover:bg-brand-background transition-all" title={isRtl ? 'معاينة المتجر' : 'Preview Store'}>
                    <ExternalLink size={20} />
                  </HapticButton>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 p-8 bg-brand-primary/95 text-white rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10">
                  <h2 className="text-3xl font-black mb-2">{isRtl ? 'لوحة تحكم التاجر' : 'Merchant Hub'}</h2>
                  <p className="text-white/60 text-sm font-medium">{isRtl ? 'أهلاً بك مجدداً، إليك نظرة على أداء متجرك' : 'Welcome back, here is an overview of your shop performance'}</p>
                </div>
                <div className="mt-8 flex items-end justify-between relative z-10">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">{isRtl ? 'النشطة' : 'Active'}</p>
                      <p className="text-3xl font-black">{stats.active}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">{isRtl ? 'المباعة' : 'Sold'}</p>
                      <p className="text-3xl font-black">{stats.sold}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-2">
                    <TrendingUp size={16} className="text-brand-teal" /> <span className="text-xs font-black">{stats.growth}</span>
                  </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-teal/20 rounded-full blur-3xl" />
              </div>

              <div className="p-8 bg-brand-surface border border-brand-border rounded-[2.5rem] flex flex-col justify-between group hover:border-brand-primary transition-all">
                <div className="p-3 bg-brand-primary/10 text-brand-primary w-fit rounded-xl"> <Eye size={20} /> </div>
                <div>
                  <p className="text-brand-text-muted text-[10px] uppercase font-black tracking-widest mb-1">{isRtl ? 'زيارات الرابط' : 'Link Visits'}</p>
                  <p className="text-4xl font-black text-brand-text-main">{stats.sharedViews}</p>
                </div>
              </div>

              <div className="p-8 bg-brand-surface border border-brand-border rounded-[2.5rem] flex flex-col justify-between group hover:border-brand-teal transition-all">
                <div className="p-3 bg-brand-teal/10 text-brand-teal w-fit rounded-xl"> <MessageSquare size={20} /> </div>
                <div>
                  <p className="text-brand-text-muted text-[10px] uppercase font-black tracking-widest mb-1">{isRtl ? 'مشاهدات الكتالوج' : 'Catalog Views'}</p>
                  <p className="text-4xl font-black text-brand-text-main">{stats.views}</p>
                </div>
              </div>
            </div>

            {/* Inventory Workspace */}
            <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] overflow-hidden">
               <div className="p-6 md:p-8 border-b border-brand-border flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-brand-text-main">{isRtl ? 'إدارة المنتجات' : 'Inventory Management'}</h3>
                    <p className="text-xs text-brand-text-muted font-bold mt-1">{isRtl ? 'تحكم في إعلاناتك، قم بتحديث الحالات أو التعديل' : 'Control your listings, update status or edit details'}</p>
                  </div>
                  <div className="flex items-center gap-2 p-1 bg-brand-background rounded-xl">
                    {(['all', 'active', 'sold', 'expired'] as const).map(status => (
                      <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === status ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:text-brand-text-main'}`}>
                        {status === 'all' ? (isRtl ? 'الكل' : 'All') : status === 'active' ? (isRtl ? 'نشط' : 'Active') : status === 'sold' ? (isRtl ? 'مباع' : 'Sold') : (isRtl ? 'منتهي' : 'Expired')}
                      </button>
                    ))}
                  </div>
               </div>
               
               {/* Mobile List */}
               <div className="block md:hidden p-4 space-y-4">
                  {uniqueItems.length === 0 ? (
                    <div className="py-20 text-center text-brand-text-muted"> <Package size={32} className="mx-auto mb-4 opacity-20" /> <p className="font-bold text-sm">{isRtl ? 'لا توجد منتجات' : 'No products'}</p> </div>
                  ) : uniqueItems.map(item => (
                    <div key={`mobile-${item.id}`} className="bg-brand-surface border border-brand-border rounded-3xl p-4 flex gap-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0"> <BlurImage src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" /> </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start"> <h4 className="font-black text-brand-text-main text-sm truncate">{isRtl ? (item.titleAr || item.title) : (item.titleEn || item.title)}</h4> <div className={`w-2 h-2 rounded-full mt-1 ${item.status === 'active' ? 'bg-brand-teal' : 'bg-brand-amber'}`} /> </div>
                        <p className="font-black text-brand-primary text-sm mt-1">{item.price} <span className="opacity-60 text-[10px]">{item.currency || 'SAR'}</span></p>
                        <div className="mt-3 flex justify-between"> <span className="text-[10px] font-bold text-brand-text-muted inline-flex items-center gap-1"><Eye size={12} /> {item.views || 0}</span>
                          <div className="flex gap-2">
                            <HapticButton onClick={() => onEditItem(item)} className="p-1.5 bg-brand-background rounded-lg border border-brand-border"> <Edit3 size={14} /> </HapticButton>
                            {item.status === 'active' && <HapticButton onClick={() => statusMutation.mutate({ itemId: item.id, status: 'sold' })} className="p-1.5 bg-brand-background text-brand-amber rounded-lg border border-brand-border"> <CheckCircle2 size={14} /> </HapticButton>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>

               {/* Desktop Table */}
               <div className="hidden md:block overflow-x-auto">
                 <table className="w-full text-right" dir={isRtl ? 'rtl' : 'ltr'}>
                   <thead className="bg-brand-background/50 border-b border-brand-border text-[10px] font-black uppercase text-brand-text-muted tracking-widest">
                     <tr>
                       <th className="px-8 py-4 text-start">{isRtl ? 'المنتج' : 'Product'}</th>
                       <th className="px-8 py-4">{isRtl ? 'السعر' : 'Price'}</th>
                       <th className="px-8 py-4">{isRtl ? 'الحالة' : 'Status'}</th>
                       <th className="px-8 py-4">{isRtl ? 'المشاهدات' : 'Views'}</th>
                       <th className="px-8 py-4 text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-brand-border/50">
                     {uniqueItems.length === 0 ? (
                        <tr> <td colSpan={5} className="py-20 text-center text-brand-text-muted"> <Package size={32} className="mx-auto mb-4 opacity-20" /> <p className="font-bold text-sm">{isRtl ? 'لا توجد منتجات معروضة' : 'No items listed'}</p> </td> </tr>
                     ) : uniqueItems.map(item => (
                       <tr key={item.id} className="hover:bg-brand-background/30 transition-colors group">
                         <td className="px-8 py-6 text-start flex items-center gap-4">
                           <div className="w-14 h-14 rounded-xl overflow-hidden border border-brand-border"> <BlurImage src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" /> </div>
                           <div> <p className="font-black text-brand-text-main mb-1">{isRtl ? (item.titleAr || item.title) : (item.titleEn || item.title)}</p> <p className="text-[10px] text-brand-text-muted font-bold">{new Date(item.createdAt).toLocaleDateString()}</p> </div>
                         </td>
                         <td className="px-8 py-6 font-black text-brand-primary"> {item.price} <span className="opacity-60 text-[10px]">{item.currency || 'SAR'}</span> </td>
                         <td className="px-8 py-6">
                           <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${item.status === 'active' ? 'bg-brand-teal/10 text-brand-teal' : item.status === 'sold' ? 'bg-brand-amber/10 text-brand-amber' : 'bg-slate-100'}`}>
                             <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-brand-teal' : 'bg-brand-amber'}`} /> {item.status}
                           </span>
                         </td>
                         <td className="px-8 py-6 font-black text-xs text-brand-text-muted"> {item.views || 0} </td>
                         <td className="px-8 py-6 text-end">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <HapticButton onClick={() => onEditItem(item)} className="p-2.5 bg-brand-background rounded-xl border border-brand-border hover:border-brand-primary"> <Edit3 size={16} /> </HapticButton>
                               {item.status === 'active' && <HapticButton onClick={() => statusMutation.mutate({ itemId: item.id, status: 'sold' })} className="p-2.5 bg-brand-background text-brand-amber rounded-xl border border-brand-border"> <CheckCircle2 size={16} /> </HapticButton>}
                               <HapticButton onClick={() => confirm(isRtl ? 'حذف؟' : 'Delete?') && deleteMutation.mutate(item.id)} className="p-2.5 bg-brand-background text-brand-error rounded-xl border border-brand-border"> <Trash2 size={16} /> </HapticButton>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="intelligence"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <B2BAnalyticsDashboard isRtl={isRtl} data={intelligenceData} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Shortcut (Discovery Promotion) */}
      {activeView === 'inventory' && (
        <div className="p-8 bg-brand-background border-2 border-dashed border-brand-border rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-brand-primary shadow-xl"> <BarChart3 size={32} /> </div>
              <div>
                 <h4 className="text-xl font-black text-brand-text-main">{isRtl ? 'التقارير المتقدمة' : 'Advanced Analytics'}</h4>
                 <p className="text-sm text-brand-text-muted font-medium">{isRtl ? 'اكتشف كيف يتفاعل العملاء مع منتجاتك وحلل الطلب في منطقتك.' : 'Discover how customers interact with your products and analyze local demand.'}</p>
              </div>
           </div>
           <HapticButton 
             onClick={() => setActiveView('intelligence')}
             className="px-8 py-4 bg-brand-surface border border-brand-border rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-brand-background"
           >
              {isRtl ? 'فتح التقارير' : 'Open Reports'} <ArrowUpRight size={18} />
           </HapticButton>
        </div>
      )}
    </div>
  );
};
