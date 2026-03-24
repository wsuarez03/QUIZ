'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';

type SavedResult = {
  id: string;
  sessionId: string;
  sessionCode: string;
  sessionStatus: string;
  quizTitle: string;
  totalQuestions: number;
  savedAt: number;
  results: Array<{
    rank: number;
    playerName: string;
    score: number;
    correctAnswers: number;
    accuracy: number;
  }>;
};

export default function SavedResultsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<SavedResult[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/results/saved');
        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || 'No se pudieron cargar los resultados guardados');
          return;
        }

        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError('Error de conexión cargando resultados guardados');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [status]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este resultado? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeleting(id);
      const res = await fetch(`/api/results/delete?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'No se pudo eliminar el resultado');
        return;
      }

      setItems(items.filter(item => item.id !== id));
    } catch (e) {
      setError('Error de conexión eliminando resultado');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Resultados Guardados</h1>

          {loading && <p>Cargando resultados...</p>}
          {error && <p className="text-red-600">{error}</p>}

          {!loading && !error && items.length === 0 && (
            <p className="text-gray-600">No hay resultados guardados todavía.</p>
          )}

          {!loading && !error && items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-semibold">{item.quizTitle}</h2>
                <div className="flex gap-3 items-center">
                  <div className="text-sm text-gray-500">
                    Guardado: {item.savedAt ? new Date(item.savedAt).toLocaleString() : '-'}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {deleting === item.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-4">
                Sesion: {item.sessionId} | Codigo: {item.sessionCode || '-'} | Preguntas: {item.totalQuestions || 0}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-3 py-2">#</th>
                      <th className="border px-3 py-2">Jugador</th>
                      <th className="border px-3 py-2">Puntos</th>
                      <th className="border px-3 py-2">Correctas</th>
                      <th className="border px-3 py-2">% Acierto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.results || []).map((row, idx) => (
                      <tr key={`${item.id}-${idx}`} className="hover:bg-purple-50">
                        <td className="border px-3 py-2">{row.rank}</td>
                        <td className="border px-3 py-2">{row.playerName}</td>
                        <td className="border px-3 py-2">{row.score}</td>
                        <td className="border px-3 py-2">{row.correctAnswers}</td>
                        <td className="border px-3 py-2">{row.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
