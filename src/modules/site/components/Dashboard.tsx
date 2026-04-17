import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../../core/providers/AuthProvider';
import { useSettings } from '../../../core/providers/SettingsProvider';
import { Loader2 } from 'lucide-react';

const AdminDashboard = lazy(() => import('../../admin/components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ConnectCommandCenter = lazy(() => import('../../user/components/ConnectCommandCenter').then(m => ({ default: m.ConnectCommandCenter })));

interface DashboardProps {
  dashboardTab: string;
  setDashboardTab: (tab: string) => void;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  uiStyle?: 'classic' | 'minimal';
}

export default function Dashboard({
  dashboardTab,
  setDashboardTab,
  onOpenChat,
  onViewProfile,
  uiStyle = 'classic'
}: DashboardProps) {
  const { profile, viewMode } = useAuth();
  const { features } = useSettings();

  if (!profile) return null;

  // Determine the effective role based on viewMode if available, otherwise fallback to profile.role
  const effectiveRole = viewMode || profile.role;

  const loadingFallback = (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin text-brand-primary" size={40} />
      <p className="text-brand-text-muted font-bold animate-pulse">
        {profile.language === 'ar' ? 'جاري تهيئة لوحة التحكم العصبية...' : 'Initializing Neural Dashboard...'}
      </p>
    </div>
  );

  return (
    <Suspense fallback={loadingFallback}>
      {effectiveRole === 'admin' || effectiveRole === 'manager' || effectiveRole === 'supervisor' ? (
        <AdminDashboard
          profile={profile}
          features={features}
          onOpenChat={onOpenChat}
          onViewProfile={onViewProfile}
          activeTab={dashboardTab}
          setActiveTab={setDashboardTab}
        />
      ) : (
        <ConnectCommandCenter
          profile={profile}
          features={features}
          onOpenChat={onOpenChat}
          onViewProfile={onViewProfile}
          uiStyle={uiStyle}
        />
      )}
    </Suspense>
  );
}
