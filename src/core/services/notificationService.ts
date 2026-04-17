import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { UserProfile } from '../types';

export const createNotification = async (notification: {
  userId: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  actionType?: string;
  targetId?: string;
  [key: string]: any; // Allow extra fields
}) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notification,
      createdAt: new Date().toISOString(),
      read: false,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications', false);
  }
};

export const notifyMatchingSuppliers = async (
  requestId: string,
  categoryId: string,
  productName: string,
  isRtl: boolean
) => {
  try {
    // 1. Find suppliers who match the category
    const suppliersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'supplier'),
      where('categories', 'array-contains', categoryId)
    );
    
    const snap = await getDocs(suppliersQuery);
    const suppliers = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

    // 2. Filter for verified suppliers or active ones (Growth Hack: prioritize elite experts)
    const targets = suppliers.filter(s => !s.isDeleted && s.onboardingCompleted);

    // 3. Batch create notifications
    const promises = targets.map(supplier => createNotification({
      userId: supplier.uid,
      titleAr: 'طلب جديد يطابق خبرتك! 🎯',
      titleEn: 'New Request Matches Your Expertise! 🎯',
      bodyAr: `هناك طلب جديد على "${productName}". كن أول من يقدم عرضاً!`,
      bodyEn: `New request for "${productName}". Be the first to submit an offer!`,
      actionType: 'submit_offer',
      targetId: requestId,
      link: `/marketplace?tab=requests&requestId=${requestId}`,
      imageUrl: supplier.logoUrl
    }));

    await Promise.all(promises);
    return targets.length;
  } catch (error) {
    console.error("Matching notification failed", error);
    return 0;
  }
};
