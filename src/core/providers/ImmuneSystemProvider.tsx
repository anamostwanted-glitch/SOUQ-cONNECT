import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, AlertTriangle, Zap, RefreshCw } from 'lucide-react';

interface ImmuneSystemContextType {
  securityStatus: 'stable' | 'alert' | 'lockdown';
  neuralPulse: number;
  reportAnomaly: (reason: string, severity: 'low' | 'high') => void;
  isSafeMode: boolean;
}

const ImmuneSystemContext = createContext<ImmuneSystemContextType | undefined>(undefined);

export const ImmuneSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [securityStatus, setSecurityStatus] = useState<'stable' | 'alert' | 'lockdown'>('stable');
  const [neuralPulse, setNeuralPulse] = useState(100);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [isSafeMode, setIsSafeMode] = useState(false);

  // Bio-Sentinel: Monitor neural pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setNeuralPulse(prev => {
        const jitter = Math.random() * 5;
        const base = securityStatus === 'stable' ? 98 : securityStatus === 'alert' ? 70 : 30;
        return Math.min(100, Math.max(0, base + jitter));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [securityStatus]);

  const reportAnomaly = useCallback((reason: string, severity: 'low' | 'high') => {
    console.warn(`[ImmuneSystem] Anomaly detected: ${reason} (${severity})`);
    
    setAnomalyCount(prev => {
      const next = prev + (severity === 'high' ? 5 : 1);
      if (next > 15 && securityStatus !== 'lockdown') {
        setSecurityStatus('lockdown');
        setIsSafeMode(true);
      } else if (next > 5 && securityStatus === 'stable') {
        setSecurityStatus('alert');
      }
      return next;
    });

    // Auto-recovery attempt
    if (severity === 'low') {
      setTimeout(() => {
        setAnomalyCount(prev => Math.max(0, prev - 1));
        if (anomalyCount < 5) setSecurityStatus('stable');
      }, 30000);
    }
  }, [securityStatus, anomalyCount]);

  // Global event listener for rapid clicks or suspicious patterns
  useEffect(() => {
    let lastClick = 0;
    let clickBurst = 0;

    const handleInteraction = () => {
      const now = Date.now();
      if (now - lastClick < 200) {
        clickBurst++;
        if (clickBurst > 10) {
          reportAnomaly('Rapid Interaction Burst', 'low');
          clickBurst = 0;
        }
      } else {
        clickBurst = 0;
      }
      lastClick = now;
    };

    window.addEventListener('click', handleInteraction);
    return () => window.removeEventListener('click', handleInteraction);
  }, [reportAnomaly]);

  return (
    <ImmuneSystemContext.Provider value={{ securityStatus, neuralPulse, reportAnomaly, isSafeMode }}>
      {children}
      
      {/* Bio-Sentinel Overlay */}
      <AnimatePresence>
        {securityStatus !== 'stable' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl border flex items-center gap-4 shadow-2xl backdrop-blur-xl ${
              securityStatus === 'lockdown' 
                ? 'bg-red-500/90 border-red-400 text-white' 
                : 'bg-amber-500/90 border-amber-400 text-brand-text-main'
            }`}
          >
            {securityStatus === 'lockdown' ? (
              <>
                <Shield className="animate-pulse" />
                <div className="text-sm font-black uppercase tracking-widest">
                  System Guard Active: Tactical Lockdown
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                >
                  <RefreshCw size={18} />
                </button>
              </>
            ) : (
              <>
                <AlertTriangle className="animate-bounce" />
                <div className="text-sm font-bold">
                  Neural Pulse Fluctuating: Monitoring Active
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Safe Mode Filter */}
      {isSafeMode && (
        <div className="fixed inset-0 pointer-events-none z-[9998] border-[8px] border-red-500/20 mix-blend-overlay animate-pulse" />
      )}
    </ImmuneSystemContext.Provider>
  );
};

export const useImmuneSystem = () => {
  const context = useContext(ImmuneSystemContext);
  if (!context) throw new Error('useImmuneSystem must be used within ImmuneSystemProvider');
  return context;
};
