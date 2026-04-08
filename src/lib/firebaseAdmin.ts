import admin from 'firebase-admin';
import { initializeFirestore } from 'firebase-admin/firestore';
import { createPrivateKey } from 'crypto';

// The service account credentials should be provided via environment variables
// (e.g. in .env.local or your hosting platform). Example:
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

let adminDb: any = null;
let isConfigured = false;
let adminInitError = '';

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

function normalizePrivateKey(value?: string) {
  const raw = normalizeEnv(value);
  if (!raw) return '';
  return raw.replace(/\r/g, '').replace(/\\n/g, '\n');
}

function buildPrivateKeyCandidates(rawKey?: string) {
  const candidates = new Set<string>();
  const normalizedRaw = normalizeEnv(rawKey);
  const maybeB64 = normalizeEnv(process.env.FIREBASE_PRIVATE_KEY_BASE64);

  if (normalizedRaw) {
    candidates.add(normalizedRaw);
    candidates.add(normalizedRaw.replace(/\\n/g, '\n'));
    candidates.add(normalizedRaw.replace(/\\\\n/g, '\n'));
  }

  if (maybeB64) {
    try {
      const decoded = Buffer.from(maybeB64, 'base64').toString('utf8');
      candidates.add(decoded);
      candidates.add(decoded.replace(/\\n/g, '\n'));
    } catch {
      // Ignore invalid base64 and continue with other candidates.
    }
  }

  return Array.from(candidates)
    .map((k) => k.replace(/\r/g, '').trim())
    .filter((k) => k.includes('BEGIN PRIVATE KEY') && k.includes('END PRIVATE KEY'));
}

function isValidPrivateKey(key: string) {
  try {
    createPrivateKey({ key, format: 'pem' });
    return true;
  } catch {
    return false;
  }
}

// Allow explicit disable via env, but do not disable automatically on Vercel.
const shouldUseAdminSDK = normalizeEnv(process.env.FIREBASE_ADMIN_DISABLED) !== 'true';

function parseServiceAccountFromJsonEnv() {
  const rawJson =
    normalizeEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
    normalizeEnv(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) ||
    normalizeEnv(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const rawJsonB64 =
    normalizeEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64) ||
    normalizeEnv(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64);

  if (!rawJson && !rawJsonB64) return null;

  try {
    const decodedJson = rawJsonB64
      ? Buffer.from(rawJsonB64, 'base64').toString('utf8')
      : rawJson;
    const parsed = JSON.parse(decodedJson);
    const projectId = normalizeEnv(parsed?.project_id || parsed?.projectId);
    const clientEmail = normalizeEnv(parsed?.client_email || parsed?.clientEmail);
    const privateKeyRaw = normalizeEnv(parsed?.private_key || parsed?.privateKey);

    if (!projectId || !clientEmail || !privateKeyRaw) {
      return null;
    }

    return {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKeyRaw),
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
  const privateKeyRaw = jsonCreds?.privateKey || normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  const keyCandidates = buildPrivateKeyCandidates(privateKeyRaw);

  const validKeyCandidates = keyCandidates.filter((k) => isValidPrivateKey(k));

  if (projectId && clientEmail && validKeyCandidates.length > 0) {
    let initialized = false;
    let lastError: any = null;

    for (const privateKeyCandidate of validKeyCandidates) {
      try {
        if (admin.apps.length) {
          break;
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: privateKeyCandidate,
          }),
        });
        adminDb = initializeFirestore(admin.app(), { preferRest: true });
        isConfigured = true;
        adminInitError = '';
        initialized = true;
        console.log('✓ Firebase Admin SDK initialized successfully');
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!initialized) {
      adminInitError = String((lastError as any)?.message || lastError || 'unknown admin init error');
      console.warn(
        '⚠ Firebase Admin SDK initialization failed. Using mock data for development.'
      );
      console.warn(lastError);
    }
  } else {
    adminInitError = 'Missing Firebase Admin env vars or invalid private key format (PEM parse failed)';
    console.log(
      '📝 Firebase Admin SDK not configured. Using mock data for development.'
    );
  }
} else if (!shouldUseAdminSDK) {
  console.log('⏭ Firebase Admin SDK disabled via FIREBASE_ADMIN_DISABLED=true');
}

export { isConfigured };
export const adminDbInstance = adminDb;
export { adminInitError };
export default admin;