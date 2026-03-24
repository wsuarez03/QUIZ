// Debug script: print questions of a quiz from Firestore subcollection
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

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
});

const quizId = process.argv[2];
if (!quizId) {
  console.error('Usage: node debugQuizQuestions.js <quizId>');
  process.exit(1);
}

(async () => {
  try {
    const db = admin.firestore();
    const snap = await db.collection('quizzes').doc(quizId).collection('questions').get();
    console.log('Found', snap.size, 'questions in subcollection for quiz', quizId);
    snap.forEach((doc) => {
      console.log('Q', doc.id, JSON.stringify(doc.data(), null, 2));
    });
  } catch (e) {
    console.error('Error reading questions:', e);
  }
})();
