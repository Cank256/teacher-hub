import React, { useState, useEffect } from 'react';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  fullName: string;
  points: number;
  badges: number;
  rank: number;
  avatar?: string;
}

interface LeaderboardProps {
  timeframe?: 'weekly' | 'monthly' | 'all_time';
  limit?: number;
  currentUserId?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  timeframe = 'all_time',
  limit = 50,
  currentUserId
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedTimeframe, limit]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      // This would be replaced with actual API call
      const mockEntries: LeaderboardEntry[] = [
        {
          userId: '1',
          username: 'teacher_mary',
          fullName: 'Mary Nakato',
          points: 1250,
          badges: 8,
          rank: 1,
          avatar: '👩‍🏫'
        },
        {
          userId: '2',
          username: 'prof_john',
          fullName: 'John Mukasa',
          points: 1100,
          badges: 6,
          rank: 2,
          avatar: '👨‍🏫'
        },
        {
          userId: '3',
          username: 'teacher_sarah',
          fullName: 'Sarah Nambi',
          points: 950,
          badges: 5,
          rank: 3,
          avatar: '👩‍🏫'
        }
      ];
      setEntries(mockEntries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-600 bg-yellow-50';
      case 2:
        return 'text-gray-600 bg-gray-50';
      case 3:
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-700 bg-white';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Leaderboard</h3>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as 'weekly' | 'monthly' | 'all_time')}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className={`
              p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors
              ${entry.userId === currentUserId ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
            `}
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
              ${getRankColor(entry.rank)}
            `}>
              {getRankIcon(entry.rank)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{entry.avatar}</span>
                <div>
                  <p className="font-medium text-gray-900 truncate">
                    {entry.fullName}
                  </p>
                  <p className="text-sm text-gray-500">@{entry.username}</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="font-semibold text-gray-900">{entry.points.toLocaleString()} pts</p>
              <p className="text-sm text-gray-500">{entry.badges} badges</p>
            </div>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>No leaderboard data available yet.</p>
          <p className="text-sm mt-1">Start contributing to earn your place!</p>
        </div>
      )}
    </div>
  );
};