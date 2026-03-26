import { collection, addDoc, serverTimestamp, getDoc, doc, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { adminDbInstance } from "@/lib/firebaseAdmin"
import { NextResponse } from "next/server"
import { getMockQuizById } from "@/lib/mockStore"

let preferAdminForSessions = Boolean(adminDbInstance)

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

    // 1️⃣ validar que el quiz exista — Admin SDK first, then client SDK, then mocks
    let quizData: any = null

    if (preferAdminForSessions && adminDbInstance) {
      try {
        const snap = await adminDbInstance.collection("quizzes").doc(quizId).get()
        if (snap.exists) quizData = snap.data()
      } catch (adminErr) {
        preferAdminForSessions = false
        console.warn("Admin quiz read failed, trying fallback:", adminErr)
      }
    }

    if (!quizData) {
      try {
        const quizSnap = await getDoc(doc(db, "quizzes", quizId))
        if (quizSnap.exists()) quizData = quizSnap.data()
      } catch (clientErr) {
        console.warn("Client quiz read failed:", clientErr)
      }
    }

    const mockQuiz = getMockQuizById(quizId)
    if (!quizData && !mockQuiz) {
      return NextResponse.json(
        { error: `El quiz no existe (quizId=${quizId})` },
        { status: 404 }
      )
    }

    if (!quizData) quizData = mockQuiz
    const mockQuestionList = Array.isArray(mockQuiz?.questions) ? mockQuiz.questions : []
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

    let canUseAdmin = Boolean(preferAdminForSessions && adminDbInstance)

    while (codeExists) {
      let isEmpty = false
      if (canUseAdmin && adminDbInstance) {
        try {
          const snap = await adminDbInstance.collection("game_sessions").where("code", "==", code).limit(1).get()
          isEmpty = snap.empty
        } catch (adminErr) {
          console.warn("Admin code check failed, switching to client fallback:", adminErr)
          preferAdminForSessions = false
          canUseAdmin = false
          continue
        }
      } else {
        try {
          const snap = await getDocs(query(collection(db, "game_sessions"), where("code", "==", code)))
          isEmpty = snap.empty
        } catch (clientErr) {
          console.error("Client code check failed:", clientErr)
          return NextResponse.json(
            { error: "No se pudo validar el código de sesión" },
            { status: 500 }
          )
        }
      }
      if (isEmpty) {
        codeExists = false
      } else {
        code = generateCode()
      }
    }

    // 3️⃣ crear sesión
    let sessionId: string
    const sessionPayload = {
      quizId,
      code,
      status: "waiting",
      currentQuestion: 0,
      questionsPerGame,
      selectedQuestionIndexes,
      totalQuestions: selectedQuestionIndexes.length,
      createdAt: new Date()
    }

    if (canUseAdmin && adminDbInstance) {
      try {
        const ref = await adminDbInstance.collection("game_sessions").add(sessionPayload)
        sessionId = ref.id
      } catch (adminErr) {
        console.warn("Admin session create failed, trying client fallback:", adminErr)
        preferAdminForSessions = false
        const ref = await addDoc(collection(db, "game_sessions"), { ...sessionPayload, createdAt: serverTimestamp() })
        sessionId = ref.id
      }
    } else {
      const ref = await addDoc(collection(db, "game_sessions"), { ...sessionPayload, createdAt: serverTimestamp() })
      sessionId = ref.id
    }

    return NextResponse.json({
      success: true,
      sessionId,
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