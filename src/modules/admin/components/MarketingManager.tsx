import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile } from '../../../core/types';
import { Search, Megaphone, DollarSign, RotateCcw, TrendingUp, Sparkles, Zap } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { Campaign, subscribeToCampaigns, createCampaign } from '@/core/services/campaignService';
import { toast } from 'sonner';
import { z } from 'zod';

interface MarketingManagerProps {
  allUsers: UserProfile[];
  isRtl: boolean;
  t: any;
}

export const MarketingManager: React.FC<MarketingManagerProps> = ({ allUsers, isRtl, t }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [resetting, setResetting] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newCampaign, setNewCampaign] = useState<{ name: string; platform: 'meta' | 'google'; budget: number }>({ name: '', platform: 'meta', budget: 0 });

  const handleCreateCampaign = async () => {
    setLoading(true);
    try {
      await createCampaign({
        ...newCampaign,
        status: 'draft',
        spent: 0,
        conversions: 0,
        clicks: 0,
        createdAt: new Date().toISOString()
      });
      toast.success(isRtl ? 'تم إنشاء الحملة بنجاح' : 'Campaign created successfully');
      setNewCampaign({ name: '', platform: 'meta', budget: 0 });
    } catch (e) {
      if (e instanceof z.ZodError) {
        toast.error(`${isRtl ? 'خطأ في التحقق' : 'Validation error'}: ${(e as z.ZodError).issues[0].message}`);
      } else {
        toast.error(isRtl ? 'فشل إنشاء الحملة' : 'Failed to create campaign');
        handleFirestoreError(e, OperationType.CREATE, 'campaigns', false);
      }
    } finally {
      setLoading(false);
    }
  };

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
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`, false);
    } finally {
      setResetting(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-brand-primary p-8 rounded-[2.5rem] text-white shadow-xl shadow-brand-primary/20">
          <Megaphone size={32} className="mb-4 text-white/80" />
          <h3 className="text-2xl font-black mb-2 tracking-tight">
            {isRtl ? 'مركز التسويق' : 'Marketing Center'}
          </h3>
          <p className="text-sm text-brand-primary-100 font-medium leading-relaxed">
            {isRtl ? 'أدر حملاتك الإعلانية وتابع أداء المسوقين بذكاء.' : 'Manage your ad campaigns and track marketer performance intelligently.'}
          </p>
        </div>
        
        {[
          { label: isRtl ? 'إجمالي الإنفاق' : 'Total Spend', value: '$1,240', icon: DollarSign, color: 'text-emerald-500' },
          { label: isRtl ? 'التحويلات' : 'Conversions', value: '482', icon: TrendingUp, color: 'text-blue-500' },
          { label: isRtl ? 'عائد الاستثمار' : 'ROI', value: '3.2x', icon: Zap, color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm flex flex-col justify-between">
            <div className={`w-12 h-12 rounded-2xl bg-brand-background flex items-center justify-center ${stat.color} mb-4`}>
              <stat.icon size={24} />
            </div>
            <div>
              <div className="text-3xl font-black text-brand-text-main">{stat.value}</div>
              <div className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Campaign Assistant */}
      <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm">
        <h4 className="text-lg font-black text-brand-text-main mb-6 flex items-center gap-2">
          <Sparkles className="text-brand-primary" size={20} />
          {isRtl ? 'إنشاء حملة جديدة' : 'Create New Campaign'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input 
            className="w-full h-12 rounded-2xl border border-brand-border bg-brand-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
            placeholder={isRtl ? 'اسم الحملة' : 'Campaign Name'} 
            value={newCampaign.name} 
            onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} 
          />
          <select 
            className="w-full h-12 rounded-2xl border border-brand-border bg-brand-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
            value={newCampaign.platform} 
            onChange={e => setNewCampaign({...newCampaign, platform: e.target.value as 'meta' | 'google'})}
          >
            <option value="meta">Meta</option>
            <option value="google">Google</option>
          </select>
          <input 
            className="w-full h-12 rounded-2xl border border-brand-border bg-brand-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
            type="number" 
            placeholder={isRtl ? 'الميزانية' : 'Budget'} 
            value={newCampaign.budget} 
            onChange={e => setNewCampaign({...newCampaign, budget: Number(e.target.value)})} 
          />
        </div>
        <button 
          onClick={handleCreateCampaign} 
          disabled={loading}
          className="w-full mt-6 py-4 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {loading ? (isRtl ? 'جاري الإنشاء...' : 'Creating...') : (isRtl ? 'إنشاء الحملة' : 'Create Campaign')}
        </button>
      </div>

      {/* Marketers List */}
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
