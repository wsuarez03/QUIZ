'use client';

import { Quiz } from '@/types';
import Link from 'next/link';
import { Button } from './Button';

interface QuizCardProps {
  quiz: Quiz & { totalQuestions?: number };
  onDelete?: (quizId: string) => void;
  onEdit?: (quizId: string) => void;
}

export function QuizCard({ quiz, onDelete, onEdit }: QuizCardProps) {
  const questionCount = Array.isArray(quiz.questions)
    ? quiz.questions.length
    : Number(quiz.totalQuestions || 0);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-32 flex items-center justify-center">
        <div className="text-5xl">📚</div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{quiz.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{quiz.description}</p>

        <div className="flex gap-2 mb-4 text-sm text-gray-600">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {questionCount} Questions
          </span>
          <span className={`px-3 py-1 rounded-full ${
            quiz.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {quiz.isPublic ? 'Public' : 'Private'}
          </span>
        </div>

        <div className="flex gap-2">
          <Link href={`/quiz/${quiz.id}/play`} className="flex-1">
            <Button className="w-full">Play</Button>
          </Link>

          {onEdit && (
            <Button
              variant="secondary"
              onClick={() => onEdit(quiz.id)}
              className="flex-1"
            >
              Edit
            </Button>
          )}

          {onDelete && (
            <Button
              variant="danger"
              onClick={() => onDelete(quiz.id)}
              className="flex-1"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
