'use client'

import { useEffect, useState } from 'react'
import { Question } from '@/types'

interface Props {
  question: Question
  questionNumber: number
  totalQuestions: number
  onAnswer: (index: number, time: number) => void
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer
}: Props) {

  const timeLimit = question.timeLimit ?? 20

  const [timeLeft,setTimeLeft] = useState(timeLimit)
  const [selected,setSelected] = useState<number | null>(null)
  const [answered,setAnswered] = useState(false)

  // ✅ compatibilidad con todos los formatos
  const options = question.options || question.answers || []

  const correctIndex =
    typeof question.correctAnswerIndex === "number"
      ? question.correctAnswerIndex
      : typeof (question as any).correct === "number"
      ? (question as any).correct
      : options.findIndex(
          (o)=> o === (question as any).correctAnswer
        )

  useEffect(()=>{

    setTimeLeft(timeLimit)
    setSelected(null)
    setAnswered(false)

  },[question.id])

  useEffect(()=>{

    if(answered) return

    if(timeLeft === 0){

      setAnswered(true)
      onAnswer(-1,timeLimit)
      return

    }

    const timer = setInterval(()=>{
      setTimeLeft(t=>t-1)
    },1000)

    return ()=>clearInterval(timer)

  },[timeLeft,answered,timeLimit,onAnswer])

  const select = (i:number)=>{

    if(answered) return

    setSelected(i)
    setAnswered(true)

    const timeUsed = timeLimit - timeLeft

    onAnswer(i,timeUsed)

  }

  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500"
  ]

  return(

<div className="max-w-3xl mx-auto">

<h2 className="text-xl font-bold mb-4">
Pregunta {questionNumber}/{totalQuestions}
</h2>

<div className="w-full bg-gray-200 h-3 rounded mb-6">
<div
className="bg-green-500 h-3 rounded"
style={{width:`${(timeLeft/timeLimit)*100}%`}}
/>
</div>

<h3 className="text-2xl font-semibold mb-6">
{question.text || question.question}
</h3>

<div className="grid grid-cols-2 gap-4">

{options.map((opt,i)=>{

const correct = i === correctIndex

let style = colors[i] ?? "bg-gray-500"

if(answered){

if(i === selected){

style = correct
? "bg-green-600"
: "bg-red-600"

}else if(correct){

style = "bg-green-500"

}else{

style = "bg-gray-400"

}

}

return(

<button
key={i}
onClick={()=>select(i)}
className={`${style} text-white p-6 rounded-2xl shadow-lg text-lg font-semibold`}
>

{opt}

</button>

)

})}

</div>

</div>

)

}