import React from 'react';
import { SiteSettings } from '../../../../core/types';
import { Switch } from '../../../../shared/components/ui/switch';

interface SocialProofSettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  isRtl: boolean;
}

export const SocialProofSettings: React.FC<SocialProofSettingsProps> = ({ settings, setSettings, isRtl }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-brand-surface rounded-xl border border-brand-border">
        <span className="font-bold text-brand-text-main">
          {isRtl ? 'عرض قسم الإحصائيات' : 'Show Social Proof Section'}
        </span>
        <Switch
          checked={settings.socialProof?.enabled ?? true}
          onCheckedChange={(checked) => setSettings(prev => ({
            ...prev,
            socialProof: { ...prev.socialProof, enabled: checked }
          }))}
        />
      </div>
    </div>
  );
};
