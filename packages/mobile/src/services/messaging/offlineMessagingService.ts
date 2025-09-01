import { MMKV } from 'react-native-mmkv';
import NetInfo from '@react-native-community/netinfo';
import { MessagingService } from '@/services/api/messagingService';
import type { 
  OfflineMessage, 
  MessageSyncStatus, 
  SendMessageRequest,
  Message,
  MessageType 
} from '@/types/messaging';

class OfflineMessagingService {
  private storage = new MMKV({ id: 'offline-messages' });
  private syncInProgress = false;
  private listeners: Set<(status: MessageSyncStatus) => void> = new Set();

  constructor() {
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.syncInProgress) {
        this.syncPendingMessages();
      }
    });
  }

  // Queue message for offline sending
  async queueMessage(request: SendMessageRequest): Promise<OfflineMessage> {
    const offlineMessage: OfflineMessage = {
      id: this.generateId(),
      conversationId: request.conversationId,
      content: request.content,
      type: request.type,
      timestamp: new Date(),
      retryCount: 0,
      attachments: request.attachments,
    };

    const pendingMessages = this.getPendingMessages();
    pendingMessages.push(offlineMessage);
    this.storage.set('pending-messages', JSON.stringify(pendingMessages));

    this.notifyStatusChange();
    return offlineMessage;
  }

  // Get all pending messages
  getPendingMessages(): OfflineMessage[] {
    try {
      const stored = this.storage.getString('pending-messages');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting pending messages:', error);
      return [];
    }
  }

  // Remove message from queue
  private removeFromQueue(messageId: string): void {
    const pendingMessages = this.getPendingMessages();
    const filtered = pendingMessages.filter(msg => msg.id !== messageId);
    this.storage.set('pending-messages', JSON.stringify(filtered));
  }

  // Sync pending messages when online
  async syncPendingMessages(): Promise<void> {
    if (this.syncInProgress) return;

    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) return;

    this.syncInProgress = true;
    this.notifyStatusChange();

    const pendingMessages = this.getPendingMessages();
    const maxRetries = 3;

    for (const offlineMessage of pendingMessages) {
      try {
        if (offlineMessage.retryCount >= maxRetries) {
          console.warn(`Message ${offlineMessage.id} exceeded max retries, removing from queue`);
          this.removeFromQueue(offlineMessage.id);
          continue;
        }

        const sendRequest: SendMessageRequest = {
          conversationId: offlineMessage.conversationId,
          content: offlineMessage.content,
          type: offlineMessage.type,
          attachments: offlineMessage.attachments,
        };

        await MessagingService.sendMessage(sendRequest);
        this.removeFromQueue(offlineMessage.id);
        
        console.log(`Successfully synced message ${offlineMessage.id}`);
      } catch (error) {
        console.error(`Failed to sync message ${offlineMessage.id}:`, error);
        
        // Increment retry count
        offlineMessage.retryCount++;
        const pendingMessages = this.getPendingMessages();
        const index = pendingMessages.findIndex(msg => msg.id === offlineMessage.id);
        if (index !== -1) {
          pendingMessages[index] = offlineMessage;
          this.storage.set('pending-messages', JSON.stringify(pendingMessages));
        }
      }
    }

    this.syncInProgress = false;
    this.notifyStatusChange();
  }

  // Get sync status
  async getSyncStatus(): Promise<MessageSyncStatus> {
    const networkState = await NetInfo.fetch();
    const pendingMessages = this.getPendingMessages();
    const lastSyncTime = this.getLastSyncTime();

    return {
      pendingMessages: pendingMessages.length,
      lastSyncTime,
      isOnline: networkState.isConnected || false,
      syncInProgress: this.syncInProgress,
    };
  }

  private getLastSyncTime(): Date {
    const stored = this.storage.getString('last-sync-time');
    return stored ? new Date(stored) : new Date(0);
  }

  private setLastSyncTime(): void {
    this.storage.set('last-sync-time', new Date().toISOString());
  }

  // Status change notifications
  onStatusChange(callback: (status: MessageSyncStatus) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  private async notifyStatusChange(): Promise<void> {
    const status = await this.getSyncStatus();
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in sync status callback:', error);
      }
    });
  }

  // Clear all pending messages (for testing or reset)
  clearPendingMessages(): void {
    this.storage.delete('pending-messages');
    this.notifyStatusChange();
  }

  // Generate unique ID for offline messages
  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Check if message is from offline queue
  isOfflineMessage(messageId: string): boolean {
    return messageId.startsWith('offline_');
  }

  // Force sync (manual trigger)
  async forcSync(): Promise<void> {
    await this.syncPendingMessages();
  }
}

export const offlineMessagingService = new OfflineMessagingService();