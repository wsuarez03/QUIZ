"use client"

import { useEffect, useState, use } from "react"
import { useParams } from "next/navigation"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore"

export default function HostPage() {

  const params = useParams()
  const id = params.id as string

    type Player = {
    id: string
    name: string
    score?: number
  }

  const [players, setPlayers] = useState<Player[]>([])
  const [starting, setStarting] = useState(false)

  useEffect(() => {

    const q = query(
      collection(db, "players"),
      where("quizId", "==", id)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {

      const list: any[] = []

      snapshot.forEach((doc) => {
        list.push({
          id: doc.id,
          ...doc.data()
        })
      })

      setPlayers(list)

    })

    return () => unsubscribe()

  }, [id])


  // iniciar juego
  const startGame = async () => {

    try {

      setStarting(true)

      await fetch(`/api/game-sessions/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId: id
        })
      })

    } catch (error) {

      console.error("Error iniciando juego:", error)

    } finally {

      setStarting(false)

    }

  }

  return (

    <div className="max-w-3xl mx-auto p-10">

      <h1 className="text-3xl font-bold mb-6">
        🎮 Panel del Host
      </h1>

      <div className="mb-8">

        <button
          onClick={startGame}
          disabled={starting}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-lg shadow"
        >
          {starting ? "Iniciando..." : "🚀 Iniciar Juego"}
        </button>

      </div>

      <h2 className="text-xl font-semibold mb-4">
        Jugadores conectados ({players.length})
      </h2>

      <div className="space-y-2">

        {players.length === 0 && (
          <p className="text-gray-500">
            Esperando jugadores...
          </p>
        )}

        {players
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .map((p, index) => (

          <div
            key={p.id}
            className="border p-3 rounded-lg bg-white shadow flex justify-between"
          >
            <span>
              {index + 1}. {p.name}
            </span>

            <span className="font-bold text-purple-600">
              {p.score ?? 0} pts
            </span>

          </div>

        ))}

      </div>

    </div>

  )

}