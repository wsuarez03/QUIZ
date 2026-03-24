"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Navbar } from "@/components/Navbar";

function leaderboard(answers:any[]) {

 const scores:any = {};

 answers.forEach((a)=>{

  if(!scores[a.playerName])
    scores[a.playerName] = 0;

  scores[a.playerName] += a.score;

 });

 return Object.entries(scores)
  .sort((a:any,b:any)=>b[1]-a[1]);

}

export default function LeaderboardPage(){

 const params = useParams();
 const sessionId = params.sessionId as string;

 const [answers,setAnswers] = useState<any[]>([]);

 useEffect(()=>{

  const q = query(
   collection(db,"answers"),
   where("sessionId","==",sessionId)
  );

  const unsub = onSnapshot(q,(snap)=>{

   const data = snap.docs.map(d=>d.data());

   setAnswers(data);

  });

  return ()=>unsub();

 },[sessionId]);

 const ranking = leaderboard(answers);

 return (
  <>
   <Navbar/>

   <main className="min-h-screen p-10">

    <h1 className="text-3xl font-bold mb-8">
     🏆 Leaderboard
    </h1>

    <div className="max-w-xl">

     {ranking.map((r:any,i:number)=>(
      <div
       key={i}
       className="flex justify-between border-b p-3 text-lg"
      >
       <span>
        {i+1}. {r[0]}
       </span>

       <span className="font-bold">
        {r[1]} pts
       </span>
      </div>
     ))}

    </div>

   </main>
  </>
 );
}
