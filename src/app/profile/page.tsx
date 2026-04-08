'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { AchievementBadges } from '@/components/AchievementBadges';
import type { UserAchievement } from '@/lib/achievements';

type SavedGameSession = {
  id: string;
  quizTitle: string;
  savedAt: number;
  participantCount: number;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [stats, setStats] = useState({ gamesPlayed: 0, quizzesCreated: 0, totalPoints: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchAchievements();
      // Aquí se podrían cargar más estadísticas
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;

    const loadSavedResults = async () => {
      try {
        const res = await fetch('/api/results/saved', { credentials: 'include' });

        if (!res.ok) {
          console.error('Error loading saved results from API:', res.status);
          setResults([]);
          setStats((prev) => ({
            ...prev,
            gamesPlayed: 0,
          }));
          return;
        }

        const data = await res.json();
        const entries = (Array.isArray(data) ? data : [])
          .map((item: any) => ({
            id: String(item.id || ''),
            quizTitle: item.quizTitle || 'Quiz Sin Titulo',
            savedAt: Number(item.savedAt || 0),
            participantCount: Array.isArray(item.results) ? item.results.length : 0,
          }))
          .sort((a: SavedGameSession, b: SavedGameSession) => b.savedAt - a.savedAt);

        setResults(entries);
        setStats((prev) => ({
          ...prev,
          gamesPlayed: entries.length,
        }));
      } catch (error) {
        console.error('Error loading saved results from API:', error);
      }
    };

    loadSavedResults();
  }, [session]);

  const fetchAchievements = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/achievements');
      if (res.ok) {
        const data = await res.json();
        setAchievements(data);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando perfil...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-3xl">
                👤
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{session?.user?.name}</h1>
                <p className="text-gray-600">{session?.user?.email}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-4xl font-bold text-purple-600 mb-2">{stats.gamesPlayed}</p>
              <p className="text-gray-600">Juegos Jugados</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-4xl font-bold text-blue-600 mb-2">{stats.quizzesCreated}</p>
              <p className="text-gray-600">Quizzes Creados</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-4xl font-bold text-green-600 mb-2">{stats.totalPoints.toLocaleString()}</p>
              <p className="text-gray-600">Puntos Totales</p>
            </div>
          </div>

          {/* Resultado del usuario */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Historial de Partidas</h2>
            {results.length === 0 ? (
              <p className="text-gray-500">Aún no has guardado partidas todavía.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-3 py-2">Nombre Del Quiz</th>
                      <th className="border px-3 py-2">Fecha</th>
                      <th className="border px-3 py-2">Participantes</th>
                      <th className="border px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((item, idx) => (
                      <tr key={idx} className="hover:bg-purple-50">
                        <td className="border px-3 py-2">{item.quizTitle}</td>
                        <td className="border px-3 py-2">
                          {item.savedAt ? new Date(item.savedAt).toLocaleString() : '-'}
                        </td>
                        <td className="border px-3 py-2">{item.participantCount}</td>
                        <td className="border px-3 py-2">
                          <button
                            onClick={() => router.push(`/profile/results`)}
                            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Achievements */}
          <AchievementBadges unlockedAchievements={achievements} />
        </div>
      </main>
    </>
  );
}
