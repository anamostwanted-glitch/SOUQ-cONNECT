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
  Search,
  History,
  Bell,
  Accessibility,
  ArrowUpRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { MiniSparkline } from '../../../../shared/components/MiniSparkline';

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

  const customerItems = [
    { 
      id: 'smart_pulse', 
      title: isRtl ? 'النبض العصبي' : 'Neural Pulse', 
      desc: isRtl ? 'تحليل سلوكك الشرائي' : 'Analyze your buying behavior',
      icon: Activity, 
      color: 'text-brand-teal', 
      bg: 'bg-brand-teal/10', 
      stat: '98%',
      span: 'col-span-2',
      hasChart: true 
    },
    { 
      id: 'requests', 
      title: isRtl ? 'طلباتي' : 'My Requests', 
      desc: isRtl ? 'إدارة الطلبات المفتوحة' : 'Manage open requests',
      icon: ShoppingBag, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10', 
      stat: stats.requestsCount,
      span: 'col-span-1'
    },
    { 
      id: 'chats', 
      title: isRtl ? 'المحادثات' : 'Smart Chat', 
      desc: isRtl ? 'تواصل فوري مع الموردين' : 'Instant supplier comms',
      icon: MessageSquare, 
      color: 'text-brand-primary', 
      bg: 'bg-brand-primary/10', 
      stat: '3',
      span: 'col-span-1'
    },
    { 
      id: 'wallet', 
      title: isRtl ? 'المحفظة' : 'Connect Wallet', 
      desc: isRtl ? 'إدارة الرصيد والمدفوعات' : 'Manage balance & payments',
      icon: Wallet, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10', 
      stat: '0.00',
      span: 'col-span-1'
    },
    { 
      id: 'favorites', 
      title: isRtl ? 'المفضلة' : 'Saved Items', 
      desc: isRtl ? 'ما تهتم به في مكان واحد' : 'Everything you care about',
      icon: Heart, 
      color: 'text-rose-500', 
      bg: 'bg-rose-500/10', 
      stat: stats.favoritesCount,
      span: 'col-span-1'
    },
    { 
      id: 'branding_settings', 
      title: isRtl ? 'الهوية البصرية' : 'Custom Aura', 
      desc: isRtl ? 'تخصيص مظهر حسابك' : 'Customize your aura',
      icon: Palette, 
      color: 'text-brand-primary', 
      bg: 'bg-brand-primary/10', 
      stat: 'Ready',
      span: 'col-span-2'
    }
  ];

  const supplierItems = [
    { 
      id: 'ad_analytics', 
      title: isRtl ? 'تحليلات الأداء' : 'Growth Analytics', 
      desc: isRtl ? 'مراقبة نمو مبيعاتك' : 'Monitor sales growth',
      icon: BarChart3, 
      color: 'text-brand-primary', 
      bg: 'bg-brand-primary/10', 
      stat: '94%',
      span: 'col-span-2',
      hasChart: true 
    },
    { 
      id: 'my_products', 
      title: isRtl ? 'كتالوج المنتجات' : 'Product Grid', 
      desc: isRtl ? 'إدارة المخزون والعرض' : 'Manage inventory & display',
      icon: Package, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10', 
      stat: stats.productsCount,
      span: 'col-span-1'
    },
    { 
      id: 'available_requests', 
      title: isRtl ? 'طلبات السوق' : 'Live RFQs', 
      desc: isRtl ? 'فرص بيع جديدة الآن' : 'New sales opportunities',
      icon: Globe, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-500/10', 
      stat: '20+',
      span: 'col-span-1',
      urgent: true
    },
    { 
      id: 'my_offers', 
      title: isRtl ? 'عروضي' : 'Sent Proposals', 
      desc: isRtl ? 'متابعة الصفقات النشطة' : 'Track active deals',
      icon: FileText, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10', 
      stat: '12',
      span: 'col-span-1'
    },
    { 
      id: 'subscription', 
      title: isRtl ? 'خطة الاشتراك' : 'Premium Tier', 
      desc: isRtl ? 'مميزات حسابك الفائقة' : 'Elite account features',
      icon: Zap, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10', 
      stat: 'Pro',
      span: 'col-span-1'
    },
    { 
      id: 'neural_lexicon', 
      title: isRtl ? 'معجم الطلب' : 'Demand Lexicon', 
      desc: isRtl ? 'الكلمات الأكثر بحثاً' : 'Most searched terms',
      icon: Search, 
      color: 'text-brand-primary', 
      bg: 'bg-brand-primary/10', 
      stat: 'AI Pulse',
      span: 'col-span-1',
      sparkle: true
    },
    { 
      id: 'store_settings', 
      title: isRtl ? 'إعدادات المتجر' : 'Store Config', 
      desc: isRtl ? 'تهيئة الهوية والموقع' : 'Configure identity & loc',
      icon: Settings, 
      color: 'text-slate-500', 
      bg: 'bg-slate-500/10', 
      stat: 'Online',
      span: 'col-span-2'
    }
  ];

  const items = perspective === 'customer' ? customerItems : supplierItems;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max">
      {items.map((card, i) => (
        <motion.button
          key={`bento-${perspective}-${card.id}-${i}-${card.title}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onCardClick(card.id)}
          className={`${cardClass} ${card.span} group relative overflow-hidden flex flex-col justify-between min-h-[160px] text-start border-white/20`}
        >
          {/* Visual Background Accent */}
          <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg} rounded-full blur-[60px] opacity-0 group-hover:opacity-60 transition-opacity duration-700`} />
          
          <div className="relative z-10 flex flex-col h-full w-full">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                <card.icon size={22} />
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="px-2.5 py-1 bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-lg border border-white/30 dark:border-white/10 flex items-center gap-1.5">
                  <span className="text-xs font-black text-brand-text-main">{card.stat}</span>
                  {(card.id === 'ad_analytics' || card.id === 'smart_pulse') && (
                    <TrendingUp size={10} className="text-emerald-500" />
                  )}
                </div>
                {(card as any).urgent && (
                  <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-black text-brand-text-main group-hover:text-brand-primary transition-colors duration-300">
                  {card.title}
                </h3>
                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-brand-primary" />
              </div>
              <p className="text-[10px] font-bold text-brand-text-muted leading-tight opacity-70">
                {card.desc}
              </p>
            </div>

            {card.hasChart && (
              <div className="mt-4 pt-4 border-t border-brand-border/10">
                <MiniSparkline color={card.id === 'ad_analytics' ? '#6366f1' : '#14b8a6'} />
              </div>
            )}
          </div>

          {/* Interaction Glow */}
          <div className="absolute inset-0 border-2 border-brand-primary/0 group-hover:border-brand-primary/10 rounded-[2.5rem] transition-colors pointer-events-none" />
        </motion.button>
      ))}
    </div>
  );
};
