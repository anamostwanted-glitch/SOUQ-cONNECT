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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-brand-primary" />
            Sovereign Passkeys
          </h3>
          <p className="text-sm text-gray-400">Secure entry via biometric or hardware keys. Zero cost, absolute security.</p>
        </div>
        
        <button
          onClick={handleRegister}
          disabled={registering}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-xl transition-all border border-brand-primary/20 disabled:opacity-50"
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
            <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl border border-white/10" />
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
                className="group relative bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-brand-primary/30 transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRemove(key.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Revoke Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-brand-primary/10 rounded-xl">
                    {key.deviceType === 'Mobile' ? (
                      <Smartphone className="w-6 h-6 text-brand-primary" />
                    ) : (
                      <Monitor className="w-6 h-6 text-brand-primary" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1 truncate pr-8">{key.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      Sovereign Verified
                    </div>
                    {key.lastUsedAt && (
                      <div className="text-[10px] text-gray-500 mt-2">
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
        <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-dashed border-white/10 rounded-3xl text-center">
          <div className="p-4 bg-white/5 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h4 className="text-white font-bold mb-2">No Sovereign Keys Detected</h4>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
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
