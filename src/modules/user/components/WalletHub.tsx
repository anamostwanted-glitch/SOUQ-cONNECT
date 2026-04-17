import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  History, 
  Plus, 
  ShieldCheck,
  Zap,
  DollarSign,
  TrendingUp,
  PieChart as PieChartIcon
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { UserProfile } from '../../../core/types';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { toast } from 'sonner';

interface WalletHubProps {
  profile: UserProfile;
  isRtl: boolean;
}

export const WalletHub: React.FC<WalletHubProps> = ({ profile, isRtl }) => {
  const { t } = useTranslation();
  const [balance, setBalance] = useState(profile.walletBalance || 2450.75);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile.uid) return;
    
    // Simulate real-time balance if needed, but usually we'd listen to the user doc
    const unsubProfile = onSnapshot(doc(db, 'users', profile.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.walletBalance !== undefined) setBalance(data.walletBalance);
      }
    });

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubTransactions = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (txs.length > 0) {
        setTransactions(txs);
      } else {
        // Fallback mock data for visual showcase if no real txs exist yet
        setTransactions([
          { id: '1', type: 'in', amount: 450, titleAr: 'استلام دفعة من صفقة #102', titleEn: 'Payment received for Deal #102', createdAt: new Date().toISOString() },
          { id: '2', type: 'out', amount: 35, titleAr: 'رسوم خدمة كونكت', titleEn: 'Connect Service Fee', createdAt: subDays(new Date(), 1).toISOString() },
          { id: '3', type: 'in', amount: 1200, titleAr: 'شحن محفظة عبر STC Pay', titleEn: 'Wallet Top-up via STC Pay', createdAt: subDays(new Date(), 3).toISOString() }
        ]);
      }
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubTransactions();
    };
  }, [profile.uid]);

  return (
    <div className="space-y-6">
      {/* Wallet Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-brand-primary/90 to-brand-primary border border-white/10 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-brand-primary/20"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <ShieldCheck size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">
              {isRtl ? 'المحفظة الرقمية المؤمنة' : 'Secure Digital Wallet'}
            </span>
          </div>
          
          <div className="flex items-end gap-2 mb-8">
            <span className="text-5xl font-black">{balance.toLocaleString()}</span>
            <span className="text-xl font-bold mb-2 opacity-80 uppercase">{isRtl ? 'ر.س' : 'SAR'}</span>
          </div>

          <div className="flex gap-4">
            <HapticButton className="flex-1 bg-white text-brand-primary p-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
              <Plus size={20} />
              {isRtl ? 'شحن رصيد' : 'Top Up'}
            </HapticButton>
            <HapticButton className="flex-1 bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform border border-white/10">
              <ArrowUpRight size={20} />
              {isRtl ? 'تحويل' : 'Transfer'}
            </HapticButton>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-surface border border-brand-border p-5 rounded-3xl">
          <div className="flex items-center gap-2 mb-3 text-emerald-500">
            <TrendingUp size={16} />
            <span className="text-[10px] font-black uppercase tracking-wider">{isRtl ? 'الدخل الكلي' : 'Total Revenue'}</span>
          </div>
          <div className="text-lg font-black text-brand-text-main">+12,450 <span className="text-[10px] opacity-60">SAR</span></div>
        </div>
        <div className="bg-brand-surface border border-brand-border p-5 rounded-3xl">
          <div className="flex items-center gap-2 mb-3 text-brand-primary">
            <PieChartIcon size={16} />
            <span className="text-[10px] font-black uppercase tracking-wider">{isRtl ? 'المصاريف' : 'Expenses'}</span>
          </div>
          <div className="text-lg font-black text-brand-text-main">-3,240 <span className="text-[10px] opacity-60">SAR</span></div>
        </div>
      </div>

      {/* Quick Payment Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-brand-text-main flex items-center gap-2">
          <Zap size={18} className="text-brand-primary" />
          {isRtl ? 'دفع سريع' : 'Quick Pay'}
        </h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {['STC Pay', 'Apple Pay', 'Google Pay', 'Bank'].map((method) => (
            <button key={method} className="shrink-0 px-6 py-3 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold text-brand-text-main hover:border-brand-primary transition-colors">
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] overflow-hidden">
        <div className="p-6 border-b border-brand-border flex items-center justify-between">
          <h3 className="font-black text-brand-text-main flex items-center gap-2">
            <History size={18} className="text-brand-primary" />
            {isRtl ? 'آخر العمليات' : 'Recent Transactions'}
          </h3>
          <button className="text-xs font-bold text-brand-primary hover:underline">{isRtl ? 'عرض الكل' : 'View All'}</button>
        </div>
        <div className="divide-y divide-brand-border">
          {transactions.map((tx) => (
            <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-black/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-primary/10 text-brand-primary'}`}>
                  {tx.type === 'in' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div>
                  <div className="text-xs font-black text-brand-text-main">{isRtl ? tx.titleAr : tx.titleEn}</div>
                  <div className="text-[10px] font-bold text-brand-text-muted mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
              <div className={`text-sm font-black ${tx.type === 'in' ? 'text-emerald-500' : 'text-brand-text-main'}`}>
                {tx.type === 'in' ? '+' : '-'}{tx.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Internal sub-helper for date manipulation
function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

import { doc } from 'firebase/firestore'; // Re-importing inside file for standalone safety or ensure its in scope
