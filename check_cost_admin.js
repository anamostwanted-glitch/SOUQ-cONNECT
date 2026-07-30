import admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

async function run() {
  try {
    const q = db.collection('usage_logs').orderBy('createdAt', 'desc').limit(1000);
    const snap = await q.get();
    const logs = snap.docs.map(d => d.data());
    
    const totalCost = logs.reduce((acc, log) => acc + (log.estimatedCost || 0), 0);
    const uniqueUsers = new Set(logs.map(l => l.uid)).size || 1;
    const costPerUser = totalCost / uniqueUsers; // This is treated as Monthly in the app
    
    const dailyCostPerUser = costPerUser / 30; // Assuming the projection is monthly
    
    console.log("Stats:");
    console.log(JSON.stringify({ 
      totalCost, 
      uniqueUsers, 
      monthlyCostPerUser: costPerUser, 
      dailyCostPerUser,
      logsCount: logs.length 
    }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
run();
