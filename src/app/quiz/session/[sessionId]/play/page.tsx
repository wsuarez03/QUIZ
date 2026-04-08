"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { Navbar } from "@/components/Navbar";

export default function PlaySessionPage() {

  function toSafeTimeLimit(rawValue: unknown, fallback = 20) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(300, Math.max(1, Math.floor(parsed)));
  }

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
  const [useServerFallback, setUseServerFallback] = useState(false);
  const [answerError, setAnswerError] = useState("");
  const [allAnswers, setAllAnswers] = useState<any[]>([]);

  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [correct, setCorrect] = useState<boolean | null>(null);
  const [time, setTime] = useState(20);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState("");
  const [detailsRows, setDetailsRows] = useState<Array<{
    questionNumber: number;
    questionText: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    wasAnswered: boolean;
  }>>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [optionMappings, setOptionMappings] = useState<Record<string, number[]>>({});

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
  const questionTimeLimit = toSafeTimeLimit(question?.timeLimit, 20);

  // Aplicar mapping para mostrar opciones randomizadas
  function getRandomizedOptions(questionIndex: number, originalOptions: string[]): string[] {
    const mapping = optionMappings?.[String(questionIndex)];
    if (!mapping || !Array.isArray(originalOptions)) return originalOptions;
    
    return originalOptions.map((_, i) => originalOptions[mapping[i] ?? i]);
  }

  // Revertir mapping para obtener índice original
  function convertRandomizedIndexToOriginal(questionIndex: number, randomizedIndex: number): number {
    const mapping = optionMappings?.[String(questionIndex)];
    if (!mapping || !Array.isArray(mapping)) return randomizedIndex;
    
    return mapping[randomizedIndex] ?? randomizedIndex;
  }

  async function sendAnswer(index: number) {

    if (answered) return;

    // Convertir índice randomizado al original antes de enviar
    const originalIndex = convertRandomizedIndexToOriginal(currentQuestionIndexInQuiz, index);

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
        answerIndex: originalIndex
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

  async function loadPlayerDetails() {
    if (!sessionId || !playerName || !quiz) return;
    
    try {
      setLoadingDetails(true);
      
      // Cargar todas las respuestas de la sesión desde Firestore
      const answersRef = collection(db, "answers");
      const answersQuery = query(answersRef, where("sessionId", "==", sessionId));
      const answersSnap = await getDocs(answersQuery);
      const answersData = answersSnap.docs.map(d => d.data());
      
      // Filtrar respuestas del jugador actual
      const playerAnswers = answersData.filter(
        (a: any) =>
          String(a?.playerName || "").trim().toLowerCase() ===
          String(playerName).trim().toLowerCase()
      );
      
      // Construir mapa de respuestas indexadas por pregunta
      const answerMap = new Map<number, any>();
      playerAnswers.forEach((a: any) => {
        const srcIdx = Number(a?.sourceQuestionIndex ?? a?.questionIndex);
        if (!answerMap.has(srcIdx)) {
          answerMap.set(srcIdx, a);
        }
      });
      
      // Determinar función para resolver respuesta correcta
      function resolveCorrectIndex(question: any): number {
        if (question?.correctAnswerIndex !== undefined) return Number(question.correctAnswerIndex);
        if (question?.correct !== undefined) return Number(question.correct);
        if (question?.correctAnswer !== undefined && !Array.isArray(question?.options)) {
          const n = Number(question.correctAnswer);
          if (!Number.isNaN(n)) return n;
        }
        if (question?.correctAnswer && Array.isArray(question?.options)) {
          return question.options.findIndex(
            (o: string) =>
              String(o).trim().toLowerCase() ===
              String(question.correctAnswer).trim().toLowerCase()
          );
        }
        return -1;
      }
      
      const selectedQuestionIndexes: number[] = Array.isArray(session?.selectedQuestionIndexes)
        ? session.selectedQuestionIndexes
        : [];
      const configQ = Math.min(
        Math.max(1, Number(session?.questionsPerGame || quiz?.settings?.questionsPerGame || quiz?.questions?.length || 1)),
        Math.max(1, Number(quiz?.questions?.length || 1))
      );
      const fallbackOrder = quiz?.questions
        ? Array.from({ length: quiz.questions.length }, (_, i) => i).slice(0, configQ)
        : [];
      const questionOrder = selectedQuestionIndexes.length
        ? selectedQuestionIndexes.slice(0, configQ)
        : fallbackOrder;
      
      // Construir filas de detalles
      const rows = questionOrder.map((sourceIndex: number, idx: number) => {
        const q = quiz?.questions?.[sourceIndex] || {};
        const options: string[] = Array.isArray(q?.options) ? q.options : [];
        const correctIndex = resolveCorrectIndex(q);
        const answerDoc = answerMap.get(Number(sourceIndex));
        const selectedIndex = Number(answerDoc?.answerIndex ?? -1);
        
        return {
          questionNumber: idx + 1,
          questionText: q?.text || q?.question || "(sin texto)",
          selectedOption: selectedIndex >= 0 && selectedIndex < options.length
            ? options[selectedIndex]
            : "(no respondida)",
          correctOption: correctIndex >= 0 && correctIndex < options.length
            ? options[correctIndex]
            : "(desconocida)",
          isCorrect: answerDoc ? Boolean(answerDoc.correct) : false,
          wasAnswered: Boolean(answerDoc)
        };
      });
      
      setDetailsTitle(`${quiz?.title} - ${playerName}`);
      setDetailsRows(rows);
      setShowDetailsModal(true);
    } catch (e) {
      console.error("Error loading details:", e);
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    if (!sessionId || useServerFallback) return;

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
              },
              (err) => {
                console.error("Error listening questions:", err);
                setUseServerFallback(true);
                setLoading(false);
              }
            );
          },
          (err) => {
            console.error("Error listening quiz:", err);
            setUseServerFallback(true);
            setLoading(false);
          }
        );
      },
      (err) => {
        console.error("Error listening game session:", err);
        setUseServerFallback(true);
        setLoading(false);
      }
    );

    return () => {
      unsubSession();
      unsubQuiz();
      unsubQuestions();
    };

  }, [sessionId, useServerFallback]);

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
    if (!sessionId || useServerFallback) return;

    const playersRef = collection(db, "game_sessions", sessionId, "players");
    const unsubscribe = onSnapshot(playersRef, (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setPlayers(list);
    }, (err) => {
      console.error("Error listening players:", err);
      setUseServerFallback(true);
    });

    return () => unsubscribe();
  }, [sessionId, useServerFallback]);

  useEffect(() => {
    if (!sessionId || !useServerFallback) return;

    let mounted = true;

    const loadFromServer = async () => {
      try {
        const res = await fetch(`/api/game-sessions/${sessionId}?include=players,quiz`);
        const data = await res.json();
        if (!mounted) return;

        if (!res.ok) {
          if (res.status === 404) {
            setError("Sesión no encontrada");
          }
          setLoading(false);
          return;
        }

        if (data?.session) setSession(data.session);
        if (Array.isArray(data?.players)) setPlayers(data.players);
        if (data?.quiz) setQuiz(data.quiz);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error("Server fallback failed:", err);
        setLoading(false);
      }
    };

    loadFromServer();
    const intervalId = setInterval(loadFromServer, 2000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [sessionId, useServerFallback]);

  // Cargar option mappings del jugador actual
  useEffect(() => {
    if (!sessionId || !playerName || players.length === 0) return;

    const currentPlayer = players.find((p) => p.name === playerName);
    if (currentPlayer?.optionMappings) {
      setOptionMappings(currentPlayer.optionMappings);
    }
  }, [sessionId, playerName, players]);

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

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Tabla de jugadores</h2>
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className="flex justify-between border-b py-2">
                <span>#{i + 1} {p.name}</span>
                <span>{p.score ?? 0} pts</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadPlayerDetails}
              disabled={loadingDetails}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loadingDetails ? "Cargando..." : "📊 Resultados"}
            </button>
          </div>
        </main>

        {showDetailsModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-lg">{detailsTitle}</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>

              <div className="p-4 overflow-auto max-h-[65vh]">
                {detailsRows.length === 0 ? (
                  <p className="text-gray-600">No hay respuestas para mostrar.</p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="border px-3 py-2">#</th>
                        <th className="border px-3 py-2">Pregunta</th>
                        <th className="border px-3 py-2">Respondió</th>
                        <th className="border px-3 py-2">Correcta</th>
                        <th className="border px-3 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsRows.map((d, i) => (
                        <tr key={`detail-${i}`} className="hover:bg-purple-50">
                          <td className="border px-3 py-2">{d.questionNumber}</td>
                          <td className="border px-3 py-2">{d.questionText}</td>
                          <td className="border px-3 py-2">{d.selectedOption}</td>
                          <td className="border px-3 py-2">{d.correctOption}</td>
                          <td className="border px-3 py-2">
                            {d.wasAnswered
                              ? d.isCorrect
                                ? "✅ Correcta"
                                : "❌ Incorrecta"
                              : "⭕ Sin responder"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
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

          {getRandomizedOptions(currentQuestionIndexInQuiz, options).map((opt: string, i: number) => (

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