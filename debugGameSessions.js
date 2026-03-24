// Debug script: list some game_sessions documents from Firestore
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (m) {
      let [, key, val] = m;
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const admin = require('firebase-admin');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

(async () => {
  try {
    const db = admin.firestore();

    const filterCode = process.argv[2];
    let query = db.collection('game_sessions');

    if (filterCode) {
      query = query.where('code', '==', filterCode);
    }

    const snap = await query.limit(10).get();

    console.log('Found', snap.size, 'session(s)');
    if (snap.empty) {
      console.log('No sessions found for code:', filterCode || '(any)');
      return;
    }

    snap.forEach((doc) => {
      console.log('SESSION', doc.id, JSON.stringify(doc.data(), null, 2));
    });
  } catch (e) {
    console.error('Error reading game_sessions:', e);
  }
})();
