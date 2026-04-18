import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Check, ChevronDown, DollarSign } from 'lucide-react';
import { HapticButton } from './HapticButton';
import { useTranslation } from 'react-i18next';

interface GlobalCurrencyToggleProps {
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
  currencies?: { code: string; symbol: string; label: string }[];
}

const DEFAULT_CURRENCIES = [
  { code: 'JOD', symbol: 'JD', label: 'Jordanian Dinar' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'SAR', symbol: 'SR', label: 'Saudi Riyal' },
  { code: 'AED', symbol: 'DH', label: 'UAE Dirham' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
];

export const GlobalCurrencyToggle: React.FC<GlobalCurrencyToggleProps> = ({
  currentCurrency,
  onCurrencyChange,
  currencies = DEFAULT_CURRENCIES
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [isOpen, setIsOpen] = useState(false);

  const selected = currencies.find(c => c.code === currentCurrency) || currencies[0];

  return (
    <div className="relative">
      <HapticButton
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-brand-border rounded-xl shadow-sm hover:border-brand-primary/30 transition-all"
      >
        <Globe size={16} className="text-brand-primary" />
        <span className="text-xs font-black text-brand-text-main">{selected.code}</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </HapticButton>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full mt-2 w-48 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
              style={{ [isRtl ? 'left' : 'right']: 0 }}
            >
              <div className="text-[9px] font-black text-brand-text-muted uppercase tracking-widest p-2 mb-1">
                {isRtl ? 'اختر العملة العالمية' : 'Global Currency'}
              </div>
              <div className="space-y-1">
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => {
                      onCurrencyChange(currency.code);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${
                      currentCurrency === currency.code 
                        ? 'bg-brand-primary/10 text-brand-primary' 
                        : 'text-brand-text-main hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                       <span className="w-8 text-[10px] font-black bg-brand-background p-1 rounded-md text-center">{currency.symbol}</span>
                       <span className="text-xs font-bold">{currency.code}</span>
                    </div>
                    {currentCurrency === currency.code && <Check size={14} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
