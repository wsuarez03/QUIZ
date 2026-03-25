import { NextResponse } from "next/server"
import { adminDbInstance } from "@/lib/firebaseAdmin"
import { db } from "@/lib/firebase"

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  serverTimestamp
} from "firebase/firestore"

type JoinBody = {
  code?: string
  sessionId?: string
  name?: string
}

export async function POST(req: Request) {
  let body: JoinBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Body inválido" },
      { status: 400 }
    )
  }

  // Prefer Admin SDK, but fallback to client SDK if it fails in production.
  if (adminDbInstance) {
    try {
      return await handleWithAdmin(body)
    } catch (error) {
      console.error("Error en join (Admin), intentando fallback:", error)
    }
  }

  try {
    return await handleWithClientSDK(body)
  } catch (error) {
    console.error("Error en join (Client fallback):", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

async function handleWithAdmin(body: JoinBody): Promise<NextResponse> {
  const sessionCode = body?.code?.toString().trim()
  const sessionIdFromBody = body?.sessionId?.toString().trim()
  const playerName = body?.name?.toString().trim()

  if ((!sessionCode && !sessionIdFromBody) || !playerName) {
    return NextResponse.json({ error: "Código o ID de sesión y nombre son obligatorios" }, { status: 400 })
  }

  let sessionId = ""
  let sessionData: any = null

  if (sessionCode) {
    const snap = await adminDbInstance.collection("game_sessions").where("code", "==", sessionCode).limit(1).get()
    if (!snap.empty) {
      sessionId = snap.docs[0].id
      sessionData = snap.docs[0].data()
    }
  }

  if (!sessionData && sessionIdFromBody) {
    const snap = await adminDbInstance.collection("game_sessions").doc(sessionIdFromBody).get()
    if (snap.exists) {
      sessionId = snap.id
      sessionData = snap.data()
    }
  }

  if (!sessionData) {
    return NextResponse.json({ error: "Código de sesión inválido" }, { status: 404 })
  }

  if (sessionData.status !== "waiting" && sessionData.status !== "playing") {
    return NextResponse.json({ error: "No es posible unirse a la sesión en este momento" }, { status: 400 })
  }

  const playersRef = adminDbInstance.collection("game_sessions").doc(sessionId).collection("players")
  const existing = await playersRef.where("name", "==", playerName).limit(1).get()

  if (!existing.empty) {
    return NextResponse.json({ success: true, playerId: existing.docs[0].id, sessionId })
  }

  const newPlayer = await playersRef.add({
    name: playerName,
    score: 0,
    answers: [],
    joinedAt: new Date()
  })

  return NextResponse.json({ success: true, playerId: newPlayer.id, sessionId })
}

async function handleWithClientSDK(body: JoinBody): Promise<NextResponse> {

    const sessionCode = body?.code?.toString().trim()
    const sessionIdFromBody = body?.sessionId?.toString().trim()
    const playerName = body?.name?.toString().trim()

    if ((!sessionCode && !sessionIdFromBody) || !playerName) {
      return NextResponse.json(
        { error: "Código o ID de sesión y nombre son obligatorios" },
        { status: 400 }
      )
    }

    // 🔎 buscar sesión por código o por ID
    let sessionId = ""
    let sessionData: any = null

    if (sessionCode) {
      const sessionQuery = query(
        collection(db, "game_sessions"),
        where("code", "==", sessionCode)
      )

      const sessionSnapshot = await getDocs(sessionQuery)

      if (!sessionSnapshot.empty) {
        const sessionDoc = sessionSnapshot.docs[0]
        sessionId = sessionDoc.id
        sessionData = sessionDoc.data()
      }
    }

    if (!sessionData && sessionIdFromBody) {
      const sessionRef = doc(db, "game_sessions", sessionIdFromBody)
      const sessionSnap = await getDoc(sessionRef)

      if (sessionSnap.exists()) {
        sessionId = sessionSnap.id
        sessionData = sessionSnap.data()
      }
    }

    if (!sessionData) {
      return NextResponse.json(
        { error: "Código de sesión inválido" },
        { status: 404 }
      )
    }

    // 🚫 validar estado
    // Permitir unirse si la sesión está en 'waiting' o 'playing'
    if (sessionData.status !== "waiting" && sessionData.status !== "playing") {
      return NextResponse.json(
        { error: "No es posible unirse a la sesión en este momento" },
        { status: 400 }
      )
    }

    // 📂 referencia a subcolección players
    const playersRef = collection(db, "game_sessions", sessionId, "players")

    // 🔎 evitar nombres duplicados
    const playerQuery = query(
      playersRef,
      where("name", "==", playerName)
    )

    const playerSnapshot = await getDocs(playerQuery)

    if (!playerSnapshot.empty) {

      const existingPlayer = playerSnapshot.docs[0]

      return NextResponse.json({
        success: true,
        playerId: existingPlayer.id,
        sessionId
      })
    }

    // 👤 crear jugador dentro de la sesión
    const playerRef = await addDoc(
      playersRef,
      {
        name: playerName,
        score: 0,
        answers: [],
        joinedAt: serverTimestamp()
      }
    )

    return NextResponse.json({
      success: true,
      playerId: playerRef.id,
      sessionId
    })

}