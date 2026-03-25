import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';
import { mockQuizzes } from '@/lib/mockData';
// server-side read
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Use mock data only in local development.
    if (!isConfigured && process.env.NODE_ENV !== 'production') {
      const publicQuizzes = mockQuizzes.filter((quiz) => quiz.isPublic);
      return NextResponse.json(publicQuizzes, { status: 200 });
    }

    if (!adminDbInstance) {
      console.error('Firebase Admin is not available in production for /api/quizzes/public');
      return NextResponse.json([], { status: 200 });
    }

    let quizzes;
    try {
      const querySnapshot = await adminDbInstance
        .collection('quizzes')
        .where('isPublic', '==', true)
        .get();

      quizzes = querySnapshot.docs.map((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const questionCount = Array.isArray(data.questions)
          ? data.questions.length
          : Number(data.totalQuestions || data.settings?.questionsPerGame || 0);

        return {
          id: doc.id,
          ...data,
          // ensure questions array exists even if Firestore document is missing it
          questions: data.questions ?? [],
          totalQuestions: questionCount,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });
    } catch (err) {
      console.error('Firestore public query failed:', err);
      quizzes = [];
    }

    return NextResponse.json(quizzes, { status: 200 });
  } catch (error) {
    console.error('Error fetching public quizzes:', error);
    // Retornar array vacío en lugar de error para evitar crashes en el frontend
    return NextResponse.json([], { status: 200 });
  }
}
