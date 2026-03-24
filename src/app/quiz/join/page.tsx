'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/Button'

export default function JoinGamePage() {

  const router = useRouter()

  const [code,setCode] = useState('')
  const [playerName,setPlayerName] = useState('')
  const [error,setError] = useState('')
  const [isLoading,setIsLoading] = useState(false)

  const handleJoinGame = async () => {

    const cleanCode = code.trim()
    const cleanName = playerName.trim()

    if(!cleanCode || !cleanName){
      setError('Completa el código y tu nombre')
      return
    }

    setIsLoading(true)
    setError('')

    try{

      const res = await fetch(
        '/api/game-sessions/join',
        {
          method:'POST',
          headers:{
            'Content-Type':'application/json'
          },
          body: JSON.stringify({
            code: cleanCode,
            name: cleanName
          })
        }
      )

      const data = await res.json()

      if(!res.ok){

        setError(
          data.error || 'Código de sesión no encontrado'
        )

        return
      }

      // guardar playerId para la sesión
      localStorage.setItem(
        'playerId',
        data.playerId
      )

      // redirigir al lobby / sesión usando el sessionId real
      router.push(
        `/quiz/session/${data.sessionId}?name=${encodeURIComponent(cleanName)}`
      )

    }catch(err){

      console.error(err)

      setError('Error al unirse al juego')

    }finally{

      setIsLoading(false)

    }

  }

  return(
<>
<Navbar/>

<main className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center px-4">

<div className="bg-white rounded-lg shadow-2xl w-full max-w-md">

<div className="p-8">

<h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
🎮 Unirse a Quiz
</h1>

{error && (

<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
{error}
</div>

)}

<div className="space-y-4">

<div>

<label className="block text-sm font-semibold text-gray-700 mb-2">
Código de Sesión
</label>

<input
type="text"
value={code}
onChange={(e)=>setCode(e.target.value)}
placeholder="Ej: ABC123"
maxLength={6}
className="w-full px-4 py-3 text-center text-2xl font-bold border-2 border-purple-600 rounded-lg outline-none uppercase"
/>

</div>

<div>

<label className="block text-sm font-semibold text-gray-700 mb-2">
Tu Nombre
</label>

<input
type="text"
value={playerName}
onChange={(e)=>setPlayerName(e.target.value)}
placeholder="¿Cómo te llamas?"
className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none"
/>

</div>

<Button
onClick={handleJoinGame}
disabled={isLoading}
size="lg"
className="w-full"
>

{isLoading
? 'Uniéndose...'
: 'Unirse al Quiz'
}

</Button>

</div>

<p className="text-center text-gray-600 mt-6">

¿No tienes código?{' '}

<button
onClick={()=>router.push('/dashboard')}
className="text-purple-600 font-semibold hover:text-purple-700"
>

Ir a Dashboard

</button>

</p>

</div>

</div>

</main>

</>
  )

}