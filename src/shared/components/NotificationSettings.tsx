import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../core/firebase';
import { UserProfile } from '../../core/types';
import { handleFirestoreError, OperationType } from '../../core/utils/errorHandling';

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
    newRequests: true,
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
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`, false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">{isRtl ? 'إعدادات الإشعارات' : 'Notification Settings'}</h3>
      <div className="space-y-4">
        {Object.entries(prefs).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{t(`notifications.${key}`)}</span>
            <button
              onClick={() => togglePref(key as keyof typeof prefs)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${value ? 'bg-primary' : 'bg-input'}`}
            >
              <span className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${value ? (isRtl ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
