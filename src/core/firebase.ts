import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';
import { handleFirestoreError, OperationType } from './utils/errorHandling';

console.log('Firebase Config:', firebaseConfig);

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

// Use the named database if provided, otherwise default to '(default)'
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, databaseId);

console.log(`Firestore initialized with database ID: ${databaseId}`);

// Enable offline persistence
/*
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});
*/

export const storage = getStorage(app);
export { firebaseConfig };

// Validate Connection to Firestore
async function testConnection() {
  try {
    // Try to get a document from the server to verify connection
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firestore connection verified successfully.');
  } catch (error: any) {
    handleFirestoreError(error, OperationType.GET, 'test/connection', false);
    if (error.code === 'unavailable') {
      console.warn("The Firestore backend is unreachable. This could be a network issue or an incorrect database ID.");
    } else if (error.code === 'permission-denied') {
      console.warn("Permission denied. Check your Firestore security rules.");
    }
  }
}
testConnection().catch(err => handleFirestoreError(err, OperationType.GET, 'test/connection:unhandled', false));

export default app;
