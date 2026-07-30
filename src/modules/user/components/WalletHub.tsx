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
  TrendingUp,
  PieChart as PieChartIcon,
  CheckCircle2,
  Copy,
  Check,
  X,
  Building2,
  Lock,
  Loader2
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { UserProfile, MerchantAccount } from '../../../core/types';
import { collection, query, where, orderBy, onSnapshot, limit, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { toast } from 'sonner';

interface WalletHubProps {
  profile: UserProfile;
  isRtl: boolean;
}

export const WalletHub: React.FC<WalletHubProps> = ({ profile, isRtl }) => {
  const { t } = useTranslation();
  const [balance, setBalance] = useState(profile.walletBalance || 250.00);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [merchantGateways, setMerchantGateways] = useState<MerchantAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Top Up Modal state
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('50');
  const [selectedGateway, setSelectedGateway] = useState<MerchantAccount | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);

  useEffect(() => {
    if (!profile.uid) return;
    
    // Listen to user profile balance
    const unsubProfile = onSnapshot(doc(db, 'users', profile.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.walletBalance !== undefined) setBalance(data.walletBalance);
      }
    });

    // Listen to transactions
    const qTx = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubTransactions = onSnapshot(qTx, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (txs.length > 0) {
        setTransactions(txs);
      } else {
        setTransactions([
          { id: '1', type: 'in', amount: 150, titleAr: 'استلام دفعة من صفقة #102', titleEn: 'Payment received for Deal #102', createdAt: new Date().toISOString() },
          { id: '2', type: 'out', amount: 15, titleAr: 'رسوم خدمة كونكت', titleEn: 'Connect Service Fee', createdAt: subDays(new Date(), 1).toISOString() },
          { id: '3', type: 'in', amount: 200, titleAr: 'شحن محفظة عبر البوابة الأردنية', titleEn: 'Wallet Top-up via Gateway', createdAt: subDays(new Date(), 3).toISOString() }
        ]);
      }
      setLoading(false);
    });

    // Listen to Active Merchant Accounts configured by Admin
    const qMerchants = query(
      collection(db, 'merchant_accounts'),
      where('status', '==', 'active')
    );
    const unsubMerchants = onSnapshot(qMerchants, (snap) => {
      const list: MerchantAccount[] = [];
      snap.forEach(d => {
        const data = d.data() as MerchantAccount;
        if (!data.isDeleted) {
          list.push({ id: d.id, ...data });
        }
      });
      setMerchantGateways(list);
    });

    return () => {
      unsubProfile();
      unsubTransactions();
      unsubMerchants();
    };
  }, [profile.uid]);

  const handleOpenTopUp = (gateway?: MerchantAccount) => {
    if (gateway) {
      setSelectedGateway(gateway);
    } else if (merchantGateways.length > 0) {
      setSelectedGateway(merchantGateways.find(g => g.isDefault) || merchantGateways[0]);
    }
    setIsTopUpOpen(true);
  };

  const handleExecuteTopUp = async () => {
    const amountNum = parseFloat(topUpAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error(isRtl ? 'يرجى إدخال مبلغ صحيح لشحن المحفظة' : 'Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      // Create transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: profile.uid,
        type: 'in',
        amount: amountNum,
        titleAr: `شحن محفظة عبر ${selectedGateway?.merchantName || 'بوابة الدفع'}`,
        titleEn: `Wallet top-up via ${selectedGateway?.merchantName || 'Payment Gateway'}`,
        gatewayId: selectedGateway?.id || 'manual',
        provider: selectedGateway?.provider || 'card',
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // Update User Wallet Balance
      const newBal = balance + amountNum;
      await updateDoc(doc(db, 'users', profile.uid), {
        walletBalance: newBal,
        updatedAt: new Date().toISOString()
      });

      setBalance(newBal);
      toast.success(
        isRtl 
          ? `تم شحن المحفظة بمبلغ ${amountNum.toLocaleString()} د.أ بنجاح` 
          : `Successfully topped up ${amountNum.toLocaleString()} JOD`
      );
      setIsTopUpOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'تعذر إتمام عملية الشحن' : 'Failed to complete top-up transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(true);
    toast.success(isRtl ? 'تم نسخ رقم الآيبان' : 'IBAN copied to clipboard');
    setTimeout(() => setCopiedIban(false), 2000);
  };

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
            <span className="text-xl font-bold mb-2 opacity-80 uppercase">{isRtl ? 'د.أ' : 'JOD'}</span>
          </div>

          <div className="flex gap-4">
            <HapticButton 
              onClick={() => handleOpenTopUp()}
              className="flex-1 bg-white text-brand-primary p-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-black/10"
            >
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
          <div className="text-lg font-black text-brand-text-main">+1,450 <span className="text-[10px] opacity-60">JOD</span></div>
        </div>
        <div className="bg-brand-surface border border-brand-border p-5 rounded-3xl">
          <div className="flex items-center gap-2 mb-3 text-brand-primary">
            <PieChartIcon size={16} />
            <span className="text-[10px] font-black uppercase tracking-wider">{isRtl ? 'المصاريف' : 'Expenses'}</span>
          </div>
          <div className="text-lg font-black text-brand-text-main">-320 <span className="text-[10px] opacity-60">JOD</span></div>
        </div>
      </div>

      {/* Quick Payment Options & Active Merchant Gateways */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-brand-text-main flex items-center gap-2">
            <Zap size={18} className="text-brand-primary" />
            {isRtl ? 'بوابات الدفع والتجار المعتمدة' : 'Merchant Gateways & Quick Pay'}
          </h3>
          <span className="text-[10px] font-bold text-brand-text-muted">
            {merchantGateways.length} {isRtl ? 'بوابة مفعّلة' : 'active gateways'}
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {merchantGateways.length > 0 ? (
            merchantGateways.map((gateway) => (
              <button 
                key={gateway.id} 
                onClick={() => handleOpenTopUp(gateway)}
                className={`shrink-0 px-5 py-3 bg-brand-surface border rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all hover:scale-[1.02] shadow-sm ${
                  gateway.isDefault ? 'border-brand-primary text-brand-primary ring-1 ring-brand-primary/20' : 'border-brand-border text-brand-text-main hover:border-brand-primary'
                }`}
              >
                <CreditCard size={16} />
                <span>{gateway.merchantName} ({gateway.currency || 'JOD'})</span>
                {gateway.isDefault && (
                  <span className="px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary text-[9px] font-black rounded">
                    {isRtl ? 'افتراضي' : 'DEFAULT'}
                  </span>
                )}
              </button>
            ))
          ) : (
            ['JoMoPay / CliQ', 'Apple Pay', 'Visa / Mastercard', 'البنك الأردني المباشر'].map((method) => (
              <button 
                key={method} 
                onClick={() => handleOpenTopUp()}
                className="shrink-0 px-6 py-3 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold text-brand-text-main hover:border-brand-primary transition-colors"
              >
                {method}
              </button>
            ))
          )}
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
          {transactions.map((tx, idx) => (
            <div key={tx.id || `tx-${idx}`} className="p-5 flex items-center justify-between hover:bg-black/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-primary/10 text-brand-primary'}`}>
                  {tx.type === 'in' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div>
                  <div className="text-xs font-black text-brand-text-main">{isRtl ? tx.titleAr : tx.titleEn}</div>
                  <div className="text-[10px] font-bold text-brand-text-muted mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString(isRtl ? 'ar-JO' : 'en-US', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
              <div className={`text-sm font-black ${tx.type === 'in' ? 'text-emerald-500' : 'text-brand-text-main'}`}>
                {tx.type === 'in' ? '+' : '-'}{tx.amount.toLocaleString()} {isRtl ? 'د.أ' : 'JOD'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Top-Up Modal */}
      <AnimatePresence>
        {isTopUpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface w-full max-w-lg rounded-3xl border border-brand-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-brand-background border-b border-brand-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-brand-text-main">{isRtl ? 'شحن رصيد المحفظة الرقمية' : 'Top Up Wallet Balance'}</h3>
                    <p className="text-xs text-brand-text-muted font-bold">{isRtl ? 'اختر بوابة الدفع والمبلغ المطلوب' : 'Select payment gateway and amount'}</p>
                  </div>
                </div>
                <button onClick={() => setIsTopUpOpen(false)} className="p-2 text-brand-text-muted hover:text-brand-text-main">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Amount Selectors */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-text-main">{isRtl ? 'المبلغ المراد شحنه (د.أ)' : 'Amount to Add (JOD)'}</label>
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full p-4 bg-brand-background rounded-2xl border border-brand-border text-2xl font-black text-brand-primary outline-none text-center"
                    placeholder="50"
                  />
                  <div className="flex gap-2 pt-2">
                    {['10', '25', '50', '100', '250'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTopUpAmount(amt)}
                        className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                          topUpAmount === amt ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-background border-brand-border text-brand-text-main'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gateway Selector */}
                {merchantGateways.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-text-main">{isRtl ? 'اختيار حساب التاجر / بوابة الدفع' : 'Select Merchant Gateway'}</label>
                    <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto">
                      {merchantGateways.map((gw) => (
                        <div
                          key={gw.id}
                          onClick={() => setSelectedGateway(gw)}
                          className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                            selectedGateway?.id === gw.id ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/20' : 'border-brand-border bg-brand-background'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <CreditCard size={18} className="text-brand-primary" />
                            <div>
                              <div className="text-xs font-black text-brand-text-main">{gw.merchantName}</div>
                              <div className="text-[10px] text-brand-text-muted font-bold capitalize">{gw.provider} • {gw.environment}</div>
                            </div>
                          </div>
                          {selectedGateway?.id === gw.id && <CheckCircle2 size={18} className="text-brand-primary" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* IBAN details if direct bank transfer gateway is selected */}
                {selectedGateway?.provider === 'bank_transfer' && selectedGateway.iban && (
                  <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-2 text-xs">
                    <div className="font-black text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Building2 size={14} /> {isRtl ? 'تفاصيل التحويل البنكي المباشر:' : 'Direct IBAN Details:'}
                    </div>
                    <div className="flex items-center justify-between font-mono font-bold text-brand-text-main bg-brand-surface p-2 rounded-xl border">
                      <span>{selectedGateway.iban}</span>
                      <button onClick={() => handleCopyIban(selectedGateway.iban!)} className="p-1 hover:text-brand-primary">
                        {copiedIban ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                    {selectedGateway.bankName && <div className="text-[10px] text-brand-text-muted font-bold">{selectedGateway.bankName} - {selectedGateway.accountHolder}</div>}
                  </div>
                )}

                <HapticButton
                  onClick={handleExecuteTopUp}
                  disabled={isProcessing}
                  className="w-full bg-brand-primary text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 hover:scale-[1.01] transition-all"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  <span>{isRtl ? `تأكيد الدفع للشحن (${topUpAmount} د.أ)` : `Confirm & Pay (${topUpAmount} JOD)`}</span>
                </HapticButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Internal sub-helper for date manipulation
function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

