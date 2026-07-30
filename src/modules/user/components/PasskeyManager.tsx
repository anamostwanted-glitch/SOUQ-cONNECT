import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PasskeyService } from '../../../core/services/PasskeyService';
import { PasskeyCredential } from '../../../core/types';
import { Fingerprint, Monitor, Smartphone, Trash2, ShieldCheck, Zap, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface PasskeyManagerProps {
  userId: string;
}

export const PasskeyManager: React.FC<PasskeyManagerProps> = ({ userId }) => {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const fetchPasskeys = async () => {
    try {
      const keys = await PasskeyService.listPasskeys(userId);
      setPasskeys(keys);
    } catch (error) {
      toast.error('Failed to load Sovereign Keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, [userId]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const deviceName = `${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} Device - ${new Date().toLocaleDateString()}`;
      await PasskeyService.registerPasskey(userId, deviceName);
      toast.success('Sovereign Identity Secured: Passkey registered');
      fetchPasskeys();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Enrollment failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleRemove = async (keyId: string) => {
    try {
      await PasskeyService.removePasskey(userId, keyId);
      toast.success('Sovereign Key Revoked');
      fetchPasskeys();
    } catch (error) {
      toast.error('Revocation failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-brand-text-main flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-brand-primary shrink-0" />
            Sovereign Passkeys
          </h3>
          <p className="text-sm text-brand-text-muted mt-1 font-medium">Secure entry via biometric or hardware keys. Zero cost, absolute security.</p>
        </div>
        
        <button
          onClick={handleRegister}
          disabled={registering}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-xl font-bold transition-all border border-brand-primary/20 disabled:opacity-50 shrink-0"
        >
          {registering ? (
            <Zap className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Enroll New Device
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-24 bg-brand-background animate-pulse rounded-2xl border border-brand-border" />
          ))}
        </div>
      ) : passkeys.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {passkeys.map((key) => (
              <motion.div
                key={key.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative bg-brand-background border border-brand-border rounded-2xl p-4 hover:border-brand-primary/30 transition-all overflow-hidden"
              >
                <div className="absolute top-0 ltr:right-0 rtl:left-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRemove(key.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Revoke Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-primary/10 rounded-xl shrink-0">
                    {key.deviceType === 'Mobile' ? (
                      <Smartphone className="w-6 h-6 text-brand-primary" />
                    ) : (
                      <Monitor className="w-6 h-6 text-brand-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-brand-text-main mb-1 truncate ltr:pr-8 rtl:pl-8">{key.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-brand-text-muted font-medium">
                      <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                      Sovereign Verified
                    </div>
                    {key.lastUsedAt && (
                      <div className="text-[10px] text-brand-text-muted opacity-80 mt-2 font-mono">
                        Last pulse: {new Date(key.lastUsedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-brand-background border border-dashed border-brand-border rounded-3xl text-center">
          <div className="p-4 bg-brand-surface rounded-full mb-4 border border-brand-border">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h4 className="text-brand-text-main font-bold mb-2">No Sovereign Keys Detected</h4>
          <p className="text-sm text-brand-text-muted max-w-xs mx-auto font-medium">
            Enroll your current device to enable passwordless entry and secondary bio-verification.
          </p>
        </div>
      )}

      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
        <div className="flex gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-500 mb-1">Iron Dome Status: Active</p>
            <p className="text-xs text-emerald-400/70">
              Passkeys use end-to-end hardware encryption. Your biological data never leaves your device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
