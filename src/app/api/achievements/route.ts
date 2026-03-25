import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const ownerId = session.user.id || session.user.email;
    if (!ownerId) {
      return NextResponse.json([], { status: 200 });
    }

    const achievementsRef = collection(db, 'user_achievements');
    const q = query(achievementsRef, where('userId', '==', ownerId));
    const querySnapshot = await getDocs(q);

    const achievements = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      unlockedAt: doc.data().unlockedAt?.toDate?.() || new Date(),
    }));

    return NextResponse.json(achievements, { status: 200 });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
