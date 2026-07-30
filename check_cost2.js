import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, limit, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "ai-studio-applet-webapp-97624",
  "appId": "1:881204607614:web:4e1194f7610b23b28ab62f",
  "apiKey": "AIzaSyC0I65z9HYEeF59oXiOG4KsMz0NR_tJNbI",
  "authDomain": "ai-studio-applet-webapp-97624.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-cc8f3a05-d259-4680-af2c-95728b0d1d8a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  try {
    const q = query(collection(db, 'usage_logs'), limit(1000));
    const snap = await getDocs(q);
    const logs = snap.docs.map(d => d.data());
    
    const totalCost = logs.reduce((acc, log) => acc + (log.estimatedCost || 0), 0);
    const uniqueUsers = new Set(logs.map(l => l.uid)).size || 1;
    const costPerUser = totalCost / uniqueUsers;
    
    console.log("Stats:");
    console.log(JSON.stringify({ totalCost, uniqueUsers, costPerUser, logsCount: logs.length }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
