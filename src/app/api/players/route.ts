import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {

  try {

    const { sessionId, name } = await req.json();

    if (!sessionId || !name) {
      return NextResponse.json(
        { error: "Datos incompletos" },
        { status: 400 }
      );
    }

    const playerRef = await addDoc(
      collection(db, "players"),
      {
        name,
        sessionCode: sessionId,
        score: 0,
        answers: []
      }
    );

    return NextResponse.json({
      id: playerRef.id,
      name
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { error: "Error al crear jugador" },
      { status: 500 }
    );

  }

}