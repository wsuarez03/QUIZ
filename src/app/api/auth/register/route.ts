import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';

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

    // If Firebase Admin is not configured, allow registration in dev mode
    if (!isConfigured || !adminDbInstance) {
      const mockUserId = 'user_' + Date.now();
      console.log(
        '✓ User registered in development mode (mock):', email, mockUserId
      );
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
