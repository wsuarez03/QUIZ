'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function PlayQuizPage() {

  const params = useParams()
  const router = useRouter()

  const id = params?.id as string

  useEffect(() => {

    if (!id) return

    const createSession = async () => {

      try {

        const res = await fetch('/api/game-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            quizId: id
          })
        })

        const data = await res.json()

        if (!res.ok) {

          console.error("API ERROR:", data)
          const message =
            res.status === 404
              ? (data.error || 'El quiz no existe o no se puede leer')
              : (data.error || 'Error creando sesión')
          throw new Error(message)

        }

        router.push(`/host/${data.sessionId}`)

      } catch (err) {

        console.error("ERROR:", err)
        alert('No se pudo iniciar la sesión')

      }

    }

    createSession()

  }, [id, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg">Creando sesión...</p>
    </div>
  )

}