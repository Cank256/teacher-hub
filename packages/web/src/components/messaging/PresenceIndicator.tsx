import React from 'react';

interface PresenceIndicatorProps {
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  status,
  lastSeen,
  size = 'md',
  showText = false,
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      default:
        if (lastSeen) {
          const now = new Date();
          const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
          
          if (diffInMinutes < 1) {
            return 'Just now';
          } else if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
          } else if (diffInMinutes < 1440) {
            const hours = Math.floor(diffInMinutes / 60);
            return `${hours}h ago`;
          } else {
            const days = Math.floor(diffInMinutes / 1440);
            return `${days}d ago`;
          }
        }
        return 'Offline';
    }
  };

  if (showText) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`${getSizeClasses()} ${getStatusColor()} rounded-full border-2 border-white`}></div>
        <span className="text-sm text-gray-600">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div 
      className={`${getSizeClasses()} ${getStatusColor()} rounded-full border-2 border-white ${className}`}
      title={getStatusText()}
    ></div>
  );
};