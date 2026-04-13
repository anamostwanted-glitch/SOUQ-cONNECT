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
  Users
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

  const customerCards = [
    { id: 'smart_pulse', title: isRtl ? 'النبض الذكي' : 'Smart Pulse', icon: Activity, color: 'text-brand-teal', bg: 'bg-brand-teal/10', stat: 'AI' },
    { id: 'requests', title: isRtl ? 'طلباتي' : 'My Requests', icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10', stat: stats.requestsCount },
    { id: 'my_ads', title: isRtl ? 'إعلاناتي' : 'My Ads', icon: Megaphone, color: 'text-purple-500', bg: 'bg-purple-500/10', stat: stats.adsCount },
    { id: 'favorites', title: isRtl ? 'المفضلة' : 'Favorites', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10', stat: stats.favoritesCount },
    { id: 'wallet', title: isRtl ? 'المحفظة' : 'Wallet', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10', stat: '0.00' },
    { id: 'chats', title: isRtl ? 'المحادثات' : 'Chats', icon: MessageSquare, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: '3' },
    { id: 'settings', title: isRtl ? 'الإعدادات' : 'Settings', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-500/10', stat: 'AI Ready' },
    { id: 'branding_settings', title: isRtl ? 'الهوية البصرية' : 'Visual Identity', icon: Palette, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: 'Custom' }
  ];

  const supplierCards = [
    { id: 'smart_pulse', title: isRtl ? 'النبض الذكي' : 'Smart Pulse', icon: Activity, color: 'text-brand-teal', bg: 'bg-brand-teal/10', stat: 'AI' },
    { id: 'my_products', title: isRtl ? 'منتجاتي' : 'My Products', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10', stat: stats.productsCount },
    { id: 'available_requests', title: isRtl ? 'طلبات السوق' : 'Market RFQs', icon: Globe, color: 'text-indigo-500', bg: 'bg-indigo-500/10', stat: '20+' },
    { id: 'my_offers', title: isRtl ? 'عروضي' : 'My Offers', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10', stat: '12' },
    { id: 'my_ads', title: isRtl ? 'إعلاناتي' : 'My Ads', icon: Megaphone, color: 'text-purple-500', bg: 'bg-purple-500/10', stat: 'Active' },
    { id: 'ad_analytics', title: isRtl ? 'التحليلات' : 'Analytics', icon: BarChart3, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: '94%' },
    { id: 'subscription', title: isRtl ? 'الاشتراك' : 'Subscription', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', stat: 'Pro' },
    { id: 'store_settings', title: isRtl ? 'إعدادات المتجر' : 'Store Settings', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-500/10', stat: 'Active' },
    { id: 'branding_settings', title: isRtl ? 'الهوية البصرية' : 'Visual Identity', icon: Palette, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: 'Custom' }
  ];

  const cards = perspective === 'customer' ? customerCards : supplierCards;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {cards.map((card, i) => (
        <motion.button
          key={card.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onCardClick(card.id)}
          className={cardClass}
        >
          <div className="flex flex-col h-full justify-between gap-6">
            <div className="flex justify-between items-start">
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center shadow-inner`}>
                <card.icon size={24} />
              </div>
              <div className="px-3 py-1 bg-brand-background/50 rounded-lg border border-brand-border/30">
                <span className="text-xs font-black text-brand-text-main">{card.stat}</span>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-sm md:text-base font-black text-brand-text-main mb-1">{card.title}</h3>
              <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
                {isRtl ? 'إدارة وتفاصيل' : 'Manage & Details'}
              </p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
};
