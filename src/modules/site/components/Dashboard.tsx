import React from 'react';
import { AdminDashboard } from '../../admin/components/AdminDashboard';
import { ConnectCommandCenter } from '../../user/components/ConnectCommandCenter';
import { useAuth } from '../../../core/providers/AuthProvider';
import { useSettings } from '../../../core/providers/SettingsProvider';

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

  // Routing based on effective role
  if (effectiveRole === 'admin' || effectiveRole === 'manager' || effectiveRole === 'supervisor') {
    return (
      <AdminDashboard
        profile={profile}
        features={features}
        onOpenChat={onOpenChat}
        onViewProfile={onViewProfile}
        activeTab={dashboardTab}
        setActiveTab={setDashboardTab}
      />
    );
  }

  // Use the new unified Connect Command Center for both Suppliers and Customers
  return (
    <ConnectCommandCenter
      profile={profile}
      features={features}
      onOpenChat={onOpenChat}
      onViewProfile={onViewProfile}
      uiStyle={uiStyle}
    />
  );
}
