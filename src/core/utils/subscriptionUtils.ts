import { UserProfile } from '../types';

export interface SubscriptionInfo {
  isTrialActive: boolean;
  daysRemaining: number;
  effectivePlan: 'basic' | 'pro' | 'enterprise';
  planBadgeAr: string;
  planBadgeEn: string;
  trialEndDate?: Date;
}

/**
 * Calculates the user's active plan considering paid subscriptions and 
 * the 15-day free trial period for new accounts with full feature access.
 */
export const getEffectiveSubscription = (profile?: UserProfile | null): SubscriptionInfo => {
  if (!profile) {
    return {
      isTrialActive: false,
      daysRemaining: 0,
      effectivePlan: 'basic',
      planBadgeAr: 'الباقة الأساسية',
      planBadgeEn: 'Basic Plan'
    };
  }

  // 1. Explicit Paid Plan Check
  const rawPlan = typeof profile.subscriptionPlan === 'object'
    ? (profile.subscriptionPlan as any)?.code
    : (profile.subscriptionPlan || (profile as any)?.plan);

  const normalizedPlan = (rawPlan || 'basic').toLowerCase();

  if (normalizedPlan === 'pro' || normalizedPlan === 'enterprise' || normalizedPlan === 'elite') {
    return {
      isTrialActive: false,
      daysRemaining: 0,
      effectivePlan: normalizedPlan === 'enterprise' ? 'enterprise' : 'pro',
      planBadgeAr: normalizedPlan === 'enterprise' ? 'باقة المؤسسات Enterprise' : 'باقة احترافية Pro',
      planBadgeEn: normalizedPlan === 'enterprise' ? 'Enterprise Tier' : 'Pro Tier'
    };
  }

  // 2. Free Trial Evaluation (Supports Admin custom duration & default 15 days)
  let trialEndMs: number;

  if (profile.trialEndsAt) {
    trialEndMs = new Date(profile.trialEndsAt).getTime();
  } else {
    const createdAtMs = profile.createdAt ? new Date(profile.createdAt).getTime() : Date.now();
    const trialDays = profile.customTrialDays && profile.customTrialDays > 0 ? profile.customTrialDays : 15;
    const TRIAL_DURATION_MS = trialDays * 24 * 60 * 60 * 1000;
    trialEndMs = createdAtMs + TRIAL_DURATION_MS;
  }

  const nowMs = Date.now();
  const remainingMs = trialEndMs - nowMs;
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

  if (daysRemaining > 0) {
    return {
      isTrialActive: true,
      daysRemaining,
      effectivePlan: 'pro', // Full access to all platform features during trial
      planBadgeAr: `تجربة مجانية كاملة (متبقي ${daysRemaining} يوم)`,
      planBadgeEn: `Full Free Trial (${daysRemaining} days left)`,
      trialEndDate: new Date(trialEndMs)
    };
  }

  // 3. Fallback to Basic
  return {
    isTrialActive: false,
    daysRemaining: 0,
    effectivePlan: 'basic',
    planBadgeAr: 'الباقة الأساسية',
    planBadgeEn: 'Basic Tier'
  };
};
