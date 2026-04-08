import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { adminDbInstance, isConfigured } from "@/lib/firebaseAdmin";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

let preferAdminForSavedResults = Boolean(isConfigured && adminDbInstance);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let data: any[] = [];
    const ownerId = String(session.user.id || '');
    const ownerEmail = String(session.user.email || '');

    let canUseAdmin = Boolean(preferAdminForSavedResults && adminDbInstance);

    if (canUseAdmin && adminDbInstance) {
      try {
        const byOwnerId = await adminDbInstance
          .collection("saved_results")
          .where("ownerId", "==", ownerId)
          .get();

        let byOwnerEmail = { docs: [] as any[] };
        if (ownerEmail) {
          byOwnerEmail = await adminDbInstance
            .collection("saved_results")
            .where("ownerEmail", "==", ownerEmail)
            .get() as any;
        }

        const mergedDocs = [...byOwnerId.docs, ...byOwnerEmail.docs];
        const dedup = new Map<string, any>();

        mergedDocs.forEach((d: any) => {
          dedup.set(d.id, {
            id: d.id,
            ...d.data()
          });
        });

        data = Array.from(dedup.values());
      } catch (adminErr) {
        canUseAdmin = false;
        preferAdminForSavedResults = false;
        console.error("Admin saved-results read failed, using client fallback:", adminErr);
      }
    }

    if (!canUseAdmin) {
      const byOwnerIdQ = query(
        collection(db, "saved_results"),
        where("ownerId", "==", ownerId)
      );

      const snaps = [await getDocs(byOwnerIdQ)];

      if (ownerEmail) {
        const byOwnerEmailQ = query(
          collection(db, "saved_results"),
          where("ownerEmail", "==", ownerEmail)
        );
        snaps.push(await getDocs(byOwnerEmailQ));
      }

      const dedup = new Map<string, any>();

      snaps.forEach((snap) => {
        snap.docs.forEach((d) => {
          dedup.set(d.id, {
            id: d.id,
            ...d.data()
          });
        });
      });

      data = Array.from(dedup.values());
    }

    data.sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error loading saved results:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
