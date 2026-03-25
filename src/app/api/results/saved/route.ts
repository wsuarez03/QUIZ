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

    let canUseAdmin = Boolean(preferAdminForSavedResults && adminDbInstance);

    if (canUseAdmin && adminDbInstance) {
      try {
        const snap = await adminDbInstance
          .collection("saved_results")
          .where("ownerId", "==", session.user.id)
          .get();

        data = snap.docs.map((d: any) => ({
          id: d.id,
          ...d.data()
        }));
      } catch (adminErr) {
        canUseAdmin = false;
        preferAdminForSavedResults = false;
        console.error("Admin saved-results read failed, using client fallback:", adminErr);
      }
    }

    if (!canUseAdmin) {
      const savedQ = query(
        collection(db, "saved_results"),
        where("ownerId", "==", session.user.id)
      );

      const snap = await getDocs(savedQ);

      data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
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
