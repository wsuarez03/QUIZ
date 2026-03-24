import admin from 'firebase-admin';

// The service account credentials should be provided via environment variables
// (e.g. in .env.local or your hosting platform). Example:
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

let adminDb: any = null;
let isConfigured = false;

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKeyRaw) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          // Private key may contain literal newlines, replace escaped ones
          privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
        }),
      });
      adminDb = admin.firestore();
      isConfigured = true;
      console.log('✓ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.warn(
        '⚠ Firebase Admin SDK initialization failed. Using mock data for development.'
      );
    }
  } else {
    console.log(
      '📝 Firebase Admin SDK not configured. Using mock data for development.'
    );
  }
}

export { isConfigured };
export const adminDbInstance = adminDb;
export default admin;