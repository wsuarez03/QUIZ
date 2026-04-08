import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { adminDbInstance } from '@/lib/firebaseAdmin';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const ownerId = String(session.user.id || '');
    const ownerEmail = String(session.user.email || '');

    if (!ownerId && !ownerEmail) {
      return NextResponse.json([], { status: 200 });
    }

    let achievements: any[] = [];

    if (adminDbInstance) {
      try {
        const docsById = ownerId
          ? await adminDbInstance.collection('user_achievements').where('userId', '==', ownerId).get()
          : null;

        const docsByEmail = ownerEmail
          ? await adminDbInstance.collection('user_achievements').where('userId', '==', ownerEmail).get()
          : null;

        const merged = new Map<string, any>();
        [...(docsById?.docs || []), ...(docsByEmail?.docs || [])].forEach((d: any) => {
          const data = d.data();
          merged.set(d.id, {
            id: d.id,
            ...data,
            unlockedAt: data.unlockedAt?.toDate?.() || new Date(),
          });
        });

        achievements = Array.from(merged.values());
        return NextResponse.json(achievements, { status: 200 });
      } catch (adminErr) {
        console.error('Admin achievements query failed, trying client fallback:', adminErr);
      }
    }

    try {
      const achievementsRef = collection(db, 'user_achievements');
      const byId = ownerId ? await getDocs(query(achievementsRef, where('userId', '==', ownerId))) : null;
      const byEmail = ownerEmail ? await getDocs(query(achievementsRef, where('userId', '==', ownerEmail))) : null;

      const merged = new Map<string, any>();
      [...(byId?.docs || []), ...(byEmail?.docs || [])].forEach((doc) => {
        const data = doc.data();
        merged.set(doc.id, {
          id: doc.id,
          ...data,
          unlockedAt: data.unlockedAt?.toDate?.() || new Date(),
        });
      });

      achievements = Array.from(merged.values());
    } catch (fallbackErr) {
      console.error('Client achievements fallback failed:', fallbackErr);
      achievements = [];
    }

    return NextResponse.json(achievements, { status: 200 });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json([], { status: 200 });
  }
}
