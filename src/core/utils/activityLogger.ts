import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export type ActivityType = 'message_sent' | 'request_created' | 'offer_received' | 'profile_updated' | 'login' | 'view_product';

export const logActivity = async (
  type: ActivityType,
  descriptionAr: string,
  descriptionEn: string,
  metadata: any = {}
) => {
  if (!auth.currentUser) return;

  try {
    await addDoc(collection(db, 'activities'), {
      userId: auth.currentUser.uid,
      type,
      descriptionAr,
      descriptionEn,
      metadata,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
