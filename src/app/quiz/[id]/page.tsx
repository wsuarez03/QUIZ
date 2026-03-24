'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { useSession } from 'next-auth/react';

interface QuizData {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  questions: any[];
  createdBy: string;
  isPublic: boolean;
  settings?: {
    questionsPerGame: number;
  };
}

export default function QuizDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingGame, setStartingGame] = useState(false);

  // 🔹 Imprimir session y quiz solo cuando quiz tenga datos
  useEffect(() => {
    if (quiz) {
      console.log("SESSION:", session);
      console.log("USER EMAIL:", session?.user?.email);
      console.log("QUIZ OWNER:", quiz?.createdBy);
    }
  }, [quiz, session]);

  // cargar quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/quizzes/${quizId}`);
        if (!response.ok) throw new Error('Quiz no encontrado');
        const data = await response.json();
        setQuiz(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error cargando quiz');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) fetchQuiz();
  }, [quizId]);

  // crear sala (GAME SESSION)
  const handlePlayQuiz = async () => {
    if (!quiz) return;

    try {
      setStartingGame(true);

      const res = await fetch('/api/game-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id })
      });

      if (!res.ok) throw new Error('No se pudo crear la sesión');

      const data = await res.json();
      console.log('Game session creada:', data);

      const sessionId = data.sessionId || data.code || data.sessionCode;
      if (!sessionId) throw new Error('La API no devolvió sessionId');

      // Redirige al host
      router.push(`/host/${sessionId}`);
    } catch (error) {
      console.error(error);
      alert('Error iniciando el juego');
    } finally {
      setStartingGame(false);
    }
  };

  // validar owner
  const isOwner = session?.user?.email === quiz?.createdBy;

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4 mx-auto"></div>
            <p className="text-xl">Cargando quiz...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !quiz) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Error</h1>
            <p className="text-gray-700 mb-6">{error || 'Quiz no encontrado'}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-300 py-3 rounded-lg font-bold hover:bg-gray-400"
            >
              Volver al Dashboard
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">

            {/* HEADER */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white">
              <h1 className="text-4xl font-bold mb-2">{quiz.title}</h1>
              <p className="text-purple-100">{quiz.description}</p>
            </div>

            {/* CONTENT */}
            <div className="p-8">

              {/* STATS */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Preguntas</p>
                  <p className="text-3xl font-bold text-purple-600">{quiz.questions?.length || 0}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Dificultad</p>
                  <p className="text-3xl font-bold text-blue-600 capitalize">{quiz.difficulty || 'N/A'}</p>
                </div>
              </div>

              {/* QUESTIONS */}
              {quiz.questions && quiz.questions.length > 0 ? (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Preguntas del Quiz</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {quiz.questions.map((question, index) => (
                      <div key={question.id || index} className="flex items-start p-3 bg-gray-50 rounded">
                        <span className="font-bold text-purple-600 mr-3">{index + 1}.</span>
                        <span className="text-gray-700">{question.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">⚠️ Este quiz no tiene preguntas todavía</p>
                </div>
              )}

              {/* METADATA */}
              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className="text-lg font-semibold">{quiz.isPublic ? '🌐 Público' : '🔒 Privado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Preguntas por juego</p>
                    <p className="text-lg font-semibold">{quiz.settings?.questionsPerGame || quiz.questions?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-4 mt-8">
                {isOwner && (
                  <button
                    onClick={handlePlayQuiz}
                    className="bg-purple-600 text-white py-3 px-6 rounded-lg flex-1 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!quiz.questions || quiz.questions.length === 0 || startingGame}
                  >
                    {startingGame ? 'Iniciando...' : '▶️ Iniciar Juego'}
                  </button>
                )}

                <button
                  onClick={() => router.back()}
                  className="border border-gray-400 text-gray-700 py-3 px-6 rounded-lg flex-1 text-lg font-bold hover:bg-gray-100"
                >
                  ← Volver
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}