'use client'

import { LeaderboardEntry } from '@/types'

interface Props {
  entries: LeaderboardEntry[]
  title?: string
}

export function Leaderboard({
  entries,
  title = "Leaderboard"
}: Props) {

  const sorted = [...entries].sort((a,b)=>b.score-a.score)

  if (!sorted || sorted.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <p className="text-gray-500">
          Esperando jugadores...
        </p>
      </div>
    )
  }

  return (

<div className="bg-white rounded-lg shadow-lg p-6">

<h2 className="text-xl font-bold mb-4">
{title}
</h2>

<div className="space-y-2">

{sorted.map((player)=> (

<div
key={player.playerId}
className="flex items-center justify-between bg-gray-100 px-4 py-3 rounded-lg"
>

<div className="flex items-center gap-3">

<span className="text-lg font-bold">
#{player.rank}
</span>

<span className="font-semibold">
{player.playerName}
</span>

</div>

<div className="text-right">

<div className="font-bold">
{player.score}
</div>

<div className="text-xs text-gray-500">
{player.accuracy}% aciertos
</div>

</div>

</div>

))}

</div>

</div>

  )
}