import { NextRequest, NextResponse } from 'next/server';
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getMockQuizById, updateMockQuiz } from '@/lib/mockStore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;

    // 1. Try Admin SDK
    if (adminDbInstance) {
      try {
        const quizSnapshot = await adminDbInstance.collection('quizzes').doc(quizId).get();
        if (quizSnapshot.exists) {
          const quizData = quizSnapshot.data() as any;
          let questions: any[] = Array.isArray(quizData?.questions) ? quizData.questions : [];
          if (!questions.length) {
            try {
              const sub = await adminDbInstance
                .collection('quizzes').doc(quizId).collection('questions').get();
              questions = sub.docs.map((d: any) => ({ id: d.id, ...d.data() }));
            } catch { /* no subcollection */ }
          }
          return NextResponse.json(
            { id: quizId, ...quizData, questions, createdAt: quizData.createdAt?.toDate?.() || new Date() },
            { status: 200 }
          );
        }
      } catch (adminErr) {
        console.warn('Admin SDK failed fetching quiz, trying fallback:', adminErr);
      }
    }

    // 2. Try client SDK
    try {
      const snap = await getDoc(doc(db, 'quizzes', quizId));
      if (snap.exists()) {
        const data = snap.data() as any;
        const questions: any[] = Array.isArray(data.questions) ? data.questions : [];
        return NextResponse.json(
          { id: quizId, ...data, questions, createdAt: data.createdAt?.toDate?.() || new Date() },
          { status: 200 }
        );
      }
    } catch (clientErr) {
      console.warn('Client SDK failed fetching quiz:', clientErr);
    }

    // 3. Mock fallback (local dev only)
    if (!isConfigured) {
      const quiz = getMockQuizById(quizId);
      if (quiz) {
        return NextResponse.json(quiz, { status: 200 });
      }
    }

    return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });

  } catch (error) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // If Firebase Admin is not configured, mock data cannot be deleted
    if (!isConfigured) {
      return NextResponse.json(
        { message: 'Cannot delete mock data in development mode' },
        { status: 403 }
      );
    }

    const quizSnapshot = await adminDbInstance
      .collection('quizzes')
      .doc(quizId)
      .get();

    if (!quizSnapshot.exists) {
      return NextResponse.json(
        { message: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quizData = quizSnapshot.data();

    // Check if user is the creator
    const isOwner =
      quizData.createdBy === session.user.id ||
      quizData.createdBy === session.user.email;

    if (!isOwner) {
      return NextResponse.json(
        { message: 'Not authorized to delete this quiz' },
        { status: 403 }
      );
    }

    await adminDbInstance.collection('quizzes').doc(quizId).delete();

    return NextResponse.json(
      { message: 'Quiz deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const isPublic = Boolean(body?.isPublic);
    const questions = Array.isArray(body?.questions) ? body.questions : [];
    const settings = body?.settings || {};

    if (!title || !questions.length) {
      return NextResponse.json(
        { message: 'Title and questions are required' },
        { status: 400 }
      );
    }

    const questionsPerGame = Math.min(
      Math.max(1, Number(settings?.questionsPerGame || questions.length)),
      questions.length
    );

    if (!isConfigured && process.env.NODE_ENV !== 'production') {
      const existing = getMockQuizById(quizId);
      if (!existing) {
        return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
      }

      const isOwner =
        existing.createdBy === session.user.id ||
        existing.createdBy === session.user.email;

      if (!isOwner) {
        return NextResponse.json(
          { message: 'Not authorized to edit this quiz' },
          { status: 403 }
        );
      }

      updateMockQuiz(quizId, {
        title,
        description,
        isPublic,
        visibility: isPublic ? 'public' : 'private',
        questions,
        settings: {
          ...existing.settings,
          ...settings,
          questionsPerGame,
        },
      });

      return NextResponse.json({ message: 'Quiz updated successfully (mock)' }, { status: 200 });
    }

    // Prefer Admin SDK when available.
    if (isConfigured && adminDbInstance) {
      try {
        const quizRef = adminDbInstance.collection('quizzes').doc(quizId);
        const quizSnapshot = await quizRef.get();

        if (!quizSnapshot.exists) {
          return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
        }

        const existing = quizSnapshot.data() || {};
        const isOwner =
          existing.createdBy === session.user.id ||
          existing.createdBy === session.user.email;

        if (!isOwner) {
          return NextResponse.json(
            { message: 'Not authorized to edit this quiz' },
            { status: 403 }
          );
        }

        await quizRef.update({
          title,
          description,
          isPublic,
          visibility: isPublic ? 'public' : 'private',
          questions,
          settings: {
            ...existing.settings,
            ...settings,
            questionsPerGame,
          },
          updatedAt: new Date(),
        });

        return NextResponse.json({ message: 'Quiz updated successfully' }, { status: 200 });
      } catch (adminErr) {
        console.warn('Admin SDK failed updating quiz, trying client fallback:', adminErr);
      }
    }

    // Client SDK fallback for environments where Admin SDK is unavailable.
    try {
      const quizRef = doc(db, 'quizzes', quizId);
      const quizSnapshot = await getDoc(quizRef);

      if (!quizSnapshot.exists()) {
        return NextResponse.json({ message: 'Quiz not found' }, { status: 404 });
      }

      const existing = quizSnapshot.data() || {};
      const isOwner =
        existing.createdBy === session.user.id ||
        existing.createdBy === session.user.email;

      if (!isOwner) {
        return NextResponse.json(
          { message: 'Not authorized to edit this quiz' },
          { status: 403 }
        );
      }

      await updateDoc(quizRef, {
        title,
        description,
        isPublic,
        visibility: isPublic ? 'public' : 'private',
        questions,
        settings: {
          ...existing.settings,
          ...settings,
          questionsPerGame,
        },
        updatedAt: new Date(),
      });

      return NextResponse.json({ message: 'Quiz updated successfully' }, { status: 200 });
    } catch (clientErr: any) {
      const msg = String(clientErr?.message || clientErr || '');
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        return NextResponse.json(
          { message: 'No autorizado para editar este quiz en Firestore' },
          { status: 403 }
        );
      }
      throw clientErr;
    }
  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
