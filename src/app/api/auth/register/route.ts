import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';

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

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isConfigured || !adminDbInstance) {
      const firebaseApiKey = normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

      // In production, never fake a successful registration.
      if (!firebaseApiKey && process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { message: 'Server misconfiguration: Firebase Auth is not configured' },
          { status: 500 }
        );
      }

      // Use Firebase Auth REST API when Admin SDK is unavailable.
      if (firebaseApiKey) {
        const signUpResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true,
            }),
          }
        );

        const signUpData = await signUpResponse.json();

        if (!signUpResponse.ok || signUpData.error) {
          const code = signUpData?.error?.message;
          if (code === 'EMAIL_EXISTS') {
            return NextResponse.json(
              { message: 'Email already registered' },
              { status: 400 }
            );
          }

          if (code === 'WEAK_PASSWORD : Password should be at least 6 characters' || code === 'WEAK_PASSWORD') {
            return NextResponse.json(
              { message: 'Password must be at least 6 characters' },
              { status: 400 }
            );
          }

          return NextResponse.json(
            { message: code || 'Unable to create user' },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { message: 'User created successfully', userId: signUpData.localId },
          { status: 201 }
        );
      }

      // Local development fallback only.
      const mockUserId = 'user_' + Date.now();
      console.log('✓ User registered in development mode (mock):', email, mockUserId);
      return NextResponse.json(
        { message: 'User created successfully (development mode)', userId: mockUserId },
        { status: 201 }
      );
    }

    try {
      // Create user in Firebase Authentication
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name,
      });

      // Save user profile in Firestore
      await adminDbInstance.collection('users').doc(userRecord.uid).set({
        id: userRecord.uid,
        name,
        email,
        createdAt: new Date(),
        avatar: null,
      });

      console.log('✓ User created successfully in Firebase Auth:', email, userRecord.uid);

      return NextResponse.json(
        { message: 'User created successfully', userId: userRecord.uid },
        { status: 201 }
      );
    } catch (firebaseError: any) {
      console.error('Firebase Auth error:', firebaseError);

      if (firebaseError.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { message: 'Email already registered' },
          { status: 400 }
        );
      }

      if (firebaseError.code === 'auth/invalid-password') {
        return NextResponse.json(
          { message: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: 'Unable to create user' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
