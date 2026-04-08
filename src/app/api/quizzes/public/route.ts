import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';
import { listMockQuizzes } from '@/lib/mockStore';
// server-side read
import { collection, query, where, getDocs } from 'firebase/firestore';

function isQuizPublic(quiz: any): boolean {
  if (quiz?.isPublic === true || quiz?.isPublic === 'true') return true;
  return String(quiz?.visibility || '').toLowerCase() === 'public';
}

export async function GET(request: NextRequest) {
  try {
    // Use mock data only in local development.
    if (!isConfigured && process.env.NODE_ENV !== 'production') {
      const publicQuizzes = listMockQuizzes().filter((quiz) => quiz.isPublic);
      return NextResponse.json(publicQuizzes, { status: 200 });
    }

    if (!adminDbInstance && process.env.NODE_ENV !== 'production') {
      console.warn('Firebase Admin is not available, using client SDK fallback for public quizzes');
      try {
        const clientSnap = await getDocs(collection(db, 'quizzes'));

        const clientQuizzes = clientSnap.docs.map((doc) => {
          const data: any = doc.data();
          const questionCount = Array.isArray(data.questions)
            ? data.questions.length
            : Number(data.totalQuestions || data.settings?.questionsPerGame || 0);

          return {
            id: doc.id,
            ...data,
            questions: data.questions ?? [],
            totalQuestions: questionCount,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          };
        }).filter((quiz: any) => isQuizPublic(quiz));

        return NextResponse.json(clientQuizzes, { status: 200 });
      } catch (fallbackError) {
        console.error('Client SDK fallback failed for public quizzes:', fallbackError);
        return NextResponse.json([], { status: 200 });
      }
    } else if (!adminDbInstance) {
      console.error('public quizzes: Admin SDK unavailable in production, returning empty array');
      return NextResponse.json([], { status: 200 });
    }

    let quizzes;
    try {
      const querySnapshot = await adminDbInstance
        .collection('quizzes')
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
      }).filter((quiz: any) => isQuizPublic(quiz));
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
