import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Search, Filter, TrendingUp, BarChart3, 
  Eye, MousePointer, DollarSign, Settings, Trash2,
  Sparkles, AlertCircle, Edit2
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { HapticButton } from '../../../shared/components/HapticButton';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { toast } from 'sonner';

interface Ad {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'ended';
  views: number;
  clicks: number;
  spend: number;
  createdAt: string;
}

export const MyAdsDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'ads'), where('sellerId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedAds: Ad[] = [];
      snap.forEach(doc => fetchedAds.push({ id: doc.id, ...doc.data() } as Ad));
      setAds(fetchedAds);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ads', false);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSoftDelete = async (adId: string) => {
    try {
      await updateDoc(doc(db, 'ads', adId), { status: 'deleted', deletedAt: new Date().toISOString() });
      toast.success(isRtl ? 'تم حذف الإعلان' : 'Ad deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'ads', false);
    }
  };

  const handleEditAd = async (adId: string, updatedData: Partial<Ad>) => {
    try {
      await updateDoc(doc(db, 'ads', adId), updatedData);
      toast.success(isRtl ? 'تم تحديث الإعلان' : 'Ad updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'ads', false);
    }
  };

  const handleCreateAd = async () => {
    const title = prompt(isRtl ? 'أدخل عنوان الإعلان:' : 'Enter ad title:');
    if (!title || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'ads'), {
        title,
        sellerId: auth.currentUser.uid,
        status: 'active',
        views: 0,
        clicks: 0,
        spend: 0,
        createdAt: new Date().toISOString()
      });
      toast.success(isRtl ? 'تم إنشاء الإعلان' : 'Ad created');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ads', false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-brand-text-main">{isRtl ? 'إعلاناتي' : 'My Ads'}</h2>
        <HapticButton onClick={handleCreateAd} className="px-6 py-3 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
          <Plus size={16} /> {isRtl ? 'إنشاء إعلان' : 'Create Ad'}
        </HapticButton>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: isRtl ? 'إجمالي المشاهدات' : 'Total Views', value: ads.reduce((a, b) => a + b.views, 0), icon: Eye },
          { label: isRtl ? 'إجمالي النقرات' : 'Total Clicks', value: ads.reduce((a, b) => a + b.clicks, 0), icon: MousePointer },
          { label: isRtl ? 'إجمالي الإنفاق' : 'Total Spend', value: `$${ads.reduce((a, b) => a + b.spend, 0)}`, icon: DollarSign },
        ].map((stat, i) => (
          <div key={i} className="bg-brand-surface p-6 rounded-3xl border border-brand-border">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className="text-brand-primary" size={20} />
              <span className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="text-3xl font-black text-brand-text-main">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Ads List */}
      <div className="space-y-4">
        {ads.map((ad, idx) => (
          <div key={`${ad.id}-${idx}`} className="bg-brand-surface p-6 rounded-3xl border border-brand-border flex items-center justify-between">
            <div>
              <h3 className="font-bold text-brand-text-main">{ad.title}</h3>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${ad.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {ad.status}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-sm font-black text-brand-text-main">{ad.views}</div>
                <div className="text-[9px] text-brand-text-muted uppercase">{isRtl ? 'مشاهدة' : 'Views'}</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-black text-brand-text-main">{ad.clicks}</div>
                <div className="text-[9px] text-brand-text-muted uppercase">{isRtl ? 'نقرة' : 'Clicks'}</div>
              </div>
              <HapticButton onClick={() => {
                const newTitle = prompt(isRtl ? 'تعديل العنوان:' : 'Edit title:', ad.title);
                if (newTitle) handleEditAd(ad.id, { title: newTitle });
              }} className="text-brand-primary hover:bg-brand-primary/10 p-2 rounded-full">
                <Edit2 size={18} />
              </HapticButton>
              <HapticButton onClick={() => handleSoftDelete(ad.id)} className="text-brand-error hover:bg-brand-error/10 p-2 rounded-full">
                <Trash2 size={18} />
              </HapticButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
