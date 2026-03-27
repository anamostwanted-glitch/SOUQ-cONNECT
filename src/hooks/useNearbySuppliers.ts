import { useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

export function useNearbySuppliers(profile: UserProfile | null) {
  useEffect(() => {
    if (!profile || !navigator.geolocation) return;

    let isChecking = false;
    let cachedSuppliers: UserProfile[] = [];
    let lastFetchTime = 0;

    const checkNearbySuppliers = async (latitude: number, longitude: number) => {
      if (isChecking) return;
      isChecking = true;
      
      try {
        const now = Date.now();
        // Fetch suppliers if cache is empty or older than 5 minutes
        if (cachedSuppliers.length === 0 || now - lastFetchTime > 5 * 60 * 1000) {
          const suppliersQuery = query(collection(db, 'users'), where('role', '==', 'supplier'));
          const snapshot = await getDocs(suppliersQuery);
          cachedSuppliers = snapshot.docs.map(doc => doc.data() as UserProfile);
          lastFetchTime = now;
        }
        
        const notifiedSuppliersStr = localStorage.getItem(`notified_suppliers_${profile.uid}`);
        const notifiedSuppliers = notifiedSuppliersStr ? JSON.parse(notifiedSuppliersStr) : {};
        let updatedNotified = false;

        for (const supplier of cachedSuppliers) {
          if (supplier.uid === profile.uid) continue; // Skip self
          
          if (supplier.coordinates) {
            const distance = calculateDistance(
              latitude,
              longitude,
              supplier.coordinates.latitude,
              supplier.coordinates.longitude
            );

            // If within 5 km
            if (distance <= 5) {
              const lastNotified = notifiedSuppliers[supplier.uid];
              // Notify if never notified, or if last notification was more than 24 hours ago
              if (!lastNotified || (now - lastNotified > 24 * 60 * 60 * 1000)) {
                // Send notification
                await addDoc(collection(db, 'notifications'), {
                  userId: profile.uid,
                  titleAr: 'مورد بالقرب منك!',
                  titleEn: 'Supplier Nearby!',
                  bodyAr: `أنت بالقرب من المورد: ${supplier.companyName || supplier.name}. اكتشف خدماتهم الآن!`,
                  bodyEn: `You are near the supplier: ${supplier.companyName || supplier.name}. Discover their services now!`,
                  link: 'marketplace',
                  actionType: 'general',
                  targetId: supplier.uid,
                  read: false,
                  createdAt: new Date().toISOString()
                });

                notifiedSuppliers[supplier.uid] = now;
                updatedNotified = true;
              }
            }
          }
        }

        if (updatedNotified) {
          localStorage.setItem(`notified_suppliers_${profile.uid}`, JSON.stringify(notifiedSuppliers));
        }

      } catch (error) {
        console.error("Error checking nearby suppliers:", error);
      } finally {
        isChecking = false;
      }
    };

    // Watch position
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        checkNearbySuppliers(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation watch error:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000, // 1 minute
        timeout: 10000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [profile]);
}
