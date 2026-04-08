import admin from 'firebase-admin';

// The service account credentials should be provided via environment variables
// (e.g. in .env.local or your hosting platform). Example:
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

let adminDb: any = null;
let isConfigured = false;

function normalizeEnv(value?: string) {
  if (!value) return '';
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// Allow explicit disable via env, but do not disable automatically on Vercel.
const shouldUseAdminSDK = normalizeEnv(process.env.FIREBASE_ADMIN_DISABLED) !== 'true';

function parseServiceAccountFromJsonEnv() {
  const rawJson =
    normalizeEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
    normalizeEnv(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) ||
    normalizeEnv(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  if (!rawJson) return null;

  try {
    const parsed = JSON.parse(rawJson);
    const projectId = normalizeEnv(parsed?.project_id || parsed?.projectId);
    const clientEmail = normalizeEnv(parsed?.client_email || parsed?.clientEmail);
    const privateKeyRaw = normalizeEnv(parsed?.private_key || parsed?.privateKey);

    if (!projectId || !clientEmail || !privateKeyRaw) {
      return null;
    }

    return {
      projectId,
      clientEmail,
      privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
    };
  } catch (error) {
    console.warn('Invalid FIREBASE_SERVICE_ACCOUNT_JSON/FIREBASE_SERVICE_ACCOUNT_KEY format');
    return null;
  }
}

if (!admin.apps.length && shouldUseAdminSDK) {
  const jsonCreds = parseServiceAccountFromJsonEnv();
  const projectId = jsonCreds?.projectId || normalizeEnv(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = jsonCreds?.clientEmail || normalizeEnv(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKeyRaw = jsonCreds?.privateKey || normalizeEnv(process.env.FIREBASE_PRIVATE_KEY);

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
      try {
        // Prefer REST on serverless environments to avoid gRPC transport issues.
        adminDb.settings({ preferRest: true });
      } catch {
        // Ignore if settings were already initialized.
      }
      isConfigured = true;
      console.log('✓ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.warn(
        '⚠ Firebase Admin SDK initialization failed. Using mock data for development.'
      );
      console.warn(error);
    }
  } else {
    console.log(
      '📝 Firebase Admin SDK not configured. Using mock data for development.'
    );
  }
} else if (!shouldUseAdminSDK) {
  console.log('⏭ Firebase Admin SDK disabled via FIREBASE_ADMIN_DISABLED=true');
}

export { isConfigured };
export const adminDbInstance = adminDb;
export default admin;