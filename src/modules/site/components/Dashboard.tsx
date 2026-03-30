import React from 'react';
import { UserProfile, AppFeatures } from '../../../core/types';
import { AdminDashboard } from '../../admin/components/AdminDashboard';
import { VendorDashboard } from '../../vendor/components/VendorDashboard';
import { UserDashboard } from '../../user/components/UserDashboard';
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
      <LegacyDashboard
        profile={profile}
        features={features}
        supplierTab={supplierTab}
        setSupplierTab={setSupplierTab}
        onOpenChat={onOpenChat}
        onViewProfile={onViewProfile}
      />
    );
  }

  if (effectiveRole === 'supplier') {
    return (
      <VendorDashboard
        profile={profile}
        features={features}
        supplierTab={supplierTab}
        setSupplierTab={setSupplierTab}
        onOpenChat={onOpenChat}
        onViewProfile={onViewProfile}
        uiStyle={uiStyle}
      />
    );
  }

  // Regular users get the new UserDashboard
  return (
    <UserDashboard
      profile={profile}
      features={features}
      supplierTab={supplierTab}
      setSupplierTab={setSupplierTab}
      onOpenChat={onOpenChat}
      onViewProfile={onViewProfile}
      uiStyle={uiStyle}
    />
  );
}
