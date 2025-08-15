import React from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  onReconnect?: () => void;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
  lastConnected,
  reconnectAttempts,
  onReconnect,
  className = ''
}) => {
  const getStatusColor = () => {
    if (isConnected) return 'text-green-600';
    if (isConnecting) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (isConnected) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }

    if (isConnecting) {
      return (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    if (reconnectAttempts > 0) return `Reconnecting... (${reconnectAttempts})`;
    return 'Disconnected';
  };

  const getStatusDescription = () => {
    if (isConnected && lastConnected) {
      return `Connected since ${lastConnected.toLocaleTimeString()}`;
    }
    if (!isConnected && !isConnecting) {
      return 'Real-time features unavailable';
    }
    return '';
  };

  // Don't show anything if connected (to avoid clutter)
  if (isConnected) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={getStatusColor()}>
          {getStatusIcon()}
        </div>
        <div>
          <p className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </p>
          {getStatusDescription() && (
            <p className="text-xs text-gray-500">
              {getStatusDescription()}
            </p>
          )}
        </div>
      </div>

      {!isConnected && !isConnecting && onReconnect && (
        <button
          onClick={onReconnect}
          className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Retry
        </button>
      )}
    </div>
  );
};