import { NextRequest, NextResponse } from "next/server";
import { adminDbInstance } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";

import {
  addDoc,
  collection,
  getDoc,
  doc,
  updateDoc,
  increment,
  query,
  where,
  getDocs
} from "firebase/firestore";

let preferAdminForAnswers = Boolean(adminDbInstance);

type AnswerBody = {
  sessionId: string;
  playerName?: string;
  playerId?: string;
  questionIndex: number;
  answerIndex: number;
};

function normalizeName(value?: string) {
  return String(value || "").trim().toLowerCase();
}

async function resolveAdminPlayerRef(sessionId: string, playerId?: string, playerName?: string) {
  const playersRef = adminDbInstance.collection("game_sessions").doc(sessionId).collection("players");

  if (playerId) {
    const candidate = playersRef.doc(playerId);
    const snap = await candidate.get();
    if (snap.exists) return candidate;
  }

  if (playerName) {
    const byExact = await playersRef.where("name", "==", String(playerName)).limit(1).get();
    if (!byExact.empty) return byExact.docs[0].ref;

    const all = await playersRef.get();
    const target = normalizeName(playerName);
    const byNormalized = all.docs.find((d: any) => normalizeName(d.data()?.name) === target);
    if (byNormalized) return byNormalized.ref;
  }

  return null;
}

async function resolveClientPlayerRef(sessionId: string, playerId?: string, playerName?: string) {
  if (playerId) {
    const candidate = doc(db, "game_sessions", sessionId, "players", playerId);
    const snap = await getDoc(candidate);
    if (snap.exists()) return candidate;
  }

  if (playerName) {
    const exactQ = query(
      collection(db, "game_sessions", sessionId, "players"),
      where("name", "==", String(playerName))
    );
    const exactSnap = await getDocs(exactQ);
    if (!exactSnap.empty) return exactSnap.docs[0].ref;

    const allSnap = await getDocs(collection(db, "game_sessions", sessionId, "players"));
    const target = normalizeName(playerName);
    const byNormalized = allSnap.docs.find((d) => normalizeName((d.data() as any)?.name) === target);
    if (byNormalized) return byNormalized.ref;
  }

  return null;
}

export async function POST(req: NextRequest) {
  let body: AnswerBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (preferAdminForAnswers && adminDbInstance) {
    try {
      // Short timeout (2s) to fail fast if Admin SDK hangs (gRPC DECODER error on Vercel)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Admin SDK timeout")), 2000)
      );
      return await Promise.race([handleWithAdmin(body), timeoutPromise]) as NextResponse;
    } catch (e) {
      preferAdminForAnswers = false;
      console.warn("Answer error (Admin), switching to client fallback:", (e as any)?.message || e);
      return handleWithClientSDK(body);
    }
  }
  return handleWithClientSDK(body);
}

async function handleWithAdmin(body: AnswerBody): Promise<NextResponse> {
    const { sessionId, playerName, playerId, questionIndex, answerIndex } = body;

    const sessionSnap = await adminDbInstance.collection("game_sessions").doc(sessionId).get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }
    const session = sessionSnap.data() as any;

    const quizSnap = await adminDbInstance.collection("quizzes").doc(session.quizId).get();
    if (!quizSnap.exists) {
      return NextResponse.json({ error: "quiz not found" }, { status: 404 });
    }
    const quiz = quizSnap.data() as any;
    let questions: any[] = Array.isArray(quiz?.questions) ? quiz.questions : [];
    if (!questions.length) {
      const sub = await adminDbInstance
        .collection("quizzes")
        .doc(session.quizId)
        .collection("questions")
        .get();
      questions = sub.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    }

    const selectedQuestionIndexes: number[] = Array.isArray(session.selectedQuestionIndexes)
      ? session.selectedQuestionIndexes : [];
    const sourceQuestionIndex = selectedQuestionIndexes[questionIndex] ?? questionIndex;
    const question = questions?.[sourceQuestionIndex];

    if (!question) {
      return NextResponse.json({ error: "question not found" }, { status: 400 });
    }

    let correctIndex = -1;
    if (question.correctAnswerIndex !== undefined) correctIndex = Number(question.correctAnswerIndex);
    else if (question.correct !== undefined) correctIndex = Number(question.correct);
    else if (question.correctAnswer) {
      correctIndex = question.options?.findIndex(
        (o: string) => o.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
      );
    }

    const selectedIndex = Number(answerIndex);
    const correct = correctIndex >= 0 && selectedIndex === Number(correctIndex);
    let score = 0;

    if (correct) {
      const now = Date.now();
      const start = Number(session.questionStartTime || now);
      const elapsedSeconds = Math.max(0, Math.floor((now - start) / 1000));
      score = Math.max(0, 100 - elapsedSeconds);
    }

    const playerDocRef: any = await resolveAdminPlayerRef(sessionId, playerId, playerName);

    if (!playerDocRef) {
      return NextResponse.json({ error: "player not found in session" }, { status: 404 });
    }

    const existing = await playerDocRef.get();
    const existingData = existing.data() || {};
    if (Number(existingData.lastAnsweredQuestion) === Number(questionIndex)) {
      return NextResponse.json({ success: true, correct, score: 0, alreadyAnswered: true });
    }

    await adminDbInstance.collection("answers").add({
      sessionId, playerName, playerId: playerDocRef.id || playerId || null,
      questionIndex, sourceQuestionIndex, answerIndex,
      correct, score, createdAt: Date.now()
    });

    const { FieldValue } = await import("firebase-admin/firestore");
    await playerDocRef.update({
      score: FieldValue.increment(score),
      correctAnswers: correct ? FieldValue.increment(1) : FieldValue.increment(0),
      lastAnsweredQuestion: Number(questionIndex)
    });

    return NextResponse.json({ success: true, correct, score });
}

async function handleWithClientSDK(body: AnswerBody): Promise<NextResponse> {
  try {
    const { sessionId, playerName, playerId, questionIndex, answerIndex } = body;

    const sessionSnap = await getDoc(
      doc(db, "game_sessions", sessionId)
    );

    if (!sessionSnap.exists()) {
      return NextResponse.json(
        { error: "session not found" },
        { status: 404 }
      );
    }

    const session = sessionSnap.data();

    const quizSnap = await getDoc(
      doc(db, "quizzes", session.quizId)
    );

    if (!quizSnap.exists()) {
      return NextResponse.json(
        { error: "quiz not found" },
        { status: 404 }
      );
    }

    const quiz = quizSnap.data();
    let questions: any[] = Array.isArray((quiz as any)?.questions) ? (quiz as any).questions : [];
    if (!questions.length) {
      const sub = await getDocs(collection(db, "quizzes", session.quizId, "questions"));
      questions = sub.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    const selectedQuestionIndexes: number[] = Array.isArray(session.selectedQuestionIndexes)
      ? session.selectedQuestionIndexes
      : [];
    const sourceQuestionIndex = selectedQuestionIndexes[questionIndex] ?? questionIndex;

    const question = questions?.[sourceQuestionIndex];

    if (!question) {
      return NextResponse.json(
        { error: "question not found" },
        { status: 400 }
      );
    }

    // 🔧 detectar respuesta correcta
    let correctIndex = -1;

    if (question.correctAnswerIndex !== undefined) {
      correctIndex = Number(question.correctAnswerIndex);
    } else if (question.correct !== undefined) {
      correctIndex = Number(question.correct);
    } else if (question.correctAnswer) {
      correctIndex = question.options?.findIndex(
        (o: string) =>
          o.trim().toLowerCase() ===
          question.correctAnswer.trim().toLowerCase()
      );
    }

    const selectedIndex = Number(answerIndex);
    const correct = correctIndex >= 0 && selectedIndex === Number(correctIndex);

    // score: cada pregunta vale 100 y se descuenta 1 punto por segundo.
    let score = 0;

    if (correct) {

      const now = Date.now();
      const start = Number(session.questionStartTime || now);
      const elapsedSeconds = Math.max(0, Math.floor((now - start) / 1000));

      const basePoints = 100;
      score = Math.max(0, basePoints - elapsedSeconds);

    }

    const playerDocRef: any = await resolveClientPlayerRef(sessionId, playerId, playerName);

    if (!playerDocRef) {
      return NextResponse.json({ error: "player not found in session" }, { status: 404 });
    }

    const existingPlayer = await getDoc(playerDocRef);
    const existingPlayerData = (existingPlayer.data() || {}) as any;
    const alreadyAnsweredCurrent =
      Number(existingPlayerData.lastAnsweredQuestion) === Number(questionIndex);

    if (alreadyAnsweredCurrent) {
      return NextResponse.json({ success: true, correct, score: 0, alreadyAnswered: true });
    }

    await addDoc(collection(db, "answers"), {
      sessionId,
      playerName,
      playerId: playerDocRef.id || playerId || null,
      questionIndex,
      sourceQuestionIndex,
      answerIndex,
      correct,
      score,
      createdAt: Date.now()
    });

    await updateDoc(playerDocRef, {
      score: increment(score),
      correctAnswers: correct ? increment(1) : increment(0),
      lastAnsweredQuestion: Number(questionIndex)
    });

    return NextResponse.json({ success: true, correct, score });

  } catch (e) {

    console.error(e);

    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );

  }

}