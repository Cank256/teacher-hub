export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  name?: string; // For group conversations
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  isRead: boolean;
  deliveryStatus: DeliveryStatus;
  replyTo?: string; // ID of message being replied to
  attachments?: MessageAttachment[];
  editedAt?: Date;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  DOCUMENT = 'document',
  SYSTEM = 'system'
}

export enum DeliveryStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'document';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ConversationFilters {
  search?: string;
  unreadOnly?: boolean;
}

export interface MessageFilters {
  conversationId: string;
  before?: Date;
  limit?: number;
}

export interface CreateConversationRequest {
  participantIds: string[];
  isGroup?: boolean;
  name?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  type: MessageType;
  replyTo?: string;
  attachments?: File[];
}

export interface UserSearchFilters {
  query: string;
  subjects?: string[];
  location?: string;
  excludeIds?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Socket.IO event types
export interface SocketEvents {
  // Incoming events
  'message:new': (message: Message) => void;
  'message:read': (data: { messageId: string; userId: string }) => void;
  'typing:start': (data: TypingIndicator) => void;
  'typing:stop': (data: TypingIndicator) => void;
  'conversation:updated': (conversation: Conversation) => void;
  'user:online': (data: { userId: string; isOnline: boolean }) => void;
  
  // Outgoing events
  'join:conversation': (conversationId: string) => void;
  'leave:conversation': (conversationId: string) => void;
  'typing:start': (conversationId: string) => void;
  'typing:stop': (conversationId: string) => void;
  'message:read': (messageId: string) => void;
}

// Offline queue types
export interface OfflineMessage {
  id: string;
  conversationId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  retryCount: number;
  attachments?: File[];
}

export interface MessageSyncStatus {
  pendingMessages: number;
  lastSyncTime: Date;
  isOnline: boolean;
  syncInProgress: boolean;
}