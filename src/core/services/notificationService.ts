import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

export const createNotification = async (notification: {
  userId: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  actionType?: string;
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
