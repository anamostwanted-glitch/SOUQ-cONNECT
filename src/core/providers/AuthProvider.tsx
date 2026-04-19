import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { handleFirestoreError, OperationType, handleAiError } from '../utils/errorHandling';

interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  viewMode: UserRole;
  setViewMode: (role: UserRole) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<UserRole>('customer');

  useEffect(() => {
    let unsubscribeUser: any = null;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setLoading(true);
        unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setProfile(userData);
            // Sync viewMode with actual role if it's not customer
            setViewMode(prev => prev === 'customer' && userData.role !== 'customer' ? userData.role : prev);
            setLoading(false);
          } else {
            // Core Team: Grace period for document creation (e.g., social sign-up)
            // We don't set loading to false yet, allowing the app-level loader to stay active
            // whereas future snapshots (when setDoc happens) will trigger the true case above.
            const fallbackTimeout = setTimeout(() => {
              // Only trigger fallback if we are still without a profile after the delay
              setProfile(p => {
                if (!p) {
                  setLoading(false);
                }
                return p;
              });
            }, 5000);
            
            return () => clearTimeout(fallbackTimeout);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`, false);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeUser) unsubscribeUser();
      }
    }, (error) => {
      handleAiError(error, "AuthProvider:onAuthStateChanged", false);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  // Sync Role to Custom Claims for performance & security
  useEffect(() => {
    let isMounted = true;
    const syncRole = async () => {
      if (!profile || !auth.currentUser) return;
      
      // Check if we already tried and failed recently to avoid infinite loops
      const lastSyncError = sessionStorage.getItem('last_role_sync_error');
      if (lastSyncError && Date.now() - parseInt(lastSyncError) < 60000) return;

      try {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch('/api/sync-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ role: profile.role })
        });
        
        if (response.ok) {
          if (!isMounted) return;
          const data = await response.json();
          if (data.warning === "Identity Toolkit API disabled") {
            console.warn('Custom roles (Custom Claims) are currently disabled. System will fallback to Firestore rules checks.');
          } else {
            // Force token refresh to pick up new claims
            await auth.currentUser.getIdToken(true);
            console.log('Role synced to custom claims successfully');
          }
          sessionStorage.removeItem('last_role_sync_error');
        } else {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            if (errorData.error === "Identity Toolkit API disabled") {
              console.warn('Custom roles (Custom Claims) are currently disabled. System will fallback to Firestore rules checks.');
              sessionStorage.setItem('last_role_sync_error', Date.now().toString());
            }
          } else {
            console.warn('Server returned non-JSON response for role sync. Server might be restarting.');
          }
        }
      } catch (error) {
        // Only log if it's not a standard fetch failure (which happens during server restarts)
        if (error instanceof Error && error.message !== 'Failed to fetch') {
          console.error('Failed to sync role to custom claims:', error);
        }
        sessionStorage.setItem('last_role_sync_error', Date.now().toString());
      }
    };

    syncRole();
    return () => { isMounted = false; };
  }, [profile?.role, auth.currentUser?.uid]);

  return (
    <AuthContext.Provider value={{ profile, loading, viewMode, setViewMode, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
