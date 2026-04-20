import { doc, updateDoc, writeBatch, collection, query, where, getDocs, limit, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

/**
 * Robust utility to synchronize profile updates across multiple collections.
 * Ensures data consistency between private and public records.
 */
export const updateUserProfile = async (uid: string, profileData: Partial<UserProfile>): Promise<void> => {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  
  // 1. Prepare private profile update
  const userRef = doc(db, 'users', uid);
  const privateData = { ...profileData, updatedAt: now };
  batch.update(userRef, privateData);

  // 2. Prepare public profile update (only specific fields allowed for public view)
  const publicRef = doc(db, 'users_public', uid);
  const publicData: any = { updatedAt: now };
  
  // Define fields that should be reflected in public profiles
  const publicFields: (keyof UserProfile)[] = [
    'name', 'companyName', 'role', 'logoUrl', 'photoURL', 'coverUrl', 
    'bio', 'businessDescription', 'location', 'website', 'categories', 
    'keywords', 'isVerified', 'rating', 'reviewCount', 'lastActive', 
    'isDeleted', 'socialLinks', 'branding'
  ];

  publicFields.forEach(field => {
    if (profileData[field] !== undefined) {
      publicData[field] = profileData[field];
    }
  });

  // Ensure public record is updated or created if missing
  batch.set(publicRef, publicData, { merge: true });

  // 3. Log activity for Growth Tracking
  const activityRef = collection(db, 'activity_logs');
  batch.set(doc(activityRef), {
    userId: uid,
    action: 'profile_update',
    fields: Object.keys(profileData),
    createdAt: now
  });

  // 4. Execution
  await batch.commit();

  // 5. Denormalized data update (Legacy/Scale strategy)
  if (profileData.companyName || profileData.name || profileData.logoUrl) {
    syncSupplierDataToMarketplace(uid, {
      sellerName: profileData.companyName || profileData.name,
      isVerifiedSupplier: profileData.isVerified
    }).catch(err => console.error('Failed to sync supplier data to marketplace:', err));
  }
};

/**
 * Synchronizes supplier details across their marketplace items.
 * Limits sync to 100 items (safety for client-side execution).
 */
export const syncSupplierDataToMarketplace = async (supplierId: string, data: { sellerName?: string, isVerifiedSupplier?: boolean }): Promise<void> => {
  if (!data.sellerName && data.isVerifiedSupplier === undefined) return;

  const marketplaceRef = collection(db, 'marketplace');
  // Only sync active/sold items to save quota
  const q = query(
    marketplaceRef, 
    where('sellerId', '==', supplierId), 
    where('status', 'in', ['active', 'sold']),
    limit(100) 
  );
  
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach(itemDoc => {
    batch.update(itemDoc.ref, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  });

  await batch.commit();
};
