import { UserProfile, UserRole } from '../types';

export const hasRole = (profile: UserProfile | null, roles: UserRole[]): boolean => {
  if (!profile) return false;
  return roles.includes(profile.role);
};

export const isAdmin = (profile: UserProfile | null): boolean => {
  return hasRole(profile, ['admin', 'manager', 'supervisor']);
};

export const isSupplier = (profile: UserProfile | null): boolean => {
  return hasRole(profile, ['supplier']);
};

export const isCustomer = (profile: UserProfile | null): boolean => {
  return hasRole(profile, ['customer']);
};
