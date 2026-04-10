import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

export interface AuditLog {
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details: any;
}

export const logAction = async (userId: string, action: string, resource: string, details: any) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      details,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'audit_logs', false);
  }
};
