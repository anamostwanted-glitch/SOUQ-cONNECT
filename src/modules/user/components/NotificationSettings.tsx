import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../../core/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../../../core/types';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { Bell, Zap, Package, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface NotificationSettingsProps {
  profile: UserProfile;
  onUpdate: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ profile, onUpdate }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [preferences, setPreferences] = useState(profile.notificationPreferences || {
    newRequests: true,
    offers: true,
    aiInsights: true
  });
  const [loading, setLoading] = useState(false);

  const togglePreference = async (key: keyof typeof preferences) => {
    setLoading(true);
    try {
      const newPrefs = { ...preferences, [key]: !preferences[key] };
      setPreferences(newPrefs);
      await updateDoc(doc(db, 'users', profile.uid), {
        notificationPreferences: newPrefs
      });
      onUpdate();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl border border-brand-border shadow-sm"
    >
      <h2 className="text-xl font-bold text-brand-text-main mb-6 flex items-center gap-2">
        <Bell className="text-brand-primary" />
        {isRtl ? 'تفضيلات الإشعارات' : 'Notification Preferences'}
      </h2>

      <div className="space-y-4">
        {[
          { key: 'newRequests', label: isRtl ? 'طلبات جديدة' : 'New Requests', icon: Package },
          { key: 'offers', label: isRtl ? 'العروض' : 'Offers', icon: Zap },
          { key: 'aiInsights', label: isRtl ? 'رؤى الذكاء الاصطناعي' : 'AI Insights', icon: Sparkles }
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-brand-surface border border-brand-border-light">
            <div className="flex items-center gap-3">
              <item.icon className="text-brand-primary" size={20} />
              <span className="font-medium text-brand-text-main">{item.label}</span>
            </div>
            <button
              onClick={() => togglePreference(item.key as keyof typeof preferences)}
              disabled={loading}
              className={`w-12 h-6 rounded-full transition-colors relative ${preferences[item.key as keyof typeof preferences] ? 'bg-brand-primary' : 'bg-brand-border'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${preferences[item.key as keyof typeof preferences] ? (isRtl ? 'left-1' : 'right-1') : (isRtl ? 'right-7' : 'left-1')}`} />
            </button>
          </div>
        ))}
      </div>
      {loading && <Loader2 className="animate-spin text-brand-primary mx-auto mt-4" />}
    </motion.div>
  );
};
