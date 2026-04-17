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
  ChevronRight
} from 'lucide-react';
import { MarketplaceItem, UserProfile, Category } from '../../../core/types';
import { fetchMarketplaceItems, updateMarketplaceItemStatus, softDeleteMarketplaceItem, getStoreShareUrl } from '../services/marketService';
import { HapticButton } from '../../../shared/components/HapticButton';
import { BlurImage } from '../../../shared/components/BlurImage';
import { toast } from 'sonner';

interface SellerHubProps {
  profile: UserProfile;
  categories: Category[];
  onEditItem: (item: MarketplaceItem) => void;
  isRtl: boolean;
}

export const SellerHub: React.FC<SellerHubProps> = ({ profile, categories, onEditItem, isRtl }) => {
  const queryClient = useQueryClient();
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
      growth: '+12%' // Placeholder for now
    };
  }, [items]);

  // Core Team: Robust deduplication for inventory workspace to prevent key collisions
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
        ? `مرحباً بك في متجر ${profile.companyName || profile.name} الرسمي على منصة كونكت 🌐. \n\nاكتشف مجموعتنا الحصرية من المنتجات والخدمات المميزة، واطلب مباشرة من الرابط التالي. \n\nيسعدنا خدمتكم دائماً!` 
        : `Welcome to ${profile.companyName || profile.name}'s official store on Connect 🌐. \n\nDiscover our exclusive range of premium products and services, and order directly from the link below. \n\nWe are always happy to serve you!`,
      url: url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
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
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Hub Profile & Sharing - Growth Hacker Initiative */}
        <div className="col-span-1 md:col-span-4 p-8 bg-white dark:bg-slate-900 border border-brand-border rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
           <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-brand-background shadow-xl shrink-0">
                 <img 
                    src={profile.photoURL || 'https://picsum.photos/200'} 
                    alt={profile.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                 />
              </div>
              <div className="text-center md:text-start">
                 <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <h2 className="text-2xl font-black text-brand-text-main">{profile.companyName || profile.name}</h2>
                    {profile.isVerifiedSupplier && <ShieldCheck size={20} className="text-brand-primary" />}
                 </div>
                 <p className="text-sm text-brand-text-muted font-bold flex items-center justify-center md:justify-start gap-2">
                    <Package size={14} />
                    {uniqueItems.length} {isRtl ? 'منتجات معروضة' : 'Listed Products'}
                 </p>
                 <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                    {profile.categories?.slice(0, 3).map(catId => {
                       const cat = categories.find(c => c.id === catId);
                       if (!cat) return null;
                       return (
                          <span key={catId} className="px-3 py-1 bg-brand-background rounded-full text-[10px] font-black text-brand-text-muted uppercase tracking-widest border border-brand-border">
                             {isRtl ? cat.nameAr : cat.nameEn}
                          </span>
                       );
                    })}
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-3 w-full md:w-auto">
              <HapticButton 
                onClick={handleShare}
                className="flex-1 md:flex-none px-8 py-4 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 hover:scale-105 transition-all"
              >
                 <Share2 size={18} />
                 {isRtl ? 'مشاركة المتجر' : 'Share Store'}
              </HapticButton>
              <HapticButton 
                onClick={() => window.open(getStoreShareUrl(profile.uid), '_blank')}
                className="p-4 bg-brand-surface border border-brand-border text-brand-text-main rounded-2xl hover:bg-brand-background transition-all"
                title={isRtl ? 'معاينة المتجر' : 'Preview Store'}
              >
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
                 <TrendingUp size={16} className="text-brand-teal" />
                 <span className="text-xs font-black">{stats.growth}</span>
              </div>
           </div>
           {/* Abstract Circle Decoration */}
           <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-teal/20 rounded-full blur-3xl" />
        </div>

        <div className="p-8 bg-brand-surface border border-brand-border rounded-[2.5rem] flex flex-col justify-between group hover:border-brand-primary transition-all">
           <div className="p-3 bg-brand-primary/10 text-brand-primary w-fit rounded-xl">
              <Eye size={20} />
           </div>
           <div>
              <p className="text-brand-text-muted text-[10px] uppercase font-black tracking-widest mb-1">{isRtl ? 'إجمالي المشاهدات' : 'Total Views'}</p>
              <p className="text-4xl font-black text-brand-text-main">{stats.views}</p>
           </div>
        </div>

        <div className="p-8 bg-brand-surface border border-brand-border rounded-[2.5rem] flex flex-col justify-between group hover:border-brand-teal transition-all">
           <div className="p-3 bg-brand-teal/10 text-brand-teal w-fit rounded-xl">
              <MessageSquare size={20} />
           </div>
           <div>
              <p className="text-brand-text-muted text-[10px] uppercase font-black tracking-widest mb-1">{isRtl ? 'الفرص (Leads)' : 'Market Leads'}</p>
              <p className="text-4xl font-black text-brand-text-main">--</p>
           </div>
        </div>
      </div>

      {/* Product Management Workspace */}
      <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] overflow-hidden">
        <div className="p-6 md:p-8 border-b border-brand-border flex flex-col md:flex-row items-center justify-between gap-4">
           <div>
              <h3 className="text-xl font-black text-brand-text-main">{isRtl ? 'إدارة المنتجات' : 'Inventory Management'}</h3>
              <p className="text-xs text-brand-text-muted font-bold mt-1">{isRtl ? 'تحكم في إعلاناتك، قم بتحديث الحالات أو التعديل' : 'Control your listings, update status or edit details'}</p>
           </div>
           <div className="flex items-center gap-2 p-1 bg-brand-background rounded-xl">
              {(['all', 'active', 'sold', 'expired'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    filterStatus === status 
                      ? 'bg-brand-primary text-white' 
                      : 'text-brand-text-muted hover:text-brand-text-main'
                  }`}
                >
                  {status === 'all' ? (isRtl ? 'الكل' : 'All') : 
                   status === 'active' ? (isRtl ? 'نشط' : 'Active') :
                   status === 'sold' ? (isRtl ? 'مباع' : 'Sold') : (isRtl ? 'منتهي' : 'Expired')}
                </button>
              ))}
           </div>
        </div>

        {/* Mobile-First Adaptable List - UX Research Implementation */}
        <div className="block md:hidden p-4 space-y-4">
           <AnimatePresence mode="popLayout">
              {uniqueItems.length === 0 ? (
                <div className="py-20 text-center">
                   <div className="w-16 h-16 bg-brand-background rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-text-muted">
                      <Package size={32} />
                   </div>
                   <p className="text-brand-text-muted font-bold text-sm">{isRtl ? 'لا توجد منتجات' : 'No products'}</p>
                </div>
              ) : uniqueItems.map(item => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={`mobile-${item.id}`}
                  className="bg-brand-surface border border-brand-border rounded-3xl p-4 flex gap-4"
                >
                   <div className="w-20 h-20 rounded-2xl overflow-hidden border border-brand-border shrink-0">
                      <BlurImage src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-black text-brand-text-main text-sm truncate">{isRtl ? (item.titleAr || item.title) : (item.titleEn || item.title)}</h4>
                        <div className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${item.status === 'active' ? 'bg-brand-teal' : 'bg-brand-amber'}`} />
                      </div>
                      <p className="font-black text-brand-primary text-sm mt-1">{item.price} <span className="text-[10px] opacity-60 uppercase">{item.currency || 'SAR'}</span></p>
                      
                      <div className="mt-3 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-[10px] font-bold text-brand-text-muted">
                            <Eye size={12} /> {item.views || 0}
                         </div>
                         <div className="flex gap-2">
                            <HapticButton 
                              onClick={() => onEditItem(item)}
                              className="w-8 h-8 flex items-center justify-center bg-brand-background rounded-lg border border-brand-border"
                            >
                               <Edit3 size={14} />
                            </HapticButton>
                            {item.status === 'active' && (
                               <HapticButton 
                                  onClick={() => statusMutation.mutate({ itemId: item.id, status: 'sold' })}
                                  className="w-8 h-8 flex items-center justify-center bg-brand-background text-brand-amber rounded-lg border border-brand-border"
                               >
                                  <CheckCircle2 size={14} />
                               </HapticButton>
                            )}
                         </div>
                      </div>
                   </div>
                </motion.div>
              ))}
           </AnimatePresence>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right" dir={isRtl ? 'rtl' : 'ltr'}>
            <thead className="bg-brand-background/50 border-b border-brand-border">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-brand-text-muted tracking-widest text-start">{isRtl ? 'المنتج' : 'Product'}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-brand-text-muted tracking-widest">{isRtl ? 'السعر' : 'Price'}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-brand-text-muted tracking-widest">{isRtl ? 'الحالة' : 'Status'}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-brand-text-muted tracking-widest">{isRtl ? 'المشاهدات' : 'Views'}</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-brand-text-muted tracking-widest text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              <AnimatePresence mode="popLayout">
                {uniqueItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                       <div className="w-16 h-16 bg-brand-background rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-text-muted">
                          <Package size={32} />
                       </div>
                       <p className="text-brand-text-muted font-bold text-sm">{isRtl ? 'لا توجد منتجات في هذا التصنيف' : 'No products found in this category'}</p>
                    </td>
                  </tr>
                ) : uniqueItems.map((item) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={item.id} 
                    className="hover:bg-brand-background/30 transition-colors group"
                  >
                    <td className="px-8 py-6 text-start">
                       <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-brand-border flex-shrink-0">
                             <BlurImage src={item.images?.[0] || 'https://picsum.photos/400'} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                          <div>
                             <p className="font-black text-brand-text-main leading-tight mb-1">{isRtl ? (item.titleAr || item.title) : (item.titleEn || item.title)}</p>
                             <div className="flex items-center gap-2">
                                <Clock size={12} className="text-brand-text-muted" />
                                <span className="text-[10px] text-brand-text-muted font-bold">
                                   {new Date(item.createdAt).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}
                                </span>
                             </div>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="font-black text-brand-primary text-sm">{item.price} <span className="text-[10px] opacity-60">{item.currency || 'SAR'}</span></p>
                    </td>
                    <td className="px-8 py-6">
                       <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.status === 'active' ? 'bg-brand-teal/10 text-brand-teal' :
                          item.status === 'sold' ? 'bg-brand-amber/10 text-brand-amber' :
                          'bg-slate-100 text-slate-500'
                       }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                             item.status === 'active' ? 'bg-brand-teal' :
                             item.status === 'sold' ? 'bg-brand-amber' :
                             'bg-slate-400'
                          }`} />
                          {item.status === 'active' ? (isRtl ? 'نشط' : 'Active') :
                           item.status === 'sold' ? (isRtl ? 'تم البيع' : 'Sold') :
                           (isRtl ? 'منتهي' : 'Expired')}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-1.5 text-brand-text-muted">
                          <Eye size={14} />
                          <span className="font-black text-xs">{item.views || 0}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-end">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <HapticButton 
                            onClick={() => onEditItem(item)}
                            className="p-2.5 bg-brand-background text-brand-text-main rounded-xl border border-brand-border hover:border-brand-primary transition-all"
                            title={isRtl ? 'تعديل' : 'Edit'}
                          >
                             <Edit3 size={16} />
                          </HapticButton>
                          
                          {item.status === 'active' && (
                             <HapticButton 
                                onClick={() => statusMutation.mutate({ itemId: item.id, status: 'sold' })}
                                className="p-2.5 bg-brand-background text-brand-amber rounded-xl border border-brand-border hover:border-brand-amber transition-all"
                                title={isRtl ? 'تحديد كمباع' : 'Mark as Sold'}
                             >
                                <CheckCircle2 size={16} />
                             </HapticButton>
                          )}

                          <HapticButton 
                            onClick={() => {
                              if (confirm(isRtl ? 'هل أنت متأكد من حذف هذا الإعلان؟' : 'Are you sure you want to delete this item?')) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="p-2.5 bg-brand-background text-brand-error rounded-xl border border-brand-border hover:border-brand-error transition-all"
                            title={isRtl ? 'حذف' : 'Delete'}
                          >
                             <Trash2 size={16} />
                          </HapticButton>
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Shortcut */}
      <div className="p-8 bg-brand-background border-2 border-dashed border-brand-border rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-start">
         <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-brand-primary shadow-xl">
               <BarChart3 size={32} />
            </div>
            <div>
               <h4 className="text-xl font-black text-brand-text-main">{isRtl ? 'التقارير المتقدمة' : 'Advanced Analytics'}</h4>
               <p className="text-sm text-brand-text-muted font-medium">{isRtl ? 'احصل على تحليل عميق لزيارات متجرك وتفاعل الجمهور مع إعلاناتك.' : 'Get deep insights into your shop traffic and audience engagement.'}</p>
            </div>
         </div>
         <HapticButton className="px-8 py-4 bg-brand-surface border border-brand-border rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-background transition-all flex items-center gap-2">
            {isRtl ? 'فتح التقارير' : 'Open Reports'}
            <ArrowUpRight size={18} />
         </HapticButton>
      </div>
    </div>
  );
};
