import { mockQuizzes, mockQuestions } from '@/lib/mockData';

type AnyObj = Record<string, any>;

const quizzesById = new Map<string, AnyObj>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeQuestions(quizId: string, quizData: AnyObj): AnyObj[] {
  const embedded = Array.isArray(quizData?.questions) ? quizData.questions : [];
  if (embedded.length) {
    return embedded.map((q: AnyObj, index: number) => ({
      id: q.id || `q-${index + 1}`,
      ...q,
      correctAnswerIndex:
        q.correctAnswerIndex !== undefined
          ? Number(q.correctAnswerIndex)
          : q.correct !== undefined
            ? Number(q.correct)
            : q.correctAnswer !== undefined && !Number.isNaN(Number(q.correctAnswer))
              ? Number(q.correctAnswer)
              : 0,
    }));
  }

  const fromMockQuestions = (mockQuestions as Record<string, AnyObj[]>)[quizId] || [];
  return fromMockQuestions.map((q: AnyObj, index: number) => ({
    id: q.id || `q-${index + 1}`,
    ...q,
    correctAnswerIndex:
      q.correctAnswerIndex !== undefined
        ? Number(q.correctAnswerIndex)
        : q.correct !== undefined
          ? Number(q.correct)
          : q.correctAnswer !== undefined && !Number.isNaN(Number(q.correctAnswer))
            ? Number(q.correctAnswer)
            : 0,
  }));
}

function initStore() {
  for (const baseQuiz of mockQuizzes) {
    const questions = normalizeQuestions(baseQuiz.id, baseQuiz as AnyObj);
    quizzesById.set(baseQuiz.id, {
      ...clone(baseQuiz),
      questions,
      totalQuestions: questions.length,
      settings: {
        ...(baseQuiz as AnyObj).settings,
        questionsPerGame: Math.min(
          Math.max(1, Number((baseQuiz as AnyObj)?.settings?.questionsPerGame || 1)),
          Math.max(1, questions.length)
        ),
      },
    });
  }
}

initStore();

export function listMockQuizzes() {
  return Array.from(quizzesById.values()).map((quiz) => clone(quiz));
}

export function getMockQuizById(id: string) {
  const quiz = quizzesById.get(id);
  return quiz ? clone(quiz) : null;
}

export function updateMockQuiz(id: string, updates: AnyObj) {
  const existing = quizzesById.get(id);
  if (!existing) return null;

  const nextQuestions = Array.isArray(updates?.questions)
    ? normalizeQuestions(id, { questions: updates.questions })
    : normalizeQuestions(id, existing);

  const merged = {
    ...existing,
    ...updates,
    questions: nextQuestions,
    totalQuestions: nextQuestions.length,
    settings: {
      ...existing.settings,
      ...(updates.settings || {}),
    },
    updatedAt: new Date(),
  };

  const maxQuestions = Math.max(1, nextQuestions.length);
  merged.settings.questionsPerGame = Math.min(
    Math.max(1, Number(merged.settings?.questionsPerGame || maxQuestions)),
    maxQuestions
  );

  quizzesById.set(id, merged);
  return clone(merged);
}
