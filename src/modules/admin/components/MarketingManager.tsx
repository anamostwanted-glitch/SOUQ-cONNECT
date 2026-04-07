import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile } from '../../../core/types';
import { Search, Megaphone, DollarSign, RotateCcw } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface MarketingManagerProps {
  allUsers: UserProfile[];
  isRtl: boolean;
  t: any;
}

export const MarketingManager: React.FC<MarketingManagerProps> = ({ allUsers, isRtl, t }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [resetting, setResetting] = useState<string | null>(null);

  const marketers = allUsers
    .filter(u => u.referralCode)
    .filter(u => {
      const searchLower = searchQuery.toLowerCase();
      return u.name?.toLowerCase().includes(searchLower) || u.referralCode?.toLowerCase().includes(searchLower);
    })
    .sort((a, b) => (b.referralPoints || 0) - (a.referralPoints || 0));

  const handleResetPoints = async (userId: string) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من تصفير نقاط هذا المسوق؟' : 'Are you sure you want to reset this marketer\'s points?')) return;
    
    setResetting(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        referralPoints: 0
      });
    } catch (e) {
      console.error("Reset failed:", e);
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`, false);
    } finally {
      setResetting(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-brand-primary/5 p-8 rounded-[2.5rem] border border-brand-primary/10 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="p-4 bg-brand-primary/10 rounded-2xl text-brand-primary shadow-inner">
            <Megaphone size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-brand-text-main mb-2 tracking-tight">
              {isRtl ? 'نظام التسويق والانتشار' : 'Marketing & Growth System'}
            </h3>
            <p className="text-sm text-brand-text-muted font-medium leading-relaxed max-w-2xl">
              {isRtl 
                ? 'قم بمكافأة المسوقين الذين يساهمون في نشر التطبيق. كل عملية تحميل ناجحة عبر رمز الاستجابة السريعة (QR) تمنح المسوق 10 نقاط تلقائياً.'
                : 'Reward marketers who contribute to spreading the app. Every successful download via QR code automatically grants the marketer 10 points.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-border bg-brand-background/30">
          <div className="relative max-w-md">
            <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-brand-text-muted`} size={18} />
            <input
              type="text"
              placeholder={isRtl ? 'البحث عن مسوق (الاسم أو الرمز)...' : 'Search for a marketer (Name or Code)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm font-medium transition-all`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-background/50 border-b border-brand-border">
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'المسوق' : 'Marketer'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'رقم الهاتف' : 'Phone Number'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'رمز الإحالة' : 'Referral Code'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'إجمالي النقاط' : 'Total Points'}
                </th>
                <th className={`px-4 py-3 md:px-8 md:py-5 text-[10px] font-black text-brand-text-muted uppercase tracking-widest whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                  {isRtl ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {marketers.map((user) => (
                <tr key={user.uid} className="hover:bg-brand-background/30 transition-colors group">
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-sm border border-brand-primary/20 shrink-0">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-black text-brand-text-main group-hover:text-brand-primary transition-colors">{user.name}</div>
                        <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">{user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <div className="text-sm font-medium text-brand-text-main">
                      {user.phone ? (
                        <a href={`tel:${user.phone}`} className="hover:text-brand-primary transition-colors" dir="ltr">
                          {user.phone}
                        </a>
                      ) : (
                        <span className="text-brand-text-muted">{isRtl ? 'غير متوفر' : 'N/A'}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-1 bg-brand-background border border-brand-border rounded-lg text-xs font-mono font-black text-brand-primary shadow-inner">
                        {user.referralCode}
                      </code>
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-secondary/10 flex items-center justify-center text-brand-secondary border border-brand-secondary/20 shrink-0">
                        <DollarSign size={14} />
                      </div>
                      <span className="text-sm font-black text-brand-text-main">{user.referralPoints || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-8 md:py-5 whitespace-nowrap">
                    <button
                      onClick={() => handleResetPoints(user.uid)}
                      disabled={resetting === user.uid}
                      className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-brand-background text-brand-error rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-error/10 transition-all disabled:opacity-50 border border-brand-border"
                    >
                      <RotateCcw size={14} className={resetting === user.uid ? 'animate-spin' : ''} />
                      {isRtl ? 'تصفير النقاط' : 'Reset Points'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
