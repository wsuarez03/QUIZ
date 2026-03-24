import { NextRequest, NextResponse } from 'next/server';
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';
import { mockQuizzes, mockQuestions } from '@/lib/mockData';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
// server-side operations use adminDb to bypass security rules

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await params;

    // If Firebase Admin is not configured, use mock data
    if (!isConfigured) {
      const quiz = mockQuizzes.find((q) => q.id === quizId);
      if (!quiz) {
        return NextResponse.json(
          { message: 'Quiz not found' },
          { status: 404 }
        );
      }
      // Adjuntar preguntas desde mockQuestions (type assertion para evitar error TS)
      const questions = (mockQuestions as Record<string, any[]>)[quizId] || [];
      return NextResponse.json({ ...quiz, questions }, { status: 200 });
    }

    // adminDb is used on server to bypass security rules
    const quizSnapshot = await adminDbInstance
      .collection('quizzes')
      .doc(quizId)
      .get();

    if (!quizSnapshot.exists) {
      // fallback a mock para ambientes mixtos (UI con mocks + APIs reales)
      const mockQuiz = mockQuizzes.find((q) => q.id === quizId);
      if (!mockQuiz) {
        return NextResponse.json(
          { message: 'Quiz not found' },
          { status: 404 }
        );
      }

      const mockQuestionList = (mockQuestions as Record<string, any[]>)[quizId] || [];
      return NextResponse.json(
        {
          ...mockQuiz,
          questions: mockQuestionList,
        },
        { status: 200 }
      );
    }

    const quizData = quizSnapshot.data();

    // Fetch questions for this quiz.
    // Some setups store questions inside the quiz document (quizData.questions),
    // while newer versions store them in a subcollection.
    let questions: any[] = Array.isArray(quizData?.questions) ? quizData.questions : [];

    if (!questions.length) {
      try {
        const questionsSnapshot = await adminDbInstance
          .collection('quizzes')
          .doc(quizId)
          .collection('questions')
          .get();

        questions = questionsSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.log('Note: Could not fetch questions from subcollection:', error);
      }
    }

    return NextResponse.json(
      {
        id: quizId,
        ...quizData,
        questions: questions,
        createdAt: quizData.createdAt?.toDate?.() || new Date(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
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

    if (!isConfigured) {
      return NextResponse.json(
        { message: 'Editar quizzes mock no esta habilitado' },
        { status: 403 }
      );
    }

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
  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
