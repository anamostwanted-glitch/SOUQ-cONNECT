import { UserProfile } from '../types';

export const getUserImageUrl = (profile: UserProfile | undefined): string => {
  if (!profile) return `https://ui-avatars.com/api/?name=User&background=random`;
  const url = profile.photoURL || profile.logoUrl;
  return url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=random`;
};

export const getProxiedImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};
