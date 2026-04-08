import { NextRequest, NextResponse } from "next/server";
import { adminDbInstance } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

let preferAdminForSessionById = Boolean(adminDbInstance);

function hasInclude(searchParams: URLSearchParams, value: string) {
  const raw = String(searchParams.get("include") || "");
  return raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .includes(value.toLowerCase());
}

async function readSession(sessionId: string) {
  if (preferAdminForSessionById && adminDbInstance) {
    try {
      const snap = await adminDbInstance.collection("game_sessions").doc(sessionId).get();
      if (!snap.exists) return null;
      return { id: snap.id, ...(snap.data() || {}) } as any;
    } catch (err) {
      preferAdminForSessionById = false;
      console.warn("Admin read session failed, using client fallback:", err);
    }
  }

  const snap = await getDoc(doc(db, "game_sessions", sessionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() || {}) } as any;
}

async function readPlayers(sessionId: string) {
  if (preferAdminForSessionById && adminDbInstance) {
    try {
      const snap = await adminDbInstance
        .collection("game_sessions")
        .doc(sessionId)
        .collection("players")
        .get();
      return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      preferAdminForSessionById = false;
      console.warn("Admin read players failed, using client fallback:", err);
    }
  }

  const snap = await getDocs(collection(db, "game_sessions", sessionId, "players"));
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
}

async function readQuizWithQuestions(quizId: string) {
  let quiz: any = null;

  if (preferAdminForSessionById && adminDbInstance) {
    try {
      const snap = await adminDbInstance.collection("quizzes").doc(quizId).get();
      if (snap.exists) quiz = { id: snap.id, ...(snap.data() || {}) };
      if (quiz && (!Array.isArray(quiz.questions) || !quiz.questions.length)) {
        const sub = await adminDbInstance
          .collection("quizzes")
          .doc(quizId)
          .collection("questions")
          .get();
        quiz.questions = sub.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      }
      if (quiz) return quiz;
    } catch (err) {
      preferAdminForSessionById = false;
      console.warn("Admin read quiz failed, using client fallback:", err);
    }
  }

  const snap = await getDoc(doc(db, "quizzes", quizId));
  if (!snap.exists()) return null;

  quiz = { id: snap.id, ...(snap.data() || {}) };
  if (!Array.isArray(quiz.questions) || !quiz.questions.length) {
    const sub = await getDocs(collection(db, "quizzes", quizId, "questions"));
    quiz.questions = sub.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  }

  return quiz;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const includePlayers = hasInclude(request.nextUrl.searchParams, "players");
    const includeQuiz = hasInclude(request.nextUrl.searchParams, "quiz");

    const session = await readSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
    }

    const payload: any = { session };

    if (includePlayers) {
      payload.players = await readPlayers(sessionId);
    }

    if (includeQuiz && session?.quizId) {
      payload.quiz = await readQuizWithQuestions(String(session.quizId));
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error reading session by id:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "").toLowerCase();

    const session = await readSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
    }

    if (action === "start") {
      if (preferAdminForSessionById && adminDbInstance) {
        await adminDbInstance.collection("game_sessions").doc(sessionId).update({
          status: "playing",
          currentQuestion: 0,
          questionStartTime: Date.now(),
        });
      } else {
        await updateDoc(doc(db, "game_sessions", sessionId), {
          status: "playing",
          currentQuestion: 0,
          questionStartTime: Date.now(),
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "next") {
      const current = Number(session?.currentQuestion || 0);
      const total = Number(
        session?.totalQuestions ||
          (Array.isArray(session?.selectedQuestionIndexes)
            ? session.selectedQuestionIndexes.length
            : 0)
      );
      const isLast = total > 0 ? current >= total - 1 : false;

      const nextPayload = isLast
        ? { status: "finished" }
        : { currentQuestion: current + 1, questionStartTime: Date.now() };

      if (preferAdminForSessionById && adminDbInstance) {
        await adminDbInstance.collection("game_sessions").doc(sessionId).update(nextPayload);
      } else {
        await updateDoc(doc(db, "game_sessions", sessionId), nextPayload);
      }

      return NextResponse.json({ success: true, finished: isLast });
    }

    if (action === "finish") {
      if (preferAdminForSessionById && adminDbInstance) {
        await adminDbInstance.collection("game_sessions").doc(sessionId).update({ status: "finished" });
      } else {
        await updateDoc(doc(db, "game_sessions", sessionId), { status: "finished" });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Accion invalida" }, { status: 400 });
  } catch (error) {
    console.error("Error updating session by id:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
