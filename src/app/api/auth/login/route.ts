import { NextRequest, NextResponse } from 'next/server';
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';
import admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password required' },
        { status: 400 }
      );
    }

    // If Firebase Admin is not configured, use mock login
    if (!isConfigured || !adminDbInstance) {
      console.log('✓ Login in development mode (mock):', email);
      return NextResponse.json(
        {
          user: {
            id: 'dev_user',
            email,
            name: 'Dev User',
          },
        },
        { status: 200 }
      );
    }

    try {
      // Get user by email using Firebase Admin
      const userRecord = await admin.auth().getUserByEmail(email);

      // Get user profile from Firestore
      const userSnapshot = await adminDbInstance
        .collection('users')
        .doc(userRecord.uid)
        .get();

      if (!userSnapshot.exists) {
        return NextResponse.json(
          { message: 'User profile not found' },
          { status: 401 }
        );
      }

      const userData = userSnapshot.data();

      // Create custom token for session
      const customToken = await admin.auth().createCustomToken(userRecord.uid);

      console.log('✓ User logged in successfully:', email);

      return NextResponse.json(
        {
          user: {
            id: userRecord.uid,
            email: userData.email,
            name: userData.name,
            avatar: userData.avatar || null,
          },
          token: customToken,
        },
        { status: 200 }
      );
    } catch (firebaseError: any) {
      console.error('Firebase Auth error:', firebaseError);

      if (firebaseError.code === 'auth/user-not-found') {
        return NextResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { message: 'Unable to authenticate user' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
