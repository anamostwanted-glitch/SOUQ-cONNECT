import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  ShoppingBag, 
  Megaphone, 
  Heart, 
  Wallet, 
  MessageSquare, 
  Settings, 
  Palette,
  Package,
  Globe,
  FileText,
  BarChart3,
  Zap,
  Users,
  History
} from 'lucide-react';

interface BentoMatrixProps {
  perspective: 'customer' | 'supplier';
  stats: Record<string, any>;
  onCardClick: (id: string) => void;
  cardClass: string;
}

export const BentoMatrix: React.FC<BentoMatrixProps> = ({
  perspective,
  stats,
  onCardClick,
  cardClass
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const clusters = perspective === 'customer' 
    ? [
        {
          id: 'neural',
          title: isRtl ? 'النبض العصبي' : 'Neural Pulse',
          icon: Activity,
          items: [
            { id: 'smart_pulse', title: isRtl ? 'الرؤى الذكية' : 'Smart Insights', icon: Activity, color: 'text-brand-teal', bg: 'bg-brand-teal/10', stat: 'AI' },
            { id: 'neural_activity', title: isRtl ? 'سجل الحركات' : 'Activity Logs', icon: History, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: 'Log' }
          ]
        },
        {
          id: 'commerce',
          title: isRtl ? 'مركز العمليات' : 'Operations Hub',
          icon: ShoppingBag,
          items: [
            { id: 'requests', title: isRtl ? 'طلباتي' : 'My Requests', icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10', stat: stats.requestsCount },
            { id: 'my_ads', title: isRtl ? 'إعلاناتي' : 'My Ads', icon: Megaphone, color: 'text-purple-500', bg: 'bg-purple-500/10', stat: stats.adsCount },
            { id: 'favorites', title: isRtl ? 'المفضلة' : 'Favorites', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10', stat: stats.favoritesCount },
            { id: 'wallet', title: isRtl ? 'المحفظة' : 'Wallet', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10', stat: '0.00' },
            { id: 'chats', title: isRtl ? 'المحادثات' : 'Chats', icon: MessageSquare, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: '3' }
          ]
        },
        {
          id: 'identity',
          title: isRtl ? 'الإعدادات والهوية' : 'Identity & Setup',
          icon: Settings,
          items: [
            { id: 'settings', title: isRtl ? 'إعدادات النظام' : 'System Config', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-500/10', stat: 'Active' },
            { id: 'branding_settings', title: isRtl ? 'الهوية البصرية' : 'Visual Identity', icon: Palette, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: 'Custom' }
          ]
        }
      ]
    : [
        {
          id: 'neural',
          title: isRtl ? 'النبض العصبي' : 'Neural Pulse',
          icon: Activity,
          items: [
            { id: 'smart_pulse', title: isRtl ? 'الرؤى الذكية' : 'Smart Insights', icon: Activity, color: 'text-brand-teal', bg: 'bg-brand-teal/10', stat: 'AI' },
            { id: 'neural_activity', title: isRtl ? 'سجل الحركات' : 'Activity Logs', icon: History, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: 'Log' },
            { id: 'ad_analytics', title: isRtl ? 'تحليلات الأداء' : 'Performance', icon: BarChart3, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: '94%' }
          ]
        },
        {
          id: 'commerce',
          title: isRtl ? 'مركز المتجر' : 'Storefront Hub',
          icon: Package,
          items: [
            { id: 'my_products', title: isRtl ? 'المنتجات' : 'Products', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10', stat: stats.productsCount },
            { id: 'available_requests', title: isRtl ? 'طلبات السوق' : 'Market RFQs', icon: Globe, color: 'text-indigo-500', bg: 'bg-indigo-500/10', stat: '20+' },
            { id: 'my_offers', title: isRtl ? 'عروضي' : 'My Offers', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10', stat: '12' },
            { id: 'my_ads', title: isRtl ? 'الإعلانات' : 'Campaigns', icon: Megaphone, color: 'text-purple-500', bg: 'bg-purple-500/10', stat: 'Active' }
          ]
        },
        {
          id: 'identity',
          title: isRtl ? 'الاشتراك والهوية' : 'Subscription & Identity',
          icon: Zap,
          items: [
            { id: 'subscription', title: isRtl ? 'الاشتراك' : 'Plan', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', stat: 'Pro' },
            { id: 'store_settings', title: isRtl ? 'الإعدادات' : 'Settings', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-500/10', stat: 'Ready' },
            { id: 'branding_settings', title: isRtl ? 'الهوية البصرية' : 'Branding', icon: Palette, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: 'Active' }
          ]
        }
      ];

  return (
    <div className="space-y-10">
      {clusters.map((cluster, clusterIdx) => (
        <div key={`cluster-${cluster.id}-${clusterIdx}`} className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-brand-primary/5 rounded-lg text-brand-primary/60">
              <cluster.icon size={16} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-text-muted">
              {cluster.title}
            </h3>
            <div className="flex-1 h-px bg-gradient-to-r from-brand-border/40 to-transparent" />
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {cluster.items.map((card, i) => (
              <motion.button
                key={`bento-card-${cluster.id}-${card.id}-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (clusterIdx * 0.1) + (i * 0.05) }}
                onClick={() => onCardClick(card.id)}
                className={`${cardClass} group relative overflow-hidden`}
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 right-0 w-24 h-24 ${card.bg} rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity`} />
                
                <div className="flex flex-col h-full justify-between gap-6 relative z-10">
                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                      <card.icon size={22} />
                    </div>
                    <div className="px-2.5 py-1 bg-brand-background/60 backdrop-blur-md rounded-lg border border-brand-border/30">
                      <span className="text-[10px] font-black text-brand-text-main">{card.stat}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-brand-text-main mb-0.5 group-hover:text-brand-primary transition-colors">{card.title}</h3>
                    <p className="text-[9px] font-bold text-brand-text-muted uppercase tracking-wider opacity-60">
                      {isRtl ? 'إدارة' : 'Manage'}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
