import admin from 'firebase-admin';
import { readFileSync } from 'fs';

function parseEnv(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const env = parseEnv(readFileSync('.env.local', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: (env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const snap = await db.collection('quizzes').get();

console.log(`TOTAL_QUIZZES=${snap.size}`);
for (const doc of snap.docs) {
  const data = doc.data();
  const subQuestions = await db.collection('quizzes').doc(doc.id).collection('questions').get();
  const embeddedCount = Array.isArray(data.questions) ? data.questions.length : 0;
  const totalQuestions = Number(data.totalQuestions || 0);

  console.log(
    [
      `id=${doc.id}`,
      `title=${String(data.title || '').replace(/\|/g, '/')}`,
      `createdBy=${data.createdBy || ''}`,
      `isPublic=${Boolean(data.isPublic)}`,
      `embeddedQuestions=${embeddedCount}`,
      `subcollectionQuestions=${subQuestions.size}`,
      `totalQuestionsField=${totalQuestions}`,
    ].join(' | ')
  );
}

for (const email of [
  'tecnicodeservicios@valserindustriales.com',
  'admin@valserindustriales.com',
]) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log(`AUTH_USER_OK | email=${email} | uid=${user.uid}`);
  } catch (error) {
    console.log(`AUTH_USER_MISSING | email=${email}`);
  }
}
