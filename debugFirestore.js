// manually load env vars from .env.local (no dotenv installed)
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (m) {
      let [, key, val] = m;
      // remove optional surrounding quotes
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
let privateKey = process.env.FIREBASE_PRIVATE_KEY;if (privateKey) privateKey = privateKey.replace(/\\n/g, '\n');
if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({ credential: admin.credential.cert({projectId, clientEmail, privateKey}) });
  } else {
    console.error('missing env vars');
    process.exit(1);
  }
}
(async () => {
  try {
    const db = admin.firestore();
    
    // Crear quiz de prueba
    const quizData = {
      title: "Quiz de Prueba",
      description: "Un quiz simple para testing",
      questions: [
        {
          question: "¿Cuál es la capital de Francia?",
          options: ["Londres", "París", "Madrid", "Roma"],
          correctAnswer: 1
        }
      ],
      createdBy: "user3", // ID del usuario test
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('quizzes').add(quizData);
    console.log('Quiz creado con ID:', docRef.id);
    
    // Leer quizzes existentes
    const snap = await db.collection('quizzes').get();
    snap.forEach(doc => {
      console.log('DOC', doc.id, JSON.stringify(doc.data()));
    });
  } catch (e) {
    console.error('firestore error', e);
  }
})();