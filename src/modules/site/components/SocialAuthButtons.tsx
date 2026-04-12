import React from 'react';
import { Apple } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider } from 'firebase/auth';
import { auth } from '../../../core/firebase';

interface SocialAuthButtonsProps {
  onSuccess: (role: string) => void;
  role: string;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ onSuccess, role }) => {
  const handleSocialSignIn = async (provider: any) => {
    try {
      const result = await signInWithPopup(auth, provider);
      // Handle user creation/login logic here
      // For now, just call success
      onSuccess(role);
    } catch (error) {
      console.error('Social auth error:', error);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      <button
        onClick={() => handleSocialSignIn(new GoogleAuthProvider())}
        className="flex items-center justify-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
      </button>
      <button
        onClick={() => handleSocialSignIn(new FacebookAuthProvider())}
        className="flex items-center justify-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg" alt="Facebook" className="w-6 h-6" />
      </button>
      <button
        onClick={() => handleSocialSignIn(new OAuthProvider('apple.com'))}
        className="flex items-center justify-center p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <Apple className="w-6 h-6 text-black" />
      </button>
    </div>
  );
};
