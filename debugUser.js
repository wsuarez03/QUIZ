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
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  } else {
    console.error('missing env vars');
    process.exit(1);
  }
}

(async () => {
  try {
    const db = admin.firestore();
    const snap = await db.collection('users').where('email', '==', 'test@example.com').get();
    console.log('size', snap.size);
    snap.forEach(d => console.log(d.id, d.data()));
  } catch (e) {
    console.error('firestore error', e);
  }
})();