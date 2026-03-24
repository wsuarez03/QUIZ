// Achievement types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: AchievementCriteria;
}

export interface AchievementCriteria {
  type: 'games_played' | 'perfect_score' | 'streak' | 'create_quiz' | 'speed_demon' | 'accuracy_master';
  target: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number; // 0-100
}

// Available achievements
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-game',
    name: 'Primer Juego',
    description: 'Juega tu primer quiz',
    icon: '🎮',
    criteria: { type: 'games_played', target: 1 },
  },
  {
    id: 'quiz-master',
    name: 'Maestro del Quiz',
    description: 'Juega 50 quizzes',
    icon: '🏆',
    criteria: { type: 'games_played', target: 50 },
  },
  {
    id: 'perfect-10',
    name: 'Perfección',
    description: 'Obtén 100% de precisión en un quiz',
    icon: '⭐',
    criteria: { type: 'perfect_score', target: 100 },
  },
  {
    id: 'five-streak',
    name: 'Racha Ganadora',
    description: 'Gana 5 quizzes consecutivos',
    icon: '🔥',
    criteria: { type: 'streak', target: 5 },
  },
  {
    id: 'creator',
    name: 'Creador Original',
    description: 'Crea tu primer quiz',
    icon: '✏️',
    criteria: { type: 'create_quiz', target: 1 },
  },
  {
    id: 'speed-demon',
    name: 'Demonio de Velocidad',
    description: 'Responde todas las preguntas en menos de 5 segundos cada una',
    icon: '⚡',
    criteria: { type: 'speed_demon', target: 5 },
  },
  {
    id: 'accuracy-90',
    name: 'Maestro de Precisión',
    description: 'Obtén 90% de precisión',
    icon: '🎯',
    criteria: { type: 'accuracy_master', target: 90 },
  },
];
