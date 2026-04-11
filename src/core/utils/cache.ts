import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCachedData = async (key: string) => {
  const cacheRef = doc(db, 'cache', key);
  const docSnap = await getDoc(cacheRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (Date.now() - data.timestamp < CACHE_DURATION) {
      return data.value;
    }
  }
  return null;
};

export const setCachedData = async (key: string, value: any) => {
  const cacheRef = doc(db, 'cache', key);
  await setDoc(cacheRef, {
    value,
    timestamp: Date.now()
  });
};
