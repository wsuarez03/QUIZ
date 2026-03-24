import { NextRequest, NextResponse } from "next/server"
import { firestore } from "firebase-admin"
import { adminDbInstance, isConfigured } from "@/lib/firebaseAdmin"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(request: NextRequest) {
  try {

    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!session.user.email) {
      return NextResponse.json(
        { message: "Invalid user session" },
        { status: 401 }
      )
    }

    if (!isConfigured || !adminDbInstance) {
      return NextResponse.json(
        { message: "Firebase Admin no está configurado" },
        { status: 500 }
      )
    }

    const body = await request.json()

    const {
      title,
      description,
      isPublic,
      questions,
      settings
    } = body

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json(
        { message: "Title and questions are required" },
        { status: 400 }
      )
    }

    const questionCount = Array.isArray(questions) ? questions.length : 0;
    const questionsPerGame = Math.min(
      Math.max(1, Number(settings?.questionsPerGame || questionCount || 1)),
      Math.max(1, questionCount)
    );

    const quizData = {
      title,
      description: description || "",
      createdBy: session.user.email,
      createdAt: firestore.FieldValue.serverTimestamp(),
      questions,
      isPublic: isPublic ?? false,
      visibility: isPublic ? "public" : "private",
      settings: {
        questionsPerGame,
        allowReplays: settings?.allowReplays ?? true,
        showCorrectAnswers: settings?.showCorrectAnswers ?? true,
        randomizeQuestions: settings?.randomizeQuestions ?? false,
        randomizeOptions: settings?.randomizeOptions ?? false
      }
    }

    const newQuizRef = await adminDbInstance
      .collection("quizzes")
      .add(quizData)

    return NextResponse.json(
      {
        id: newQuizRef.id,
        message: "Quiz created successfully"
      },
      { status: 201 }
    )

  } catch (error: any) {

    console.error("Error creating quiz:", error)

    let message = error?.message || "Internal server error"

    if (message.includes("PERMISSION_DENIED")) {
      return NextResponse.json(
        { message: "Firestore permission denied" },
        { status: 403 }
      )
    }

    if (
      message.includes("DECODER routines::unsupported") ||
      message.includes("Getting metadata from plugin failed")
    ) {
      message =
        "Firestore gRPC error. Usa Node 18 o Node 20 para evitar problemas con OpenSSL."
    }

    return NextResponse.json(
      { message },
      { status: 500 }
    )
  }
}