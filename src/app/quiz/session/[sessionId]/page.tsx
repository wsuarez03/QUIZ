"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { use, useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function GameSession({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const name = search.get("name");

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const joinedRef = useRef(false);

  // Unirse a la sesión
  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    const existingPlayerId = localStorage.getItem("playerId");
    const existingSessionId = localStorage.getItem("sessionId");
    if (existingPlayerId && existingSessionId === sessionId) {
      setPlayerId(existingPlayerId);
      setLoading(false);
      return;
    }
    async function join() {
      if (!name) {
        setError("Nombre de jugador requerido");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/game-sessions/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, name })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo unir a la sesión");
          setLoading(false);
          return;
        }
        setPlayerId(data.playerId);
        localStorage.setItem("playerId", data.playerId);
        localStorage.setItem("sessionId", data.sessionId);
      } catch (error) {
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    }
    join();
  }, [sessionId, name]);

  // Escuchar cuando el host inicia el quiz
  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSnapshot(doc(db, "game_sessions", sessionId), (snapshot) => {
      const data = snapshot.data();
      console.log("[JUGADOR] Estado de la sesión:", data?.status);
      if (data?.status === "playing") {
        console.log("[JUGADOR] Redirigiendo a play");
        const pid = playerId || localStorage.getItem("playerId") || "";
        const qs = new URLSearchParams({ name: name || "" });
        if (pid) qs.set("pid", pid);
        router.push(`/quiz/session/${sessionId}/play?${qs.toString()}`);
      }
    });
    return () => unsub();
  }, [sessionId, router, name, playerId]);

  if (loading) {
    return <div className="p-10"><p>Entrando al juego...</p></div>;
  }
  if (error) {
    return <div className="p-10 text-red-500">{error}</div>;
  }
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-4">Juego</h1>
      <p className="text-lg">Jugador: {name}</p>
      <p className="text-lg">Código: {sessionId}</p>
      <p className="text-lg">Player ID: {playerId}</p>
      <p className="mt-6 text-gray-500">Esperando que el host inicie el quiz...</p>
    </div>
  );
}
