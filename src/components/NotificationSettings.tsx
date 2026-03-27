import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

interface NotificationSettingsProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ profile, onUpdateProfile }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [prefs, setPrefs] = useState(profile.notificationPreferences || {
    newMessages: true,
    newOffers: true,
    requestUpdates: true,
    verificationStatus: true,
  });

  const togglePref = async (key: keyof typeof prefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        notificationPreferences: newPrefs
      });
      onUpdateProfile({ ...profile, notificationPreferences: newPrefs });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl border border-brand-border shadow-sm">
      <h2 className="text-lg font-bold mb-4 text-brand-text-main">{isRtl ? 'إعدادات الإشعارات' : 'Notification Settings'}</h2>
      <div className="space-y-4">
        {Object.entries(prefs).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-brand-text-main">{t(`notifications.${key}`)}</span>
            <button
              onClick={() => togglePref(key as keyof typeof prefs)}
              className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-brand-primary' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
