// =========================
// User types
// =========================
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date | string;
}

// =========================
// Quiz types
// =========================
export interface Question {

  id?: string

  // formato A y B
  text?: string
  options?: string[]

  // formato C
  question?: string
  answers?: string[]

  // formas de respuesta correcta
  correctAnswerIndex?: number
  correct?: number
  correctAnswer?: string

  timeLimit?: number

  points?: number

}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: Date | string;
  questions: Question[];
  isPublic: boolean;

  visibility: "public" | "private" | "link";

  settings: {
    allowReplays: boolean;
    showCorrectAnswers: boolean;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
    questionsPerGame?: number;
  };
}

// =========================
// Game session types
// =========================
export interface GameSession {
  id: string
  code: string
  quizId: string
  currentQuestion: number
  started: boolean
}

// =========================
// Player types
// =========================
export interface Player {
  id: string
  name: string
  score: number
}

// =========================
// Answer types
// =========================
export interface PlayerAnswer {
  playerId: string;
  questionId: string;

  selectedIndex: number;

  isCorrect: boolean;

  timeTaken: number;
}

// =========================
// Leaderboard types
// =========================
export interface LeaderboardEntry {
  rank: number;

  playerId: string;
  playerName: string;

  score: number;

  correctAnswers: number;
  accuracy: number;
}

