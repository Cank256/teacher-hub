import { ApiClient } from './apiClient';
import type {
  Conversation,
  Message,
  CreateConversationRequest,
  SendMessageRequest,
  ConversationFilters,
  MessageFilters,
  UserSearchFilters,
  PaginatedResponse,
  User,
} from '@/types/messaging';

export class MessagingService {
  private static apiClient = ApiClient.getInstance();

  // Conversations
  static async getConversations(filters?: ConversationFilters): Promise<Conversation[]> {
    const params: Record<string, string> = {};
    
    if (filters?.search) {
      params.search = filters.search;
    }
    if (filters?.unreadOnly) {
      params.unreadOnly = 'true';
    }

    const response = await this.apiClient.get('/conversations', params);
    return response.data.data;
  }

  static async getConversation(conversationId: string): Promise<Conversation> {
    const response = await this.apiClient.get(`/conversations/${conversationId}`);
    return response.data.data;
  }

  static async createConversation(request: CreateConversationRequest): Promise<Conversation> {
    const response = await this.apiClient.post('/conversations', request);
    return response.data.data;
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    await this.apiClient.delete(`/conversations/${conversationId}`);
  }

  // Messages
  static async getMessages(filters: MessageFilters): Promise<PaginatedResponse<Message>> {
    const params: Record<string, string> = {
      conversationId: filters.conversationId,
    };
    
    if (filters.before) {
      params.before = filters.before.toISOString();
    }
    if (filters.limit) {
      params.limit = filters.limit.toString();
    }

    const response = await this.apiClient.get('/messages', params);
    return response.data;
  }

  static async sendMessage(request: SendMessageRequest): Promise<Message> {
    const formData = new FormData();
    formData.append('conversationId', request.conversationId);
    formData.append('content', request.content);
    formData.append('type', request.type);
    
    if (request.replyTo) {
      formData.append('replyTo', request.replyTo);
    }

    if (request.attachments && request.attachments.length > 0) {
      request.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file as any);
      });
    }

    const response = await this.apiClient.uploadFile('/messages', formData);
    return response.data.data;
  }

  static async editMessage(messageId: string, content: string): Promise<Message> {
    const response = await this.apiClient.put(`/messages/${messageId}`, { content });
    return response.data.data;
  }

  static async deleteMessage(messageId: string): Promise<void> {
    await this.apiClient.delete(`/messages/${messageId}`);
  }

  static async markMessageAsRead(messageId: string): Promise<void> {
    await this.apiClient.post(`/messages/${messageId}/read`);
  }

  static async markConversationAsRead(conversationId: string): Promise<void> {
    await this.apiClient.post(`/conversations/${conversationId}/read`);
  }

  // User search
  static async searchUsers(filters: UserSearchFilters): Promise<User[]> {
    const params: Record<string, any> = {
      query: filters.query,
    };
    
    if (filters.subjects && filters.subjects.length > 0) {
      params['subjects[]'] = filters.subjects;
    }
    
    if (filters.location) {
      params.location = filters.location;
    }
    
    if (filters.excludeIds && filters.excludeIds.length > 0) {
      params['excludeIds[]'] = filters.excludeIds;
    }

    const response = await this.apiClient.get('/users/search', params);
    return response.data.data;
  }

  // Conversation participants
  static async addParticipant(conversationId: string, userId: string): Promise<void> {
    await this.apiClient.post(`/conversations/${conversationId}/participants`, { userId });
  }

  static async removeParticipant(conversationId: string, userId: string): Promise<void> {
    await this.apiClient.delete(`/conversations/${conversationId}/participants/${userId}`);
  }

  static async leaveConversation(conversationId: string): Promise<void> {
    await this.apiClient.post(`/conversations/${conversationId}/leave`);
  }

  // Message reactions (future feature)
  static async addReaction(messageId: string, emoji: string): Promise<void> {
    await this.apiClient.post(`/messages/${messageId}/reactions`, { emoji });
  }

  static async removeReaction(messageId: string, emoji: string): Promise<void> {
    await this.apiClient.delete(`/messages/${messageId}/reactions/${emoji}`);
  }
}