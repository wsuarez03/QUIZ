import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { adminDbInstance, isConfigured } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";

let preferAdminForResults = Boolean(isConfigured && adminDbInstance);

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
    let quizQuestions: any[] = [];
    let answersDocs: any[] = [];

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

        const playersSnap = await adminDbInstance
          .collection("game_sessions")
          .doc(sessionId)
          .collection("players")
          .get();

        players = playersSnap.docs.map((d: any) => ({ id: d.id, data: d.data() }));

        const answersSnap = await adminDbInstance
          .collection("answers")
          .where("sessionId", "==", sessionId)
          .get();
        answersDocs = answersSnap.docs.map((d: any) => d.data());
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
        quizQuestions = Array.isArray((quizData as any)?.questions) ? (quizData as any).questions : [];
        if (!quizQuestions.length) {
          const qSnap = await getDocs(collection(db, "quizzes", sessionData.quizId, "questions"));
          quizQuestions = qSnap.docs.map((d) => d.data());
        }
      }

      const playersSnap = await getDocs(collection(db, "game_sessions", sessionId, "players"));
      players = playersSnap.docs.map((d) => ({ id: d.id, data: d.data() }));

      const answersSnap = await getDocs(query(collection(db, "answers"), where("sessionId", "==", sessionId)));
      answersDocs = answersSnap.docs.map((d) => d.data());
    }

    const sortedPlayers = [...players].sort(
      (a, b) => Number(b.data?.score || 0) - Number(a.data?.score || 0)
    );

    const totalQuestions = Number(quizQuestions?.length || quizData?.questions?.length || 0);
    const selectedQuestionIndexes: number[] = Array.isArray(sessionData?.selectedQuestionIndexes)
      ? sessionData.selectedQuestionIndexes
      : Array.from({ length: totalQuestions }, (_, i) => i);

    // Calculate accuracy based on questions actually asked, not total in quiz
    const totalQuestionsAsked = Math.min(selectedQuestionIndexes.length, totalQuestions);

    const results = sortedPlayers.map((playerDoc, index) => {
      const p = playerDoc.data || {};
      const correctAnswers = Number(p.correctAnswers || 0);

      const playerAnswerMap = new Map<number, any>();
      answersDocs
        .filter((a) => {
          const byId = a?.playerId && String(a.playerId) === String(playerDoc.id);
          const byName = !a?.playerId && String(a?.playerName || "").trim().toLowerCase() === String(p?.name || "").trim().toLowerCase();
          return byId || byName;
        })
        .forEach((a) => {
          const srcIdx = Number(a?.sourceQuestionIndex ?? a?.questionIndex);
          if (!playerAnswerMap.has(srcIdx)) {
            playerAnswerMap.set(srcIdx, a);
          }
        });

      const answers = selectedQuestionIndexes.map((sourceIndex, qPos) => {
        const q = quizQuestions?.[sourceIndex] || {};
        const options: string[] = Array.isArray(q?.options) ? q.options : [];
        const correctIndex = resolveCorrectIndex(q);
        const answerDoc = playerAnswerMap.get(Number(sourceIndex));
        const selectedIndex = answerDoc ? Number(answerDoc.answerIndex) : -1;
        const selectedOption =
          selectedIndex >= 0 && selectedIndex < options.length
            ? String(options[selectedIndex])
            : (answerDoc ? "(Sin opción válida)" : "(Sin responder)");
        const correctOption =
          correctIndex >= 0 && correctIndex < options.length
            ? String(options[correctIndex])
            : "(No definida)";

        return {
          questionNumber: qPos + 1,
          questionText: String(q?.text || q?.question || `Pregunta ${qPos + 1}`),
          selectedOption,
          correctOption,
          isCorrect: answerDoc ? Boolean(answerDoc?.correct) : false,
          wasAnswered: Boolean(answerDoc),
        };
      });

      return {
        rank: index + 1,
        playerId: playerDoc.id,
        playerName: p.name || "Jugador",
        score: Number(p.score || 0),
        correctAnswers,
        accuracy: totalQuestionsAsked > 0
          ? Math.round((correctAnswers / totalQuestionsAsked) * 100)
          : 0,
        answers,
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
      totalQuestions: totalQuestionsAsked,
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
