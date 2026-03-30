import { useState, useEffect } from 'react';

export type NetworkStatus = '4g' | '3g' | '2g' | 'slow-2g' | 'offline';

export function useNetworkAwareness() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('4g');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const updateNetworkStatus = () => {
        setNetworkStatus(connection.effectiveType || '4g');
      };
      
      connection.addEventListener('change', updateNetworkStatus);
      updateNetworkStatus();
      
      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
        connection.removeEventListener('change', updateNetworkStatus);
      };
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return { networkStatus, isOnline };
}
