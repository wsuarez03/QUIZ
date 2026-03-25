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

export async function POST(req: NextRequest) {
  if (preferAdminForAnswers && adminDbInstance) {
    try {
      return await handleWithAdmin(req);
    } catch (e) {
      preferAdminForAnswers = false;
      console.error("Answer error (Admin), switching to client fallback:", e);
      return handleWithClientSDK(req);
    }
  }
  return handleWithClientSDK(req);
}

async function handleWithAdmin(req: NextRequest): Promise<NextResponse> {
    const { sessionId, playerName, playerId, questionIndex, answerIndex } = await req.json();

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

    await adminDbInstance.collection("answers").add({
      sessionId, playerName, playerId: playerId || null,
      questionIndex, sourceQuestionIndex, answerIndex,
      correct, score, createdAt: Date.now()
    });

    const playersRef = adminDbInstance.collection("game_sessions").doc(sessionId).collection("players");
    let playerDocRef: any = null;

    if (playerId) {
      const candidate = playersRef.doc(playerId);
      const snap = await candidate.get();
      if (snap.exists) playerDocRef = candidate;
    }

    if (!playerDocRef && playerName) {
      const snap = await playersRef.where("name", "==", playerName).limit(1).get();
      if (!snap.empty) playerDocRef = snap.docs[0].ref;
    }

    if (playerDocRef) {
      const existing = await playerDocRef.get();
      const existingData = existing.data() || {};
      if (Number(existingData.lastAnsweredQuestion) === Number(questionIndex)) {
        return NextResponse.json({ success: true, correct, score: 0, alreadyAnswered: true });
      }
      const { FieldValue } = await import("firebase-admin/firestore");
      await playerDocRef.update({
        score: FieldValue.increment(score),
        correctAnswers: correct ? FieldValue.increment(1) : FieldValue.increment(0),
        lastAnsweredQuestion: Number(questionIndex)
      });
    }

    return NextResponse.json({ success: true, correct, score });
}

async function handleWithClientSDK(req: NextRequest): Promise<NextResponse> {
  try {
    const { sessionId, playerName, playerId, questionIndex, answerIndex } =
      await req.json();

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

    // guardar respuesta
    await addDoc(collection(db, "answers"), {
      sessionId,
      playerName,
      playerId: playerId || null,
      questionIndex,
      sourceQuestionIndex,
      answerIndex,
      correct,
      score,
      createdAt: Date.now()
    });

    // actualizar jugador (preferir playerId, si no buscar por playerName)
    let playerDocRef: any = null;

    if (playerId) {
      const candidate = doc(db, "game_sessions", sessionId, "players", playerId);
      const candidateSnap = await getDoc(candidate);
      if (candidateSnap.exists()) {
        playerDocRef = candidate;
      }
    }

    if (!playerDocRef && playerName) {
      const playersQ = query(
        collection(db, "game_sessions", sessionId, "players"),
        where("name", "==", playerName)
      );
      const playersSnap = await getDocs(playersQ);

      if (!playersSnap.empty) {
        playerDocRef = playersSnap.docs[0].ref;
      }
    }

    if (playerDocRef) {
      const existingPlayer = await getDoc(playerDocRef);
      const existingPlayerData = (existingPlayer.data() || {}) as any;
      const alreadyAnsweredCurrent =
        Number(existingPlayerData.lastAnsweredQuestion) === Number(questionIndex);

      if (alreadyAnsweredCurrent) {
        return NextResponse.json({ success: true, correct, score: 0, alreadyAnswered: true });
      }

      await updateDoc(playerDocRef, {
        score: increment(score),
        correctAnswers: correct ? increment(1) : increment(0),
        lastAnsweredQuestion: Number(questionIndex)
      });
    } else {
      console.warn(
        `Jugador no encontrado para actualizar score: sessionId=${sessionId}, playerId=${playerId}, playerName=${playerName}`
      );
    }

    return NextResponse.json({ success: true, correct, score });

  } catch (e) {

    console.error(e);

    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );

  }

}