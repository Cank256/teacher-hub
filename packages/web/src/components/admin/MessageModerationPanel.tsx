import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface FlaggedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  content: string;
  timestamp: string;
  status: 'flagged' | 'reviewed' | 'hidden' | 'deleted';
  reports: MessageReport[];
  context: MessageContext[];
}

interface MessageReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reason: 'harassment' | 'spam' | 'inappropriate' | 'threat' | 'other';
  description: string;
  createdAt: string;
}

interface MessageContext {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isReported: boolean;
}

interface MessageModerationPanelProps {
  onClose?: () => void;
}

export const MessageModerationPanel: React.FC<MessageModerationPanelProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<FlaggedMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'reviewed'>('flagged');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_reported'>('newest');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, [filter, sortBy]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      // Mock data - would be replaced with actual API call
      const mockMessages: FlaggedMessage[] = [
        {
          id: '1',
          conversationId: 'conv1',
          senderId: 'user1',
          senderName: 'John Doe',
          recipientId: 'user2',
          recipientName: 'Jane Smith',
          content: 'This message contains inappropriate language and harassment...',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'flagged',
          reports: [
            {
              id: 'r1',
              reporterId: 'user2',
              reporterName: 'Jane Smith',
              reason: 'harassment',
              description: 'This user is sending threatening messages',
              createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
            }
          ],
          context: [
            {
              id: 'c1',
              senderId: 'user2',
              senderName: 'Jane Smith',
              content: 'I disagree with your teaching approach',
              timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
              isReported: false
            },
            {
              id: 'c2',
              senderId: 'user1',
              senderName: 'John Doe',
              content: 'This message contains inappropriate language and harassment...',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              isReported: true
            }
          ]
        },
        {
          id: '2',
          conversationId: 'conv2',
          senderId: 'user3',
          senderName: 'Bob Wilson',
          recipientId: 'user4',
          recipientName: 'Alice Brown',
          content: 'Spam message with promotional content...',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'flagged',
          reports: [
            {
              id: 'r2',
              reporterId: 'user4',
              reporterName: 'Alice Brown',
              reason: 'spam',
              description: 'This user is sending unsolicited promotional messages',
              createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
            }
          ],
          context: [
            {
              id: 'c3',
              senderId: 'user3',
              senderName: 'Bob Wilson',
              content: 'Spam message with promotional content...',
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              isReported: true
            }
          ]
        }
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationAction = async (
    messageId: string, 
    action: 'approve' | 'hide' | 'delete' | 'warn_user',
    reason?: string
  ) => {
    try {
      setActionLoading(messageId);
      // Mock API call - would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessages(prev => prev.map(message => 
        message.id === messageId 
          ? { 
              ...message, 
              status: action === 'approve' ? 'reviewed' : action === 'hide' ? 'hidden' : action === 'delete' ? 'deleted' : message.status
            }
          : message
      ));
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => prev ? {
          ...prev,
          status: action === 'approve' ? 'reviewed' : action === 'hide' ? 'hidden' : action === 'delete' ? 'deleted' : prev.status
        } : null);
      }
    } catch (error) {
      console.error('Failed to perform moderation action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reviewed':
        return 'text-green-600 bg-green-100';
      case 'flagged':
        return 'text-red-600 bg-red-100';
      case 'hidden':
        return 'text-yellow-600 bg-yellow-100';
      case 'deleted':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'harassment':
        return 'text-red-600 bg-red-100';
      case 'spam':
        return 'text-orange-600 bg-orange-100';
      case 'inappropriate':
        return 'text-purple-600 bg-purple-100';
      case 'threat':
        return 'text-red-800 bg-red-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredMessages = messages.filter(message => {
    if (filter === 'flagged') return message.status === 'flagged';
    if (filter === 'reviewed') return message.status === 'reviewed';
    return true;
  });

  const sortedMessages = [...filteredMessages].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'most_reported':
        return b.reports.length - a.reports.length;
      default: // newest
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Message Moderation</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-xl">×</span>
            </button>
          )}
        </div>
        
        {/* Filters and Controls */}
        <div className="flex items-center space-x-4 mt-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'flagged' | 'reviewed')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Messages</option>
            <option value="flagged">Flagged Messages</option>
            <option value="reviewed">Reviewed Messages</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'most_reported')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_reported">Most Reported</option>
          </select>
          
          <button
            onClick={fetchMessages}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Messages List */}
        <div className="w-1/2 border-r overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading messages...</p>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No messages found for the selected filter
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {sortedMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedMessage?.id === message.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {message.senderName} → {message.recipientName}
                      </h3>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(message.status)}`}>
                      {message.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{message.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(message.timestamp).toLocaleString()}</span>
                    <div className="flex items-center space-x-2">
                      {message.reports.length > 0 && (
                        <span className="text-red-600">🚩 {message.reports.length}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Details */}
        <div className="w-1/2 overflow-y-auto">
          {selectedMessage ? (
            <div className="p-6">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Message Details</h3>
                  <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(selectedMessage.status)}`}>
                    {selectedMessage.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  <p>From: {selectedMessage.senderName}</p>
                  <p>To: {selectedMessage.recipientName}</p>
                  <p>Sent: {new Date(selectedMessage.timestamp).toLocaleString()}</p>
                  <p>Conversation ID: {selectedMessage.conversationId}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Message Content</h4>
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-red-400">
                  <p className="text-gray-700">{selectedMessage.content}</p>
                </div>
              </div>

              {selectedMessage.context.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Conversation Context</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedMessage.context.map((contextMessage) => (
                      <div 
                        key={contextMessage.id} 
                        className={`p-3 rounded-lg ${
                          contextMessage.isReported 
                            ? 'bg-red-50 border-l-4 border-red-400' 
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm text-gray-900">
                            {contextMessage.senderName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(contextMessage.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{contextMessage.content}</p>
                        {contextMessage.isReported && (
                          <span className="text-xs text-red-600 mt-1 block">⚠️ Reported message</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMessage.reports.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Reports ({selectedMessage.reports.length})</h4>
                  <div className="space-y-3">
                    {selectedMessage.reports.map((report) => (
                      <div key={report.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900">{report.reporterName}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getReasonColor(report.reason)}`}>
                            {report.reason}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation Actions */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Moderation Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleModerationAction(selectedMessage.id, 'approve')}
                    disabled={actionLoading === selectedMessage.id}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === selectedMessage.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedMessage.id, 'hide')}
                    disabled={actionLoading === selectedMessage.id}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Hide
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedMessage.id, 'delete')}
                    disabled={actionLoading === selectedMessage.id}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleModerationAction(selectedMessage.id, 'warn_user')}
                    disabled={actionLoading === selectedMessage.id}
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    Warn User
                  </button>
                </div>
                <div className="mt-3">
                  <textarea
                    placeholder="Add moderation notes (optional)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Select a message to view details and moderation options
            </div>
          )}
        </div>
      </div>
    </div>
  );
};