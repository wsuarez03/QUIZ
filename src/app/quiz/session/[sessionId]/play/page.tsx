"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { Navbar } from "@/components/Navbar";

export default function PlaySessionPage() {

  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();

  const sessionId = params.sessionId as string;
  const playerName = search.get("name") || "";
  const playerIdFromQuery = search.get("pid");

  const [quiz, setQuiz] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answerError, setAnswerError] = useState("");

  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [correct, setCorrect] = useState<boolean | null>(null);
  const [time, setTime] = useState(20);

  const selectedQuestionIndexes: number[] = Array.isArray(session?.selectedQuestionIndexes)
    ? session.selectedQuestionIndexes
    : [];
  const configuredQuestionsPerGame = Math.min(
    Math.max(1, Number(session?.questionsPerGame || quiz?.settings?.questionsPerGame || quiz?.questions?.length || 1)),
    Math.max(1, Number(quiz?.questions?.length || 1))
  );
  const fallbackOrder = quiz?.questions
    ? Array.from({ length: quiz.questions.length }, (_, i) => i).slice(0, configuredQuestionsPerGame)
    : [];
  const questionOrder = selectedQuestionIndexes.length
    ? selectedQuestionIndexes.slice(0, configuredQuestionsPerGame)
    : fallbackOrder;
  const totalQuestions = questionOrder.length;
  const currentQuestionIndexInQuiz = questionOrder[session?.currentQuestion ?? 0] ?? session?.currentQuestion ?? 0;
  const question = quiz?.questions?.[currentQuestionIndexInQuiz] || null;
  const questionTimeLimit = Math.max(1, Number(question?.timeLimit || 20));

  async function sendAnswer(index: number) {

    if (answered) return;

    setSelected(index);
    setAnswered(true);
    setAnswerError("");

    const res = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        playerName,
        playerId,
        questionIndex: session.currentQuestion,
        answerIndex: index
      })
    });

    const result = await res.json();

    if (!res.ok) {
      setAnswered(false);
      setSelected(null);
      setCorrect(null);
      setAnswerError(result?.error || "No se pudo registrar la respuesta");
      return;
    }

    setCorrect(typeof result?.correct === "boolean" ? result.correct : null);
  }

  useEffect(() => {

    if (!sessionId) return;

    setLoading(true);

    let unsubQuiz = () => {};
    let unsubQuestions = () => {};

    const unsubSession = onSnapshot(
      doc(db, "game_sessions", sessionId),
      (snap) => {

        if (!snap.exists()) {
          setError("Sesión no encontrada");
          setLoading(false);
          return;
        }

        const sessionData = snap.data();
        setSession(sessionData);

        if (!sessionData?.quizId) {
          setError("Sesión configurada incorrectamente");
          setLoading(false);
          return;
        }

        const quizRef = doc(db, "quizzes", sessionData.quizId);

        unsubQuiz();
        unsubQuestions();

        unsubQuiz = onSnapshot(
          quizRef,
          (quizSnap) => {

            if (!quizSnap.exists()) {
              setError("Quiz no encontrado");
              setLoading(false);
              return;
            }

            const quizData = quizSnap.data();

            if (Array.isArray(quizData.questions) && quizData.questions.length > 0) {
              setQuiz(quizData);
              setLoading(false);
              return;
            }

            setQuiz({ ...quizData, questions: [] });

            const questionsRef = collection(
              db,
              "quizzes",
              sessionData.quizId,
              "questions"
            );

            unsubQuestions = onSnapshot(
              questionsRef,
              (questionsSnap) => {

                const questions = questionsSnap.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));

                setQuiz((prev: any) => ({ ...prev, questions }));

                setLoading(false);
              }
            );
          }
        );
      }
    );

    return () => {
      unsubSession();
      unsubQuiz();
      unsubQuestions();
    };

  }, [sessionId]);

  // recuperar playerId guardado
  useEffect(() => {
    if (playerIdFromQuery) {
      setPlayerId(playerIdFromQuery);
      localStorage.setItem("playerId", playerIdFromQuery);
      localStorage.setItem("sessionId", sessionId);
      return;
    }

    const storedPlayerId = localStorage.getItem("playerId");
    const storedSessionId = localStorage.getItem("sessionId");
    if (storedPlayerId && storedSessionId === sessionId) {
      setPlayerId(storedPlayerId);
    }
  }, [playerIdFromQuery, sessionId]);

  // reset cuando cambia pregunta
  useEffect(() => {

    setSelected(null);
    setAnswered(false);
    setCorrect(null);
    setAnswerError("");
    setTime(questionTimeLimit);

  }, [session?.currentQuestion, questionTimeLimit]);

  // obtener tabla de jugadores cuando termina la sesión
  useEffect(() => {
    if (!sessionId) return;

    const playersRef = collection(db, "game_sessions", sessionId, "players");
    const unsubscribe = onSnapshot(playersRef, (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setPlayers(list);
    });

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (time <= 0 || session?.status !== "playing") return;

    const timer = setInterval(() => {
      setTime((t) => Math.max(0, t - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [time, session?.status]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          Cargando...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center text-red-500">
          {error}
        </div>
      </>
    );
  }

  const questionText = question?.text || question?.question || "";
  const options = question?.options || question?.answers || [];

  if (session?.status === "finished") {
    const sortedPlayers = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const currentPlayer = players.find((p) => p.name === playerName);

    return (
      <>
        <Navbar />
        <main className="min-h-screen p-8">
          <h1 className="text-3xl font-bold mb-4">Juego finalizado</h1>
          <p className="mb-4">Tu puntaje: {currentPlayer?.score ?? 0}</p>
          <p className="mb-8">Respuestas correctas: {currentPlayer?.correctAnswers ?? 0}</p>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-2xl font-semibold mb-4">Tabla de jugadores</h2>
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className="flex justify-between border-b py-2">
                <span>#{i + 1} {p.name}</span>
                <span>{p.score ?? 0} pts</span>
              </div>
            ))}
          </div>
        </main>
      </>
    );
  }

  if (!quiz || !question) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <div className="text-xl font-semibold">
            Esperando pregunta...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen p-8">

        <h1 className="text-2xl font-bold mb-4">
          {quiz.title}
        </h1>

        <h2 className="text-xl mb-2">
          Pregunta {session.currentQuestion + 1} de {totalQuestions || quiz?.questions?.length || 0}
        </h2>
        
        <div className="text-3xl font-bold mb-4">
        ⏱ {time}
        </div>

        <div className="text-lg mb-6">
          {questionText}
        </div>

        <div className="grid grid-cols-2 gap-4">

          {options.map((opt: string, i: number) => (

            <button
              key={i}
              disabled={answered}
              onClick={() => sendAnswer(i)}
              className={`p-4 rounded text-white font-bold transition
              ${selected === i ? "bg-green-500" : "bg-blue-500 hover:bg-blue-600"}
              ${answered && selected !== i ? "opacity-50" : ""}`}
            >
              {opt}
            </button>

          ))}

        </div>

        {correct !== null && (
          <div className="mt-6 text-xl font-bold">
            {correct ? "✅ Correcto" : "❌ Incorrecto"}
          </div>
        )}

        {answerError && (
          <div className="mt-4 text-red-600 font-semibold">
            {answerError}
          </div>
        )}

        <div className="mt-8 text-gray-500">
          Jugador: {playerName}
        </div>

      </main>
    </>
  );
}