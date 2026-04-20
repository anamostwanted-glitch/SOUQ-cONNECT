import { 
  multiFactor, 
  TotpMultiFactorGenerator, 
  TotpSecret, 
  getMultiFactorResolver,
  MultiFactorResolver,
  User,
  MultiFactorAssertion,
  TotpMultiFactorAssertion
} from 'firebase/auth';
import { auth } from '../firebase';

/**
 * MultiFactorService
 * Handles Enrollment and Verification for MFA in Souq Connect.
 * Focuses on TOTP (Authenticator App) for maximum security.
 */
export const MultiFactorService = {
  /**
   * Check if the current user has MFA enabled
   */
  isEnabled: (user: User | null): boolean => {
    if (!user) return false;
    return multiFactor(user).enrolledFactors.length > 0;
  },

  /**
   * Start the enrollment process for TOTP
   * Returns the secret needed for the QR code
   */
  startTotpEnrollment: async (user: User): Promise<TotpSecret> => {
    const session = await multiFactor(user).getSession();
    return TotpMultiFactorGenerator.generateSecret(session);
  },

  /**
   * Finalize TOTP enrollment
   */
  finalizeTotpEnrollment: async (
    user: User, 
    secret: TotpSecret, 
    verificationCode: string, 
    displayName: string = 'Souq Connect Authenticator'
  ): Promise<void> => {
    const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, verificationCode);
    await multiFactor(user).enroll(assertion, displayName);
  },

  /**
   * Disenroll from MFA
   */
  unenroll: async (user: User, factorUid: string): Promise<void> => {
    await multiFactor(user).unenroll(factorUid);
  },

  /**
   * Handle MFA Sign In
   * If a user triggers a 'auth/multi-factor-auth-required' error, 
   * this method helps resolve the session.
   */
  resolveSignIn: async (
    resolver: MultiFactorResolver,
    verificationCode: string,
    selectedIndex: number = 0
  ): Promise<any> => {
    const hints = resolver.hints;
    const selectedHint = hints[selectedIndex];
    
    if (selectedHint.factorId === TotpMultiFactorGenerator.FACTOR_ID) {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        selectedHint.uid,
        verificationCode
      );
      return resolver.resolveSignIn(assertion);
    }
    
    throw new Error('Unsupported MFA factor selected');
  }
};
