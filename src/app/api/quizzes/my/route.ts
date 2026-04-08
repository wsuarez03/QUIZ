import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';
import { listMockQuizzes } from '@/lib/mockStore';
// reading via admin to bypass security rules (server-side)
import { collection, query, where, getDocs } from 'firebase/firestore';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

function belongsToUser(quiz: any, ownerId: string, ownerEmail: string): boolean {
  const ownerIdLc = String(ownerId || '').toLowerCase();
  const ownerEmailLc = String(ownerEmail || '').toLowerCase();
  const candidates = [
    quiz?.createdBy,
    quiz?.createdByEmail,
    quiz?.ownerId,
    quiz?.ownerEmail,
  ].map((v: any) => String(v || '').toLowerCase()).filter(Boolean);

  return candidates.includes(ownerIdLc) || candidates.includes(ownerEmailLc);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const ownerId = session.user.id;
    const ownerEmail = session.user.email;

    if (!ownerId && !ownerEmail) {
      console.error('Session user identifiers are undefined');
      return NextResponse.json([], { status: 200 });
    }

    // Use mock data only in local development.
    if (!isConfigured && process.env.NODE_ENV !== 'production') {
      const userQuizzes = listMockQuizzes().filter((quiz) =>
        quiz.createdBy === ownerId || quiz.createdBy === ownerEmail
      );
      return NextResponse.json(userQuizzes, { status: 200 });
    }

    if (!adminDbInstance) {
      console.warn('Firebase Admin is not available, using client SDK fallback for my quizzes');

      try {
        const snap = await getDocs(collection(db, 'quizzes'));

        const quizzes = snap.docs.map((doc: any) => {
          const data = doc.data();
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
        }).filter((quiz: any) => {
          return belongsToUser(quiz, ownerId || '', ownerEmail || '');
        });

        return NextResponse.json(quizzes, { status: 200 });
      } catch (fallbackError) {
        console.error('Client SDK fallback failed for my quizzes:', fallbackError);
        return NextResponse.json([], { status: 200 });
      }
    }

    // use admin SDK for secure server-side access
    let quizzes: any[] = [];

    try {
      const allSnapshot = await adminDbInstance.collection('quizzes').get();

      quizzes = allSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
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
      }).filter((quiz: any) => {
        return belongsToUser(quiz, ownerId || '', ownerEmail || '');
      });

    } catch (err) {
      console.error('Error querying user quizzes from Firestore:', err);
      // leave quizzes as empty array to avoid crashing UI
    }

    return NextResponse.json(quizzes, { status: 200 });

  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json([], { status: 200 });
  }
}