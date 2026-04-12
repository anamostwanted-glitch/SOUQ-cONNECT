import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { AdAnalytics, MarketplaceItem } from '../../../core/types';
import { BarChart3, Eye, MousePointer } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

export const MarketplaceAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [analytics, setAnalytics] = useState<AdAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'ad_analytics'), where('sellerId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedAnalytics: AdAnalytics[] = [];
      snap.forEach(doc => fetchedAnalytics.push({ id: doc.id, ...doc.data() } as AdAnalytics));
      setAnalytics(fetchedAnalytics);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ad_analytics', false);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-brand-text-main">{isRtl ? 'تحليلات الإعلانات' : 'Ad Analytics'}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: isRtl ? 'إجمالي المشاهدات' : 'Total Views', value: analytics.reduce((a, b) => a + b.views, 0), icon: Eye },
          { label: isRtl ? 'إجمالي النقرات' : 'Total Clicks', value: analytics.reduce((a, b) => a + b.clicks, 0), icon: MousePointer },
        ].map((stat, i) => (
          <div key={i} className="bg-brand-surface p-6 rounded-3xl border border-brand-border flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-brand-primary/10 text-brand-primary">
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-brand-text-main">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-brand-surface p-6 rounded-3xl border border-brand-border">
        <h3 className="text-lg font-black text-brand-text-main mb-4">{isRtl ? 'تفاصيل الإعلانات' : 'Ad Details'}</h3>
        <div className="space-y-4">
          {analytics.map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-brand-background rounded-2xl border border-brand-border">
              <span className="font-bold text-sm text-brand-text-main">Ad ID: {item.adId}</span>
              <div className="flex gap-4">
                <span className="text-xs font-bold text-brand-text-muted">{isRtl ? 'مشاهدات:' : 'Views:'} {item.views}</span>
                <span className="text-xs font-bold text-brand-text-muted">{isRtl ? 'نقرات:' : 'Clicks:'} {item.clicks}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
