import React from 'react';
import { Building2, Package, Sparkles } from 'lucide-react';

interface HomeStatsProps {
  stats: { suppliers: number; requests: number; satisfaction: number };
}

export const HomeStats: React.FC<HomeStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-3 gap-4 mb-12">
      <div className="bg-brand-surface p-4 rounded-2xl text-center border border-brand-border-light">
        <Building2 className="w-6 h-6 mx-auto mb-2 text-brand-primary" />
        <div className="text-2xl font-bold">{stats.suppliers}</div>
        <div className="text-sm text-brand-text-secondary">مورد</div>
      </div>
      <div className="bg-brand-surface p-4 rounded-2xl text-center border border-brand-border-light">
        <Package className="w-6 h-6 mx-auto mb-2 text-brand-primary" />
        <div className="text-2xl font-bold">{stats.requests}</div>
        <div className="text-sm text-brand-text-secondary">طلب</div>
      </div>
      <div className="bg-brand-surface p-4 rounded-2xl text-center border border-brand-border-light">
        <Sparkles className="w-6 h-6 mx-auto mb-2 text-brand-primary" />
        <div className="text-2xl font-bold">{stats.satisfaction}%</div>
        <div className="text-sm text-brand-text-secondary">رضا</div>
      </div>
    </div>
  );
};
