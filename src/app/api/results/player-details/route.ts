import { NextRequest, NextResponse } from "next/server";
import { adminDbInstance } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

let preferAdminForPlayerDetails = Boolean(adminDbInstance);

function normalizeName(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function resolveCorrectIndex(question: any): number {
  if (question?.correctAnswerIndex !== undefined) return Number(question.correctAnswerIndex);
  if (question?.correct !== undefined) return Number(question.correct);
  if (question?.correctAnswer !== undefined && !Array.isArray(question?.options)) {
    const n = Number(question.correctAnswer);
    if (!Number.isNaN(n)) return n;
  }
  if (question?.correctAnswer && Array.isArray(question?.options)) {
    return question.options.findIndex(
      (o: string) => String(o).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase()
    );
  }
  return -1;
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = String(request.nextUrl.searchParams.get("sessionId") || "").trim();
    const playerName = String(request.nextUrl.searchParams.get("playerName") || "").trim();
    const playerId = String(request.nextUrl.searchParams.get("playerId") || "").trim();

    if (!sessionId || (!playerName && !playerId)) {
      return NextResponse.json(
        { error: "sessionId y playerName o playerId son requeridos" },
        { status: 400 }
      );
    }

    let sessionData: any = null;
    let quizData: any = null;
    let quizQuestions: any[] = [];
    let answersDocs: any[] = [];

    if (preferAdminForPlayerDetails && adminDbInstance) {
      try {
        const sessionSnap = await adminDbInstance.collection("game_sessions").doc(sessionId).get();
        if (!sessionSnap.exists) {
          return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
        }

        sessionData = sessionSnap.data() || {};

        if (sessionData.quizId) {
          const quizSnap = await adminDbInstance.collection("quizzes").doc(sessionData.quizId).get();
          quizData = quizSnap.exists ? quizSnap.data() : null;
          quizQuestions = Array.isArray(quizData?.questions) ? quizData.questions : [];

          if (!quizQuestions.length) {
            const qSnap = await adminDbInstance
              .collection("quizzes")
              .doc(sessionData.quizId)
              .collection("questions")
              .get();
            quizQuestions = qSnap.docs.map((d: any) => d.data());
          }
        }

        const answersSnap = await adminDbInstance
          .collection("answers")
          .where("sessionId", "==", sessionId)
          .get();
        answersDocs = answersSnap.docs.map((d: any) => d.data());
      } catch (adminErr) {
        preferAdminForPlayerDetails = false;
        console.error("Admin player-details read failed, using client fallback:", adminErr);
      }
    }

    if (!sessionData) {
      const sessionSnap = await getDoc(doc(db, "game_sessions", sessionId));
      if (!sessionSnap.exists()) {
        return NextResponse.json({ error: "Sesion no encontrada" }, { status: 404 });
      }
      sessionData = sessionSnap.data();

      if (sessionData.quizId) {
        const quizSnap = await getDoc(doc(db, "quizzes", sessionData.quizId));
        quizData = quizSnap.exists() ? quizSnap.data() : null;
        quizQuestions = Array.isArray((quizData as any)?.questions) ? (quizData as any).questions : [];

        if (!quizQuestions.length) {
          const qSnap = await getDocs(collection(db, "quizzes", sessionData.quizId, "questions"));
          quizQuestions = qSnap.docs.map((d: any) => d.data());
        }
      }

      const answersSnap = await getDocs(query(collection(db, "answers"), where("sessionId", "==", sessionId)));
      answersDocs = answersSnap.docs.map((d: any) => d.data());
    }

    const totalQuestions = Number(quizQuestions?.length || quizData?.questions?.length || 0);
    const selectedQuestionIndexes: number[] = Array.isArray(sessionData?.selectedQuestionIndexes)
      ? sessionData.selectedQuestionIndexes
      : [];

    const configuredQuestionsPerGame = Math.min(
      Math.max(1, Number(sessionData?.questionsPerGame || quizData?.settings?.questionsPerGame || totalQuestions || 1)),
      Math.max(1, totalQuestions || 1)
    );

    const fallbackOrder = Array.from({ length: totalQuestions }, (_, i) => i).slice(0, configuredQuestionsPerGame);
    const questionOrder = selectedQuestionIndexes.length
      ? selectedQuestionIndexes.slice(0, configuredQuestionsPerGame)
      : fallbackOrder;

    const targetName = normalizeName(playerName);
    const playerAnswerMap = new Map<number, any>();

    answersDocs
      .filter((a: any) => {
        const byId = playerId && String(a?.playerId || "") === playerId;
        const byName = !playerId && normalizeName(a?.playerName) === targetName;
        return byId || byName;
      })
      .forEach((a: any) => {
        const srcIdx = Number(a?.sourceQuestionIndex ?? a?.questionIndex);
        if (!playerAnswerMap.has(srcIdx)) {
          playerAnswerMap.set(srcIdx, a);
        }
      });

    const rows = questionOrder.map((sourceIndex, idx) => {
      const q = quizQuestions?.[sourceIndex] || {};
      const options: string[] = Array.isArray(q?.options) ? q.options : [];
      const correctIndex = resolveCorrectIndex(q);
      const answerDoc = playerAnswerMap.get(Number(sourceIndex));
      const selectedIndex = Number(answerDoc?.answerIndex ?? -1);

      return {
        questionNumber: idx + 1,
        questionText: String(q?.text || q?.question || `(sin texto)`),
        selectedOption:
          selectedIndex >= 0 && selectedIndex < options.length
            ? String(options[selectedIndex])
            : "(no respondida)",
        correctOption:
          correctIndex >= 0 && correctIndex < options.length
            ? String(options[correctIndex])
            : "(desconocida)",
        isCorrect: answerDoc ? Boolean(answerDoc.correct) : false,
        wasAnswered: Boolean(answerDoc),
      };
    });

    return NextResponse.json({
      quizTitle: String(quizData?.title || "Quiz"),
      rows,
    });
  } catch (error: any) {
    console.error("Error loading player details:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
