import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Question } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function calculateEloPoints(
  basePoints: number,
  isCorrect: boolean,
  timeTaken: number,
  timeLimit: number,
  rank: number
): number {
  if (!isCorrect) return 0;

  let points = basePoints;

  // Bonus for speed (up to 50% bonus)
  const timeBonus = (1 - timeTaken / timeLimit) * 0.5;
  points *= 1 + Math.max(0, timeBonus);

  // Reduce points based on rank (leaderboard position)
  const rankPenalty = (rank - 1) * 0.05;
  points *= Math.max(0.5, 1 - rankPenalty);

  return Math.round(points);
}

/**
 * Selecciona N preguntas al azar de un array de preguntas
 * Si count >= preguntas totales, devuelve todas las preguntas en orden aleatorio
 */
export function getRandomQuestions(questions: Question[], count: number): Question[] {
  if (count >= questions.length) {
    // Si pedimos más preguntas de las que hay, devolvemos todas pero randomizadas
    return [...questions].sort(() => Math.random() - 0.5);
  }
  // Shufflear y tomar los primeros N
  return [...questions].sort(() => Math.random() - 0.5).slice(0, count);
}
