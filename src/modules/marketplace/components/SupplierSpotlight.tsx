import React from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../../../core/types';
import { ShieldCheck, Star, MapPin, ArrowRight } from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';

interface SupplierSpotlightProps {
  suppliers: UserProfile[];
  onViewProfile: (uid: string) => void;
  isRtl: boolean;
}

export const SupplierSpotlight: React.FC<SupplierSpotlightProps> = ({ suppliers, onViewProfile, isRtl }) => {
  const featuredSuppliers = suppliers.filter(s => s.isVerified).slice(0, 4);

  if (featuredSuppliers.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-brand-text-main">
          {isRtl ? 'موردون موثقون' : 'Verified Suppliers'}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {featuredSuppliers.map((supplier, index) => (
          <motion.div
            key={supplier.uid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-brand-surface border border-brand-border rounded-[2rem] p-6 hover:shadow-xl transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldCheck size={80} />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <img
                  src={supplier.logoUrl || `https://ui-avatars.com/api/?name=${supplier.companyName || supplier.name}&background=random`}
                  alt={supplier.companyName || supplier.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-primary/20"
                />
                {supplier.isVerified && (
                  <div className="absolute -bottom-2 -right-2 bg-brand-primary text-white p-1.5 rounded-xl shadow-lg">
                    <ShieldCheck size={14} />
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-black text-brand-text-main group-hover:text-brand-primary transition-colors">
                  {supplier.companyName || supplier.name}
                </h3>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-black text-brand-text-main">{supplier.rating || '5.0'}</span>
                  <span className="text-[10px] text-brand-text-muted">({supplier.reviewCount || 0})</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-brand-text-muted font-bold">
                <MapPin size={12} />
                {supplier.location || (isRtl ? 'المملكة العربية السعودية' : 'Saudi Arabia')}
              </div>

              <HapticButton
                onClick={() => onViewProfile(supplier.uid)}
                className="w-full bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                {isRtl ? 'عرض الملف' : 'View Profile'}
                <ArrowRight size={14} className={isRtl ? 'rotate-180' : ''} />
              </HapticButton>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
