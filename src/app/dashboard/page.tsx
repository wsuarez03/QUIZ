'use client';

import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { QuizCard } from '@/components/QuizCard';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Quiz } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('public');
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzesFromClient = useCallback(async () => {
    const snap = await getDocs(collection(db, 'quizzes'));

    const all = snap.docs.map((d) => {
      const data: any = d.data();
      const totalQuestions = Array.isArray(data.questions)
        ? data.questions.length
        : Number(data.totalQuestions || data.settings?.questionsPerGame || 0);

      return {
        id: d.id,
        ...data,
        questions: data.questions ?? [],
        totalQuestions,
      } as Quiz;
    });

    if (activeTab === 'public') {
      return all.filter((q: any) => q.isPublic === true || q.isPublic === 'true');
    }

    const ownerId = String(session?.user?.id || '').toLowerCase();
    const ownerEmail = String(session?.user?.email || '').toLowerCase();

    return all.filter((q: any) => {
      const createdBy = String((q as any).createdBy || '').toLowerCase();
      return createdBy === ownerId || createdBy === ownerEmail;
    });
  }, [activeTab, session?.user?.email, session?.user?.id]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const fetchQuizzes = useCallback(async () => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const endpoint =
        activeTab === 'my'
          ? '/api/quizzes/my'
          : '/api/quizzes/public';

      const res = await fetch(endpoint, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }

        setError(`Error loading quizzes (${res.status})`);
        setQuizzes([]);
        return;
      }

      const data = await res.json();

      if (Array.isArray(data)) {
        if (data.length > 0) {
          setQuizzes(data);
        } else {
          const clientData = await fetchQuizzesFromClient();
          setQuizzes(clientData);
        }
      } else {
        console.error('Invalid response:', data);
        const clientData = await fetchQuizzesFromClient();
        setQuizzes(clientData);
      }

    } catch (error) {
      console.error('Error fetching quizzes:', error);
      try {
        const clientData = await fetchQuizzesFromClient();
        setQuizzes(clientData);
        if (clientData.length === 0) {
          setError('No se encontraron quizzes para este usuario.');
        }
      } catch {
        setError('Failed to load quizzes');
        setQuizzes([]);
      }
    } finally {
      setIsLoading(false);
    }

  }, [activeTab, fetchQuizzesFromClient, session?.user, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchQuizzes();
    }
  }, [status, activeTab, fetchQuizzes]);

  const handleDelete = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  };

  const handleEdit = (quizId: string) => {
    router.push(`/quiz/${quizId}/edit`);
  };

  if (status === 'loading' || isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 py-12">
        <div className="max-w-7xl mx-auto px-4">

          <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900">
              {activeTab === 'my' ? 'My Quizzes' : 'Public Quizzes'}
            </h1>

            <Link href="/quiz/create">
              <Button size="lg">+ Crear Quiz</Button>
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ⚠️ {error}
            </div>
          )}

          <div className="mb-4 text-sm text-gray-600">
            Usuario activo: <span className="font-semibold">{session?.user?.email || 'sin email'}</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('my')}
              className={`pb-4 px-4 font-semibold transition ${
                activeTab === 'my'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Quizzes
            </button>

            <button
              onClick={() => setActiveTab('public')}
              className={`pb-4 px-4 font-semibold transition ${
                activeTab === 'public'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Public Quizzes
            </button>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                No quizzes yet
              </h2>

              <p className="text-gray-600 mb-6">
                {activeTab === 'my'
                  ? 'No tienes quizzes creados con este usuario. Prueba la pestana Public Quizzes.'
                  : 'No public quizzes available yet.'}
              </p>

              {activeTab === 'my' && (
                <Link href="/quiz/create">
                  <Button>Crea tu Primer Quiz</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  onDelete={activeTab === 'my' ? handleDelete : undefined}
                  onEdit={activeTab === 'my' ? handleEdit : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}