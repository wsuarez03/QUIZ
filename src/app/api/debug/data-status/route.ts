// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { adminDbInstance, isConfigured } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = String(session.user.id || '');
    const userEmail = String(session.user.email || '');

    const status = {
      env: process.env.NODE_ENV || 'unknown',
      adminConfigured: Boolean(isConfigured && adminDbInstance),
      user: {
        id: userId,
        email: userEmail,
      },
      counts: {
        myQuizzes: 0,
        publicQuizzes: 0,
        savedResultsById: 0,
        savedResultsByEmail: 0,
      },
      samples: {
        myQuizzes: [] as Array<{ id: string; title: string; createdBy?: string; createdByEmail?: string }> ,
        savedResults: [] as Array<{ id: string; quizTitle?: string; ownerId?: string; ownerEmail?: string }>,
      },
    };

    if (!adminDbInstance) {
      return NextResponse.json(status, { status: 200 });
    }

    const quizzesSnap = await adminDbInstance.collection('quizzes').get();
    const allQuizzes = quizzesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const myQuizzes = allQuizzes.filter((q: any) => {
      const candidates = [q.createdBy, q.createdByEmail, q.ownerId, q.ownerEmail]
        .map((v: any) => String(v || '').toLowerCase())
        .filter(Boolean);
      return candidates.includes(userId.toLowerCase()) || candidates.includes(userEmail.toLowerCase());
    });

    const publicQuizzes = allQuizzes.filter((q: any) => {
      if (q.isPublic === true || q.isPublic === 'true') return true;
      return String(q.visibility || '').toLowerCase() === 'public';
    });

    const savedById = userId
      ? await adminDbInstance.collection('saved_results').where('ownerId', '==', userId).get()
      : { docs: [] };

    const savedByEmail = userEmail
      ? await adminDbInstance.collection('saved_results').where('ownerEmail', '==', userEmail).get()
      : { docs: [] };

    const mergedSaved = new Map<string, any>();
    [...(savedById.docs || []), ...(savedByEmail.docs || [])].forEach((d: any) => {
      mergedSaved.set(d.id, { id: d.id, ...d.data() });
    });

    status.counts.myQuizzes = myQuizzes.length;
    status.counts.publicQuizzes = publicQuizzes.length;
    status.counts.savedResultsById = (savedById.docs || []).length;
    status.counts.savedResultsByEmail = (savedByEmail.docs || []).length;

    status.samples.myQuizzes = myQuizzes.slice(0, 5).map((q: any) => ({
      id: String(q.id),
      title: String(q.title || ''),
      createdBy: q.createdBy ? String(q.createdBy) : undefined,
      createdByEmail: q.createdByEmail ? String(q.createdByEmail) : undefined,
    }));

    status.samples.savedResults = Array.from(mergedSaved.values()).slice(0, 5).map((r: any) => ({
      id: String(r.id),
      quizTitle: r.quizTitle ? String(r.quizTitle) : undefined,
      ownerId: r.ownerId ? String(r.ownerId) : undefined,
      ownerEmail: r.ownerEmail ? String(r.ownerEmail) : undefined,
    }));

    return NextResponse.json(status, { status: 200 });
  } catch (error: any) {
    console.error('debug data-status error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}
