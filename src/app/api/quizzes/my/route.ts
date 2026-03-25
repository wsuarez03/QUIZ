import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';
import { mockQuizzes } from '@/lib/mockData';
// reading via admin to bypass security rules (server-side)
import { collection, query, where, getDocs } from 'firebase/firestore';
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
      const userQuizzes = mockQuizzes.filter((quiz) =>
        quiz.createdBy === ownerId || quiz.createdBy === ownerEmail
      );
      return NextResponse.json(userQuizzes, { status: 200 });
    }

    if (!adminDbInstance) {
      console.error('Firebase Admin is not available in production for /api/quizzes/my');
      return NextResponse.json([], { status: 200 });
    }

    // use admin SDK for secure server-side access
    let quizzes: any[] = [];

    try {
      const snapshots = await Promise.all([
        ownerId
          ? adminDbInstance.collection('quizzes').where('createdBy', '==', ownerId).get()
          : Promise.resolve(null),
        ownerEmail
          ? adminDbInstance.collection('quizzes').where('createdBy', '==', ownerEmail).get()
          : Promise.resolve(null),
      ]);

      const merged = new Map<string, QueryDocumentSnapshot<DocumentData>>();

      for (const snap of snapshots) {
        if (!snap) continue;
        for (const d of snap.docs) {
          merged.set(d.id, d);
        }
      }

      quizzes = Array.from(merged.values()).map((doc: QueryDocumentSnapshot<DocumentData>) => {
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
      });

    } catch (err) {
      console.error('Error querying user quizzes from Firestore:', err);
      // leave quizzes as empty array to avoid crashing UI
    }

    return NextResponse.json(quizzes, { status: 200 });

  } catch (error) {
    console.error('Error fetching quizzes:', error);

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}