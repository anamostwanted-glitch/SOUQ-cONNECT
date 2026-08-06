import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

console.log('Firebase Config:', firebaseConfig);

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const analytics = null;

// Use the named database if provided, otherwise default to '(default)'
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, databaseId);

console.log(`Firestore initialized with database ID: ${databaseId}`);

// Enable offline persistence
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch(() => {});
}

export const storage = getStorage(app);
export { firebaseConfig };

export default app;
