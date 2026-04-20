import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, X, Copy, Check, Smartphone, AlertTriangle, KeySquare, ChevronRight, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { auth } from '../../../core/firebase';
import { MultiFactorService } from '../../../core/services/MultiFactorService';
import { HapticButton } from '../../../shared/components/HapticButton';
import { toast } from 'sonner';

interface MFAEnrollmentModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * MFAEnrollmentModal
 * Guides the user through TOTP (Authenticator App) setup.
 */
export const MFAEnrollmentModal: React.FC<MFAEnrollmentModalProps> = ({ show, onClose, onSuccess }) => {
  const [step, setStep] = useState<'intro' | 'scan' | 'verify' | 'success'>('intro');
  const [totpSecret, setTotpSecret] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const startEnrollment = async () => {
    try {
      if (!auth.currentUser) return;
      const secret = await MultiFactorService.startTotpEnrollment(auth.currentUser);
      setTotpSecret(secret);
      setStep('scan');
    } catch (error: any) {
      console.error('MFA Enrollment error:', error);
      toast.error('Failed to start MFA enrollment. Please try again.');
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) return;
    
    setIsVerifying(true);
    try {
      if (!auth.currentUser || !totpSecret) return;
      await MultiFactorService.finalizeTotpEnrollment(auth.currentUser, totpSecret, verificationCode);
      setStep('success');
      onSuccess();
    } catch (error: any) {
      console.error('MFA Verification error:', error);
      toast.error('Invalid verification code. Please check your app.');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Secret key copied to clipboard');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-brand-surface w-full max-w-xl rounded-[3rem] border border-brand-border shadow-2xl overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-8 border-b border-brand-border flex items-center justify-between bg-gradient-to-r from-brand-primary/5 to-brand-teal/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg text-brand-primary">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Souq Secure (MFA)</h2>
              <p className="text-brand-text-muted text-sm font-medium">Extra layer of security for your business</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-brand-background rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-brand-teal/10 rounded-full flex items-center justify-center text-brand-teal">
                    <Smartphone size={40} />
                  </div>
                  <h3 className="text-xl font-bold">Use an Authenticator App</h3>
                  <p className="text-brand-text-muted leading-relaxed">
                    Secure your account using a 2-step verification method. Download an authenticator app like Google Authenticator or Microsoft Authenticator to get started.
                  </p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-4 items-start">
                  <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium leading-snug">
                    Important: You will need access to your phone every time you sign in to confirm your identity.
                  </p>
                </div>

                <HapticButton
                  onClick={startEnrollment}
                  className="w-full py-5 bg-brand-primary text-white rounded-3xl font-black text-lg shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all flex items-center justify-center gap-3"
                >
                  Get Started <ChevronRight size={20} />
                </HapticButton>
              </motion.div>
            )}

            {step === 'scan' && totpSecret && (
              <motion.div
                key="scan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold">Scan the QR Code</h3>
                  <p className="text-brand-text-muted text-sm">Open your authenticator app and scan this code</p>
                </div>

                <div className="flex justify-center">
                  <div className="p-6 bg-white rounded-[2rem] shadow-xl border-4 border-brand-teal/20">
                    <QRCodeSVG 
                      value={totpSecret.generateQrCodeUrl(auth.currentUser?.email || 'user', 'Souq Connect')}
                      size={200}
                      level="H"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-center text-sm font-bold text-brand-text-muted uppercase tracking-widest">Or enter the code manually</p>
                  <div className="flex items-center gap-3 bg-brand-background p-4 rounded-2xl border border-brand-border">
                    <KeySquare className="text-brand-primary" size={24} />
                    <code className="flex-1 font-mono text-lg font-black tracking-widest text-brand-primary">
                      {totpSecret.secretCode}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(totpSecret.secretCode)}
                      className="p-2 hover:bg-brand-surface rounded-xl transition-colors"
                    >
                      {copied ? <Check size={20} className="text-brand-teal" /> : <Copy size={20} className="text-brand-text-muted" />}
                    </button>
                  </div>
                </div>

                <HapticButton
                  onClick={() => setStep('verify')}
                  className="w-full py-5 bg-brand-teal text-white rounded-3xl font-black text-lg shadow-xl transition-all"
                >
                  Done, Next Step
                </HapticButton>
              </motion.div>
            )}

            {step === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto text-brand-primary">
                    <KeySquare size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Verify the Setup</h3>
                  <p className="text-brand-text-muted">Enter the 6-digit code from your authenticator app to complete enrollment.</p>
                </div>

                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000 000"
                    className="w-full max-w-xs text-center text-5xl font-black tracking-[0.5em] bg-transparent border-b-4 border-brand-primary focus:outline-none focus:border-brand-teal transition-colors py-4 placeholder:opacity-20"
                  />
                </div>

                <div className="flex gap-4">
                  <HapticButton
                    onClick={() => setStep('scan')}
                    className="flex-1 py-4 bg-brand-background text-brand-text-muted rounded-2xl font-bold"
                  >
                    Back
                  </HapticButton>
                  <HapticButton
                    onClick={handleVerify}
                    disabled={verificationCode.length !== 6 || isVerifying}
                    className="flex-[2] py-4 bg-brand-primary text-white rounded-2xl font-black shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isVerifying ? <Loader2 className="animate-spin" /> : 'Complete Setup'}
                  </HapticButton>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8 py-8"
              >
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-brand-teal text-white rounded-full flex items-center justify-center shadow-2xl relative z-10">
                    <Check size={48} strokeWidth={3} />
                  </div>
                  <motion.div 
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-brand-teal rounded-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-brand-text-main">Account Secured!</h3>
                  <p className="text-brand-text-muted text-lg">Multi-Factor Authentication is now active on your profile.</p>
                </div>

                <HapticButton
                  onClick={onClose}
                  className="w-full py-5 bg-brand-primary text-white rounded-3xl font-black text-lg"
                >
                  Great, Thanks!
                </HapticButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
