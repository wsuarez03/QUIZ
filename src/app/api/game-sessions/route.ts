import { collection, addDoc, serverTimestamp, getDoc, doc, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { NextResponse } from "next/server"
import { mockQuizzes, mockQuestions } from "@/lib/mockData"

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {

    const body = await req.json()
    const quizId = body?.quizId?.toString().trim()
    console.log("QUIZ ID RECIBIDO:", quizId)

    if (!quizId) {
      return NextResponse.json(
        { error: "quizId requerido" },
        { status: 400 }
      )
    }

    // 1️⃣ validar que el quiz exista (Firestore o mocks)
    const quizRef = doc(db, "quizzes", quizId)
    const quizSnap = await getDoc(quizRef)
    const mockQuiz = mockQuizzes.find((q) => q.id === quizId)

    if (!quizSnap.exists() && !mockQuiz) {
      return NextResponse.json(
        { error: `El quiz no existe (quizId=${quizId})` },
        { status: 404 }
      )
    }

    const quizData: any = quizSnap.exists() ? quizSnap.data() : mockQuiz
    const mockQuestionList = (mockQuestions as Record<string, any[]>)[quizId] || []
    const quizQuestions = Array.isArray(quizData?.questions) && quizData?.questions?.length
      ? quizData.questions
      : mockQuestionList
    const totalAvailableQuestions = quizQuestions.length
    const configuredQuestionsPerGame = Number(
      quizData?.settings?.questionsPerGame || totalAvailableQuestions || 1
    )
    const questionsPerGame = Math.min(
      Math.max(1, configuredQuestionsPerGame),
      Math.max(1, totalAvailableQuestions)
    )
    const randomizeQuestions =
      Boolean(quizData?.settings?.randomizeQuestions) ||
      questionsPerGame < totalAvailableQuestions

    const allIndexes = Array.from({ length: totalAvailableQuestions }, (_, i) => i)
    const selectedQuestionIndexes = (randomizeQuestions ? shuffle(allIndexes) : allIndexes)
      .slice(0, questionsPerGame)

    // 2️⃣ generar código único
    let code = generateCode()
    let codeExists = true

    while (codeExists) {
      const q = query(
        collection(db, "game_sessions"),
        where("code", "==", code)
      )

      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        codeExists = false
      } else {
        code = generateCode()
      }
    }

    // 3️⃣ crear sesión
    const sessionRef = await addDoc(
      collection(db, "game_sessions"),
      {
        quizId,
        code,
        status: "waiting",
        currentQuestion: 0,
        questionsPerGame,
        selectedQuestionIndexes,
        totalQuestions: selectedQuestionIndexes.length,
        createdAt: serverTimestamp()
      }
    )

    return NextResponse.json({
      success: true,
      sessionId: sessionRef.id,
      code
    })

  } catch (error) {

    console.error("Error creando sesión:", error)

    return NextResponse.json(
      { error: "Error creando sesión" },
      { status: 500 }
    )

  }
}