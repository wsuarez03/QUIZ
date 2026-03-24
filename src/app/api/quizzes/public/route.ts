import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';
import { mockQuizzes } from '@/lib/mockData';
// server-side read
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // If Firebase Admin is not configured, use mock data
    if (!isConfigured) {
      const publicQuizzes = mockQuizzes.filter((quiz) => quiz.isPublic);
      return NextResponse.json(publicQuizzes, { status: 200 });
    }

    let quizzes;
    try {
      const querySnapshot = await adminDbInstance
        .collection('quizzes')
        .where('isPublic', '==', true)
        .get();

      quizzes = querySnapshot.docs.map((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // ensure questions array exists even if Firestore document is missing it
          questions: data.questions ?? [],
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });
    } catch (err) {
      console.error('Firestore public query failed, falling back to mocks:', err);
      // if the connection fails (e.g. certificate issues) still return mocks
      quizzes = mockQuizzes.filter((quiz) => quiz.isPublic);
    }

    return NextResponse.json(quizzes, { status: 200 });
  } catch (error) {
    console.error('Error fetching public quizzes:', error);
    // Retornar array vacío en lugar de error para evitar crashes en el frontend
    return NextResponse.json([], { status: 200 });
  }
}
