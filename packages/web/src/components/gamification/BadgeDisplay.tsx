import React from 'react';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'contribution' | 'engagement' | 'achievement' | 'milestone';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  earnedAt?: Date;
}

interface BadgeDisplayProps {
  badge: Badge;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  earned?: boolean;
}

const rarityColors = {
  common: 'bg-gray-100 border-gray-300 text-gray-700',
  uncommon: 'bg-green-100 border-green-300 text-green-700',
  rare: 'bg-blue-100 border-blue-300 text-blue-700',
  epic: 'bg-purple-100 border-purple-300 text-purple-700',
  legendary: 'bg-yellow-100 border-yellow-300 text-yellow-700'
};

const sizeClasses = {
  small: 'w-12 h-12 text-lg',
  medium: 'w-16 h-16 text-2xl',
  large: 'w-24 h-24 text-4xl'
};

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badge,
  size = 'medium',
  showDetails = false,
  earned = false
}) => {
  const rarityClass = rarityColors[badge.rarity];
  const sizeClass = sizeClasses[size];
  const opacityClass = earned ? 'opacity-100' : 'opacity-50';

  return (
    <div className={`relative ${showDetails ? 'max-w-sm' : ''}`}>
      <div
        className={`
          ${sizeClass} ${rarityClass} ${opacityClass}
          rounded-full border-2 flex items-center justify-center
          transition-all duration-200 hover:scale-105
          ${!earned ? 'grayscale' : ''}
        `}
        title={badge.description}
      >
        <span className="select-none">{badge.icon}</span>
      </div>
      
      {showDetails && (
        <div className="mt-2 text-center">
          <h4 className="font-semibold text-sm text-gray-900">{badge.name}</h4>
          <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
          <div className="flex items-center justify-center mt-2 space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${rarityClass}`}>
              {badge.rarity}
            </span>
            <span className="text-xs text-gray-500">{badge.points} pts</span>
          </div>
          {earned && badge.earnedAt && (
            <p className="text-xs text-gray-500 mt-1">
              Earned {new Date(badge.earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface BadgeGridProps {
  badges: Badge[];
  earnedBadgeIds?: string[];
  showDetails?: boolean;
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({
  badges,
  earnedBadgeIds = [],
  showDetails = true
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {badges.map(badge => (
        <BadgeDisplay
          key={badge.id}
          badge={badge}
          earned={earnedBadgeIds.includes(badge.id)}
          showDetails={showDetails}
        />
      ))}
    </div>
  );
};