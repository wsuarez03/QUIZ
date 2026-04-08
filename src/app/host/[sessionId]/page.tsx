"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"

import { db } from "@/lib/firebase"

import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  collection
} from "firebase/firestore"

import { Button } from "@/components/Button"
import { Navbar } from "@/components/Navbar"
import { Leaderboard } from "@/components/Leaderboard"

export default function HostPage() {

  const params = useParams()
  const router = useRouter()
  const sessionId = params?.sessionId as string

  const [session, setSession] = useState<any>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingResults, setSavingResults] = useState(false)
  const advancingRef = useRef(false)

  function toSafeTimeLimit(rawValue: unknown, fallback = 20) {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(300, Math.max(1, Math.floor(parsed)))
  }

  const selectedQuestionIndexes: number[] = Array.isArray(session?.selectedQuestionIndexes)
    ? session.selectedQuestionIndexes
    : []
  const configuredQuestionsPerGame = Math.min(
    Math.max(1, Number(session?.questionsPerGame || quiz?.settings?.questionsPerGame || quiz?.questions?.length || 1)),
    Math.max(1, Number(quiz?.questions?.length || 1))
  )
  const fallbackOrder = quiz?.questions
    ? Array.from({ length: quiz.questions.length }, (_, i) => i).slice(0, configuredQuestionsPerGame)
    : []
  const questionOrder = selectedQuestionIndexes.length
    ? selectedQuestionIndexes.slice(0, configuredQuestionsPerGame)
    : fallbackOrder
  const totalQuestions = questionOrder.length
  const currentQuestionIndexInQuiz = questionOrder[session?.currentQuestion ?? 0] ?? session?.currentQuestion ?? 0
  const question = quiz?.questions?.[currentQuestionIndexInQuiz]
  const answeredCount = players.filter((p) => Number(p?.lastAnsweredQuestion) === Number(session?.currentQuestion)).length
  const everyoneAnswered = players.length > 0 && answeredCount === players.length
  const canAdvanceManually = players.length > 0 && everyoneAnswered

  // 🔹 Escuchar sesión en tiempo real
  useEffect(() => {

    if (!sessionId) return

    const sessionRef = doc(db, "game_sessions", sessionId)

    const unsubscribe = onSnapshot(sessionRef, (snap) => {

      const data = snap.data()
      if (!data) return

      setSession({
        id: snap.id,
        ...data
      })

      setLoading(false)

    }, (error) => {
      console.error("Error listening session:", error)
      setLoading(false)
    })

    return () => unsubscribe()

  }, [sessionId])


  // 🔹 Cargar quiz
  useEffect(() => {

    if (!session?.quizId) return

    const loadQuiz = async () => {

      try {
        const res = await fetch(`/api/quizzes/${session.quizId}`)
        if (res.ok) {
          const q = await res.json()
          if (q && Array.isArray(q.questions) && q.questions.length > 0) {
            setQuiz(q)
            return
          }
        }
      } catch { /* fall through to client SDK */ }

      // Fallback: read directly from Firestore client SDK
      try {
        const snap = await getDoc(doc(db, 'quizzes', session.quizId))
        if (snap.exists()) {
          const data: any = snap.data()
          let questions = Array.isArray(data.questions) ? data.questions : []

          if (!questions.length) {
            try {
              const questionsSnap = await getDocs(collection(db, 'quizzes', session.quizId, 'questions'))
              questions = questionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
            } catch { /* no-op */ }
          }

          setQuiz({ id: snap.id, ...data, questions })
        }
      } catch (err) {
        console.error('Failed to load quiz from Firestore:', err)
      }

    }

    loadQuiz()

  }, [session?.quizId])


  // 🔹 Escuchar jugadores
  useEffect(() => {

    if (!sessionId) return

    const playersRef = collection(
      db,
      "game_sessions",
      sessionId,
      "players"
    )

    const unsubscribe = onSnapshot(playersRef, (snapshot) => {

      const list: any[] = []

      snapshot.forEach((doc) => {

        list.push({
          id: doc.id,
          ...doc.data()
        })

      })

      setPlayers(list)

    }, (error) => {
      console.error("Error listening players:", error)
    })

    return () => unsubscribe()

  }, [sessionId])


  // 🔹 Iniciar juego
  const startGame = async () => {

    const ref = doc(db, "game_sessions", sessionId)

    await updateDoc(ref, {
      status: "playing",
      currentQuestion: 0,
      questionStartTime: Date.now()
    })

  }


  // 🔹 Siguiente pregunta manual
  const nextQuestion = async (force = false) => {

    if (!quiz || advancingRef.current) return
    if (!force && !canAdvanceManually) return

    advancingRef.current = true

    try {
      const ref = doc(db, "game_sessions", sessionId)
      const latestSnap = await getDoc(ref)
      if (!latestSnap.exists()) return

      const latestSession = latestSnap.data() as any
      const latestCurrentQuestion = Number(latestSession?.currentQuestion ?? 0)

      const isLast = latestCurrentQuestion >= totalQuestions - 1

      if (isLast) {

        await updateDoc(ref, {
          status: "finished"
        })

        return
      }

      await updateDoc(ref, {
        currentQuestion: latestCurrentQuestion + 1,
        questionStartTime: Date.now()
      })
    } finally {
      advancingRef.current = false
    }

  }

  const saveResults = async () => {

    try {
      setSavingResults(true)

      const response = await fetch("/api/results/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data?.error || "No se pudieron guardar los resultados")
        return
      }

      router.push("/profile/results")

    } catch (error) {
      console.error("Error guardando resultados", error)
      alert("Error guardando resultados")
    } finally {
      setSavingResults(false)
    }

  }


  // 🔹 TEMPORIZADOR AUTOMÁTICO
  useEffect(() => {

    if (!session || !quiz) return
    if (session.status !== "playing") return

    const questionTimeLimit = toSafeTimeLimit(question?.timeLimit, 20)
    const timer = setTimeout(() => {

      nextQuestion(true)

    }, questionTimeLimit * 1000)

    return () => clearTimeout(timer)

  }, [session?.currentQuestion, session?.status, quiz])


  if (loading) {

    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          Cargando sesión...
        </div>
      </>
    )

  }

  if (!session) {

    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          Sesión no encontrada
        </div>
      </>
    )

  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen p-8 bg-white text-black">

        {/* LOBBY */}

        {session.status === "waiting" && (

          <div className="text-center">

            <h1 className="text-4xl font-bold mb-6">
              {quiz?.title}
            </h1>

            <div className="text-6xl font-bold bg-purple-600 text-white p-6 rounded-lg inline-block mb-4">
              {session.code}
            </div>

            <p className="mb-4">
              Jugadores conectados: {players.length}
            </p>

            <Button onClick={startGame}>
              Iniciar juego
            </Button>

            <div className="mt-8 space-y-2">

              {players.map((p) => (

                <div
                  key={p.id}
                  className="bg-gray-100 p-3 rounded"
                >
                  {p.name}
                </div>

              ))}

            </div>

          </div>

        )}


        {/* FIN DEL JUEGO */}

        {session.status === "finished" && (

          <div className="max-w-3xl mx-auto text-center">

            <h1 className="text-4xl font-bold mb-4">🏆 Quiz finalizado</h1>

            <p className="text-gray-500 mb-8">{quiz?.title}</p>

            <Leaderboard
              entries={players
                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                .map((p, idx) => {
                  const selectedQuestionIndexes: number[] = Array.isArray(session?.selectedQuestionIndexes)
                    ? session.selectedQuestionIndexes
                    : [];
                  const totalQuestionsAsked = Math.max(1, 
                    selectedQuestionIndexes.length || 
                    Number(session?.questionsPerGame) || 
                    quiz?.questions?.length || 
                    0
                  );
                  return {
                    rank: idx + 1,
                    playerId: p.id,
                    playerName: p.name,
                    score: p.score ?? 0,
                    correctAnswers: p.correctAnswers ?? 0,
                    accuracy: Math.round(((p.correctAnswers ?? 0) / totalQuestionsAsked) * 100)
                  };
                })}
              title="Tabla de posiciones final"
            />

            <div className="mt-6">
              <Button onClick={saveResults} disabled={savingResults}>
                {savingResults ? "Guardando..." : "Guardar resultados en perfil"}
              </Button>
            </div>

          </div>

        )}

        {/* JUEGO */}

        {session.status === "playing" && question && (

          <div className="max-w-3xl mx-auto text-center">

            <h2 className="text-2xl mb-4">
              Pregunta {session.currentQuestion + 1} de {totalQuestions}
            </h2>

            <h1 className="text-3xl font-bold mb-8">
              {question.text}
            </h1>

            <div className="grid grid-cols-2 gap-4 mb-8">

              {question.options.map((opt: string, i: number) => (

                <div
                  key={i}
                  className="p-4 bg-gray-100 rounded"
                >
                  {opt}
                </div>

              ))}

            </div>

            <div className="mb-3 text-sm text-gray-600">
              Respondieron {answeredCount} / {players.length}
            </div>

            <Button onClick={() => nextQuestion()} disabled={!canAdvanceManually}>
              Siguiente pregunta
            </Button>

            {!canAdvanceManually && (
              <p className="mt-2 text-sm text-amber-700">
                Respondieron {answeredCount} / {players.length}
              </p>
            )}

            <div className="mt-10">

              <Leaderboard
                entries={players
                  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                  .map((p, idx) => ({
                    rank: idx + 1,
                    playerId: p.id,
                    playerName: p.name,
                    score: p.score ?? 0,
                    correctAnswers: p.correctAnswers ?? 0,
                    accuracy:
                      quiz?.questions?.length > 0
                        ? Math.round(((p.correctAnswers ?? 0) / quiz.questions.length) * 100)
                        : 0
                  }))}
                title="Tabla de posiciones"
              />

            </div>

          </div>

        )}

      </main>

    </>
  )
}