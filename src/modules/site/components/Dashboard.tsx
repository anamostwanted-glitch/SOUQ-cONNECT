import React from 'react';
import { UserProfile, AppFeatures } from '../../../core/types';
import { AdminDashboard } from '../../admin/components/AdminDashboard';
import { VendorDashboard } from '../../vendor/components/VendorDashboard';
import { NexusCommandCenter } from '../../user/components/NexusCommandCenter';
import LegacyDashboard from './LegacyDashboard';

interface DashboardProps {
  profile: UserProfile;
  features: AppFeatures;
  supplierTab: string;
  setSupplierTab: (tab: string) => void;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  viewMode?: 'admin' | 'supplier' | 'customer';
  uiStyle?: 'classic' | 'minimal';
}

export default function Dashboard({
  profile,
  features,
  supplierTab,
  setSupplierTab,
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
      />
    );
  }

  // Use the new unified Nexus Command Center for both Suppliers and Customers
  return (
    <NexusCommandCenter
      profile={profile}
      features={features}
      onOpenChat={onOpenChat}
      onViewProfile={onViewProfile}
      uiStyle={uiStyle}
    />
  );
}
