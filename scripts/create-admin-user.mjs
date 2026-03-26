import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function normalizePrivateKey(value = '') {
  return value.replace(/\\n/g, '\n');
}

async function upsertAdminUser({ email, password, name }) {
  const envPath = path.resolve('.', '.env.local');
  const env = parseEnvFile(envPath);

  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in .env.local');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    userRecord = await admin.auth().updateUser(userRecord.uid, {
      password,
      displayName: name,
    });
    console.log(`Updated existing user: ${email}`);
  } catch (err) {
    if (err?.code === 'auth/user-not-found') {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name,
      });
      console.log(`Created new user: ${email}`);
    } else {
      throw err;
    }
  }

  const db = admin.firestore();
  await db.collection('users').doc(userRecord.uid).set(
    {
      id: userRecord.uid,
      email,
      name,
      role: 'admin',
      avatar: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    },
    { merge: true }
  );

  console.log('Admin profile upserted in Firestore users collection.');
  console.log(`UID: ${userRecord.uid}`);
}

const email = process.argv[2] || 'admin@valserindustriales.com';
const password = process.argv[3] || 'Admin12345!';
const name = process.argv[4] || 'Administrador';

upsertAdminUser({ email, password, name })
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  });
