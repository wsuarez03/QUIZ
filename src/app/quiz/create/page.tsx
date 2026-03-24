'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Question } from '@/types';

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [questionsPerGame, setQuestionsPerGame] = useState<number>(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    timeLimit: 30,
    points: 100,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddQuestion = () => {
    if (
      !currentQuestion.text ||
      !currentQuestion.options ||
      currentQuestion.options.length < 2 ||
      currentQuestion.correctAnswerIndex === undefined
    ) {
      setError('Completa todas las opciones y selecciona la respuesta correcta');
      return;
    }

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: currentQuestion.text,
      options: currentQuestion.options,
      correctAnswerIndex: currentQuestion.correctAnswerIndex,
      timeLimit: currentQuestion.timeLimit || 30,
      points: currentQuestion.points || 100,
    };

    setQuestions([...questions, newQuestion]);
    setCurrentQuestion({ timeLimit: 30, points: 100 });
    setError('');
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || ['', '', '', ''])];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const handleSaveQuiz = async () => {
    if (!title || questions.length === 0) {
      setError('Agrega un título y al menos una pregunta');
      return;
    }

    if (questionsPerGame > questions.length) {
      setError(
        `No puedes mostrar ${questionsPerGame} preguntas si solo tienes ${questions.length}`
      );
      return;
    }

    if (questionsPerGame < 1) {
      setError('Debes mostrar al menos 1 pregunta por juego');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/quizzes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          isPublic,
          questions,
          settings: {
            questionsPerGame,
            allowReplays: true,
            showCorrectAnswers: true,
            randomizeQuestions: questionsPerGame < questions.length,
            randomizeOptions: false,
          },
        }),
      });

      const data = await response.json();
      if (response.ok) {
        router.push(`/dashboard`);
      } else {
        setError(data?.message || 'Error al crear el quiz');
      }
    } catch (err) {
      setError('Error al guardar el quiz');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Crear Nuevo Quiz</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Quiz Info Section */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Información del Quiz</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título del Quiz
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Capitales del Mundo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe tu quiz..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preguntas por juego
                  {questions.length > 0 && (
                    <span className="text-gray-500 text-xs ml-2">
                      (Total: {questions.length} preguntas)
                    </span>
                  )}
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  ¿Cuántas preguntas aleatorias se mostrarán en cada juego?
                </p>
                <input
                  type="number"
                  value={questionsPerGame}
                  onChange={(e) => setQuestionsPerGame(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max={Math.max(1, questions.length)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">Hacer quiz público</span>
                </label>
              </div>
            </div>
          </div>

          {/* Add Question Section */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Agregar Pregunta</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pregunta
                </label>
                <input
                  type="text"
                  value={currentQuestion.text || ''}
                  onChange={(e) =>
                    setCurrentQuestion({ ...currentQuestion, text: e.target.value })
                  }
                  placeholder="¿Cuál es la capital de...?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opciones (4)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index}>
                      <input
                        type="text"
                        value={currentQuestion.options?.[index] || ''}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Opción ${String.fromCharCode(65 + index)}`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                      />
                      <label className="flex items-center gap-2 mt-2 text-sm">
                        <input
                          type="radio"
                          name="correct"
                          checked={currentQuestion.correctAnswerIndex === index}
                          onChange={() =>
                            setCurrentQuestion({
                              ...currentQuestion,
                              correctAnswerIndex: index,
                            })
                          }
                        />
                        <span>Respuesta correcta</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tiempo límite (segundos)
                  </label>
                  <input
                    type="number"
                    value={currentQuestion.timeLimit || 30}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        timeLimit: parseInt(e.target.value),
                      })
                    }
                    min="5"
                    max="300"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Puntos
                  </label>
                  <input
                    type="number"
                    value={currentQuestion.points || 100}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        points: parseInt(e.target.value),
                      })
                    }
                    min="10"
                    max="1000"
                    step="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>
              </div>

              <Button onClick={handleAddQuestion} className="w-full">
                Agregar Pregunta
              </Button>
            </div>
          </div>

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Preguntas ({questions.length})
              </h2>

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">
                        {idx + 1}. {q.text}
                      </h3>
                      <button
                        onClick={() => handleRemoveQuestion(q.id || "")}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      ⏱ {q.timeLimit}s | 🏆 {q.points} pts
                    </p>
                    <div className="space-y-1">
                      {q.options && q.options.map((opt, i) => (
                        <p
                          key={i}
                          className={`text-sm ${
                            i === q.correctAnswerIndex
                              ? 'text-green-600 font-semibold'
                              : 'text-gray-600'
                          }`}
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              variant="secondary"
              onClick={() => router.back()}
              className="px-8"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveQuiz}
              disabled={isLoading || !title || questions.length === 0}
              className="px-8"
            >
              {isLoading ? 'Guardando...' : 'Crear Quiz'}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
