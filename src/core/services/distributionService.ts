import { UserProfile } from '../types';

/**
 * Smart Distribution Service
 * Designed by: Solution Architect & PM
 * Implemented by: Full-Stack Developer
 */

export interface DistributionMetrics {
  visibilityDelayMinutes: number;
  priorityLevel: 'high' | 'medium' | 'low' | 'boost';
  score: number;
}

/**
 * Calculates the supplier rank and visibility delay based on performance metrics.
 * Fairness logic:
 * - New suppliers get a 'boost' for their first 30 days.
 * - Top performers (Rank > 80) see requests instantly.
 * - Good performers (Rank 50-80) see requests with a 5-minute delay.
 * - Low performers (Rank < 50) see requests with a 15-minute delay.
 */
export const calculateDistributionMetrics = (profile: UserProfile): DistributionMetrics => {
  if (profile.role !== 'supplier') {
    return { visibilityDelayMinutes: 0, priorityLevel: 'high', score: 100 };
  }

  // 1. Check for Newcomer Boost (First 30 days)
  const createdAt = new Date(profile.createdAt);
  const now = new Date();
  const daysSinceJoined = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceJoined <= 30) {
    return { visibilityDelayMinutes: 0, priorityLevel: 'boost', score: 90 };
  }

  // 2. Calculate Score (Weighted Average)
  const perf = profile.performance || {
    activityScore: 50,
    performanceScore: 50,
    ratingScore: (profile.rating || 0) * 20, // Convert 0-5 to 0-100
    totalRank: 50
  };

  // Activity Score: Based on last login
  let activityScore = perf.activityScore;
  if (profile.lastLoginAt) {
    const lastLogin = new Date(profile.lastLoginAt);
    const hoursSinceLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60));
    if (hoursSinceLogin < 24) activityScore = 100;
    else if (hoursSinceLogin < 72) activityScore = 70;
    else activityScore = 30;
  }

  // Performance Score: Based on response time
  let performanceScore = perf.performanceScore;
  if (profile.averageResponseTime) {
    if (profile.averageResponseTime < 30) performanceScore = 100; // < 30 mins
    else if (profile.averageResponseTime < 120) performanceScore = 70; // < 2 hours
    else performanceScore = 40;
  }

  const ratingScore = (profile.rating || 0) * 20;

  const totalScore = (activityScore * 0.3) + (performanceScore * 0.4) + (ratingScore * 0.3);

  // 3. Determine Visibility Delay
  if (totalScore >= 80) {
    return { visibilityDelayMinutes: 0, priorityLevel: 'high', score: totalScore };
  } else if (totalScore >= 50) {
    return { visibilityDelayMinutes: 5, priorityLevel: 'medium', score: totalScore };
  } else {
    return { visibilityDelayMinutes: 15, priorityLevel: 'low', score: totalScore };
  }
};

/**
 * Checks if a request should be visible to a supplier based on its age and the supplier's delay.
 */
export const isRequestVisible = (requestCreatedAt: string, delayMinutes: number): boolean => {
  if (delayMinutes === 0) return true;
  
  const createdAt = new Date(requestCreatedAt);
  const now = new Date();
  const ageMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
  
  return ageMinutes >= delayMinutes;
};
