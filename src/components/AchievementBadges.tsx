'use client';

import { ACHIEVEMENTS } from '@/lib/achievements';
import type { UserAchievement } from '@/lib/achievements';

interface AchievementBadgeProps {
  unlockedAchievements?: UserAchievement[];
}

export function AchievementBadges({ unlockedAchievements = [] }: AchievementBadgeProps) {
  const unlockedIds = unlockedAchievements.map((a) => a.achievementId);

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Logros Desbloqueados</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlockedIds.includes(achievement.id);

          return (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg text-center transition ${
                isUnlocked
                  ? 'bg-gradient-to-br from-yellow-100 to-yellow-50 border-2 border-yellow-400'
                  : 'bg-gray-100 border-2 border-gray-300 opacity-50'
              }`}
            >
              <div className="text-4xl mb-2">{achievement.icon}</div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">{achievement.name}</h3>
              <p className="text-xs text-gray-600">{achievement.description}</p>

              {isUnlocked && (
                <p className="text-xs text-green-600 font-semibold mt-2">✓ Desbloqueado</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          🎯 Tienes {unlockedAchievements.length} de {ACHIEVEMENTS.length} logros desbloqueados
        </p>
      </div>
    </div>
  );
}
