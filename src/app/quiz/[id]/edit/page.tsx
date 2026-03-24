'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Question } from '@/types';

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [questionsPerGame, setQuestionsPerGame] = useState<number>(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    timeLimit: 30,
    points: 100,
    options: ['', '', '', ''],
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!quizId) return;

    async function loadQuiz() {
      try {
        setIsFetching(true);
        const res = await fetch(`/api/quizzes/${quizId}`, { credentials: 'include' });
        const data = await res.json();

        if (!res.ok) {
          setError(data?.message || 'No se pudo cargar el quiz');
          return;
        }

        setTitle(data?.title || '');
        setDescription(data?.description || '');
        setIsPublic(Boolean(data?.isPublic));

        const loadedQuestions = Array.isArray(data?.questions) ? data.questions : [];
        setQuestions(loadedQuestions);

        const qpg = Number(data?.settings?.questionsPerGame || loadedQuestions.length || 1);
        setQuestionsPerGame(Math.min(Math.max(1, qpg), Math.max(1, loadedQuestions.length || 1)));
      } catch (e) {
        setError('Error cargando quiz');
      } finally {
        setIsFetching(false);
      }
    }

    loadQuiz();
  }, [quizId]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || ['', '', '', ''])];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const handleAddQuestion = () => {
    if (
      !currentQuestion.text ||
      !currentQuestion.options ||
      currentQuestion.options.filter((o) => o?.trim()).length < 2 ||
      currentQuestion.correctAnswerIndex === undefined
    ) {
      setError('Completa la pregunta, al menos 2 opciones y marca la correcta');
      return;
    }

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: currentQuestion.text,
      options: currentQuestion.options,
      correctAnswerIndex: currentQuestion.correctAnswerIndex,
      timeLimit: Number(currentQuestion.timeLimit || 30),
      points: Number(currentQuestion.points || 100),
    };

    setQuestions((prev) => [...prev, newQuestion]);
    setCurrentQuestion({ timeLimit: 30, points: 100, options: ['', '', '', ''] });
    setError('');
  };

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const options = [...(q.options || ['', '', '', ''])];
        options[optionIndex] = value;
        return { ...q, options };
      })
    );
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveQuiz = async () => {
    if (!title || questions.length === 0) {
      setError('Agrega un titulo y al menos una pregunta');
      return;
    }

    if (questionsPerGame > questions.length) {
      setError(`No puedes mostrar ${questionsPerGame} preguntas si solo tienes ${questions.length}`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
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
        router.push('/dashboard');
      } else {
        setError(data?.message || 'Error al actualizar el quiz');
      }
    } catch (e) {
      setError('Error al actualizar el quiz');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">Cargando quiz...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Editar Quiz</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-8 mb-8 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Titulo</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Descripcion</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Preguntas por juego</label>
              <input
                type="number"
                value={questionsPerGame}
                onChange={(e) => setQuestionsPerGame(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max={Math.max(1, questions.length)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-gray-700">Hacer quiz publico</span>
            </label>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Agregar Pregunta Nueva</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={currentQuestion.text || ''}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                placeholder="Texto de la pregunta"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />

              <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index}>
                    <input
                      type="text"
                      value={currentQuestion.options?.[index] || ''}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Opcion ${String.fromCharCode(65 + index)}`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <label className="flex items-center gap-2 mt-2 text-sm">
                      <input
                        type="radio"
                        name="new-correct"
                        checked={currentQuestion.correctAnswerIndex === index}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswerIndex: index })}
                      />
                      Correcta
                    </label>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={Number(currentQuestion.timeLimit || 30)}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, timeLimit: Number(e.target.value) })}
                  min="5"
                  max="300"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  value={Number(currentQuestion.points || 100)}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: Number(e.target.value) })}
                  min="10"
                  max="1000"
                  step="10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <Button onClick={handleAddQuestion} className="w-full">Agregar Pregunta</Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Preguntas ({questions.length})</h2>
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id || idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Pregunta {idx + 1}</h3>
                    <button
                      onClick={() => removeQuestion(idx)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>

                  <input
                    type="text"
                    value={q.text || q.question || ''}
                    onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
                  />

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[0, 1, 2, 3].map((optIdx) => (
                      <div key={optIdx}>
                        <input
                          type="text"
                          value={q.options?.[optIdx] || ''}
                          onChange={(e) => updateQuestionOption(idx, optIdx, e.target.value)}
                          placeholder={`Opcion ${String.fromCharCode(65 + optIdx)}`}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <label className="flex items-center gap-2 mt-2 text-sm">
                          <input
                            type="radio"
                            name={`correct-${idx}`}
                            checked={Number(q.correctAnswerIndex) === optIdx}
                            onChange={() => updateQuestion(idx, { correctAnswerIndex: optIdx })}
                          />
                          Correcta
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={Number(q.timeLimit || 30)}
                      onChange={(e) => updateQuestion(idx, { timeLimit: Number(e.target.value) })}
                      min="5"
                      max="300"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      value={Number(q.points || 100)}
                      onChange={(e) => updateQuestion(idx, { points: Number(e.target.value) })}
                      min="10"
                      max="1000"
                      step="10"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button variant="secondary" onClick={() => router.back()} className="px-8">
              Cancelar
            </Button>
            <Button onClick={handleSaveQuiz} disabled={isLoading || !title || questions.length === 0} className="px-8">
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
