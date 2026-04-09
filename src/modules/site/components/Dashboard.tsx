import React from 'react';
import { UserProfile, AppFeatures } from '../../../core/types';
import { AdminDashboard } from '../../admin/components/AdminDashboard';
import { VendorDashboard } from '../../vendor/components/VendorDashboard';
import { ConnectCommandCenter } from '../../user/components/ConnectCommandCenter';
import LegacyDashboard from './LegacyDashboard';

interface DashboardProps {
  profile: UserProfile;
  features: AppFeatures;
  dashboardTab: string;
  setDashboardTab: (tab: string) => void;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  viewMode?: 'admin' | 'supplier' | 'customer';
  uiStyle?: 'classic' | 'minimal';
}

export default function Dashboard({
  profile,
  features,
  dashboardTab,
  setDashboardTab,
  onOpenChat,
  onViewProfile,
  viewMode,
  uiStyle = 'classic'
}: DashboardProps) {
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
