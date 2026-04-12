import { UserProfile } from '../../core/types';

export const calculateProfileCompletion = (profile: UserProfile): number => {
  let completed = 0;
  let total = 0;

  // Essential fields for all users
  const fields = ['name', 'email', 'phone', 'location', 'bio'];
  total += fields.length;
  fields.forEach(field => {
    if (profile[field as keyof UserProfile]) completed++;
  });

  // Role-specific fields
  if (profile.role === 'supplier') {
    total += 2;
    if (profile.companyName) completed++;
    if (profile.categories && profile.categories.length > 0) completed++;
  }

  return Math.round((completed / total) * 100);
};
