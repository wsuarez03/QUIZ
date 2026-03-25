import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { adminDbInstance, isConfigured } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

let preferAdminForResults = Boolean(isConfigured && adminDbInstance);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId requerido" }, { status: 400 });
    }

    let sessionData: any = null;
    let quizData: any = null;
    let players: Array<{ id: string; data: any }> = [];

    let canUseAdmin = Boolean(preferAdminForResults && adminDbInstance);

    if (canUseAdmin && adminDbInstance) {
      try {
        const sessionSnap = await adminDbInstance.collection("game_sessions").doc(sessionId).get();

        if (!sessionSnap.exists) {
          return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
        }

        sessionData = sessionSnap.data() || {};

        if (sessionData.quizId) {
          const quizSnap = await adminDbInstance.collection("quizzes").doc(sessionData.quizId).get();
          quizData = quizSnap.exists ? quizSnap.data() : null;
        }

        const playersSnap = await adminDbInstance
          .collection("game_sessions")
          .doc(sessionId)
          .collection("players")
          .get();

        players = playersSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));
      } catch (adminErr) {
        canUseAdmin = false;
        preferAdminForResults = false;
        console.error("Admin save-results read failed, using client fallback:", adminErr);
      }
    }

    if (!canUseAdmin) {
      const sessionRef = doc(db, "game_sessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
      }

      sessionData = sessionSnap.data();

      if (sessionData.quizId) {
        const quizRef = doc(db, "quizzes", sessionData.quizId);
        const quizSnap = await getDoc(quizRef);
        quizData = quizSnap.exists() ? quizSnap.data() : null;
      }

      const playersSnap = await getDocs(collection(db, "game_sessions", sessionId, "players"));
      players = playersSnap.docs.map((d) => ({ id: d.id, data: d.data() }));
    }

    const sortedPlayers = [...players].sort(
      (a, b) => Number(b.data?.score || 0) - Number(a.data?.score || 0)
    );

    const totalQuestions = Number(quizData?.questions?.length || 0);

    const results = sortedPlayers.map((playerDoc, index) => {
      const p = playerDoc.data || {};
      const correctAnswers = Number(p.correctAnswers || 0);

      return {
        rank: index + 1,
        playerId: playerDoc.id,
        playerName: p.name || "Jugador",
        score: Number(p.score || 0),
        correctAnswers,
        accuracy: totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0
      };
    });

    const docId = `${session.user.id}_${sessionId}`;

    const payload = {
      ownerId: session.user.id,
      ownerEmail: session.user.email || "",
      ownerName: session.user.name || "",
      sessionId,
      sessionCode: sessionData?.code || "",
      sessionStatus: sessionData?.status || "finished",
      quizId: sessionData?.quizId || "",
      quizTitle: quizData?.title || "Quiz",
      totalQuestions,
      results,
      savedAt: Date.now()
    };

    if (canUseAdmin && adminDbInstance) {
      try {
        await adminDbInstance.collection("saved_results").doc(docId).set(payload);
      } catch (adminWriteErr) {
        preferAdminForResults = false;
        console.error("Admin save-results write failed, using client fallback:", adminWriteErr);
        await setDoc(doc(db, "saved_results", docId), payload);
      }
    } else {
      await setDoc(doc(db, "saved_results", docId), payload);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving results:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
