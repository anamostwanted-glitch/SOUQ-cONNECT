import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Box, Layers, ShoppingBag, Coffee, Monitor, 
  Sofa, Shirt, Wrench, Utensils, Car, Zap, 
  Shield, Building2, HardHat, Hammer, Droplets, Lightbulb,
  Cpu, Smartphone, Laptop, Camera, Headphones, Speaker,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Category } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';

interface CategoryNavTrayProps {
  categories: Category[];
  selectedHubId?: string;
  selectedSectorId?: string;
  selectedNicheId?: string;
  onSelectHub: (id: string | undefined) => void;
  onSelectSector: (id: string | undefined) => void;
  onSelectNiche: (id: string | undefined) => void;
  isRtl: boolean;
}

const IconMap: { [key: string]: any } = {
  Package, Box, Layers, ShoppingBag, Coffee, Monitor, 
  Sofa, Shirt, Wrench, Utensils, Car, Zap, 
  Shield, Building2, HardHat, Hammer, Droplets, Lightbulb,
  Cpu, Smartphone, Laptop, Camera, Headphones, Speaker
};

export const CategoryNavTray: React.FC<CategoryNavTrayProps> = ({
  categories,
  selectedHubId,
  selectedSectorId,
  selectedNicheId,
  onSelectHub,
  onSelectSector,
  onSelectNiche,
  isRtl
}) => {
  // 1. Filter Hubs (Tier 1)
  const hubsRaw = categories
    .filter(c => c.tier === 'hub' || (!c.tier && !c.parentId))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const hubs = Array.from(new Map(hubsRaw.map(c => [c.id, c])).values());

  // 2. Filter Sectors (Tier 2) based on selected Hub
  const sectorsRaw = selectedHubId 
    ? categories.filter(c => c.parentId === selectedHubId || (c.tier === 'sector' && c.parentId === selectedHubId))
    : [];
  const sectors = Array.from(new Map(sectorsRaw.map(c => [c.id, c])).values());

  // 3. Filter Niches (Tier 3) based on selected Sector
  const nichesRaw = selectedSectorId
    ? categories.filter(c => c.parentId === selectedSectorId || (c.tier === 'niche' && c.parentId === selectedSectorId))
    : [];
  const niches = Array.from(new Map(nichesRaw.map(c => [c.id, c])).values());

  const renderIcon = (iconName?: string) => {
    const IconComponent = iconName ? IconMap[iconName] : Package;
    return <IconComponent size={20} />;
  };

  return (
    <div className="w-full space-y-4 mb-8">
      {/* Tier 1: Hubs - Horizontal Scroll */}
      <div className="relative group/tray">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
          <HapticButton
            onClick={() => {
              onSelectHub(undefined);
              onSelectSector(undefined);
              onSelectNiche(undefined);
            }}
            className={`flex-shrink-0 px-5 py-3 rounded-2xl font-bold text-sm transition-all border ${
              !selectedHubId 
                ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' 
                : 'bg-white dark:bg-slate-800 text-brand-text-muted border-brand-border hover:border-brand-primary/30'
            }`}
          >
            {isRtl ? 'الكل' : 'All'}
          </HapticButton>

          {hubs.map((hub) => (
            <HapticButton
              key={hub.id}
              onClick={() => {
                onSelectHub(hub.id === selectedHubId ? undefined : hub.id);
                onSelectSector(undefined);
                onSelectNiche(undefined);
              }}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all border ${
                selectedHubId === hub.id
                  ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' 
                  : 'bg-white dark:bg-slate-800 text-brand-text-muted border-brand-border hover:border-brand-primary/30'
              }`}
            >
              <span className={selectedHubId === hub.id ? 'text-white' : 'text-brand-primary'}>
                {renderIcon(hub.iconName)}
              </span>
              {isRtl ? hub.nameAr : hub.nameEn}
            </HapticButton>
          ))}
        </div>
      </div>

      {/* Tier 2: Sectors - Secondary Tray */}
      <AnimatePresence>
        {sectors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar px-1">
              {sectors.map((sector) => (
                <button
                  key={sector.id}
                  onClick={() => {
                    onSelectSector(sector.id === selectedSectorId ? undefined : sector.id);
                    onSelectNiche(undefined);
                  }}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedSectorId === sector.id
                      ? 'bg-brand-teal text-white border-brand-teal shadow-md shadow-brand-teal/20'
                      : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200'
                  }`}
                >
                  {isRtl ? sector.nameAr : sector.nameEn}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier 3: Niches - Tertiary Tags */}
      <AnimatePresence>
        {niches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-wrap gap-2 pt-1 px-1"
          >
            {niches.map((niche) => (
              <button
                key={niche.id}
                onClick={() => onSelectNiche(niche.id === selectedNicheId ? undefined : niche.id)}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                  selectedNicheId === niche.id
                    ? 'bg-brand-amber text-white border-brand-amber'
                    : 'bg-white dark:bg-slate-800 text-brand-text-muted border-brand-border hover:border-brand-primary/20'
                }`}
              >
                {isRtl ? niche.nameAr : niche.nameEn}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
