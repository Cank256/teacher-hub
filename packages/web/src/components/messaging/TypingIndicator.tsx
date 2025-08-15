import React from 'react';

interface TypingIndicatorProps {
  typingUsers: string[];
  getUserName?: (userId: string) => string;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  getUserName = (userId) => `User ${userId}`,
  className = ''
}) => {
  if (typingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${getUserName(typingUsers[0])} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${getUserName(typingUsers[0])} and ${getUserName(typingUsers[1])} are typing...`;
    } else {
      return `${getUserName(typingUsers[0])}, ${getUserName(typingUsers[1])}, and ${typingUsers.length - 2} others are typing...`;
    }
  };

  return (
    <div className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
};