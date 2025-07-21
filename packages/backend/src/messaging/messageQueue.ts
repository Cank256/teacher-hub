import Redis from 'redis';
import { Message } from '../types';
import logger from '../utils/logger';

export class MessageQueue {
  private redis: Redis.RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.redis.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.redis.on('connect', () => {
      logger.info('Redis Client Connected');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      logger.info('Redis Client Ready');
      this.isConnected = true;
    });

    this.redis.on('end', () => {
      logger.info('Redis Client Disconnected');
      this.isConnected = false;
    });

    this.connect();
  }

  private async connect() {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      // Retry connection after 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  async queueMessage(message: Message): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot queue message');
      return;
    }

    try {
      const recipientId = message.recipientId;
      if (!recipientId) {
        logger.warn('Cannot queue message without recipient ID');
        return;
      }

      const queueKey = `message_queue:${recipientId}`;
      const messageData = JSON.stringify({
        ...message,
        queuedAt: new Date().toISOString()
      });

      await this.redis.lPush(queueKey, messageData);
      
      // Set expiration for the queue (7 days)
      await this.redis.expire(queueKey, 7 * 24 * 60 * 60);

      logger.info(`Message queued for user ${recipientId}: ${message.id}`);
    } catch (error) {
      logger.error('Error queuing message:', error);
    }
  }

  async getQueuedMessages(userId: string): Promise<Message[]> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot get queued messages');
      return [];
    }

    try {
      const queueKey = `message_queue:${userId}`;
      const messageStrings = await this.redis.lRange(queueKey, 0, -1);
      
      const messages: Message[] = messageStrings.map(messageString => {
        const messageData = JSON.parse(messageString);
        // Remove queuedAt field as it's not part of Message interface
        const { queuedAt, ...message } = messageData;
        return message;
      });

      logger.info(`Retrieved ${messages.length} queued messages for user ${userId}`);
      return messages;
    } catch (error) {
      logger.error('Error getting queued messages:', error);
      return [];
    }
  }

  async clearQueuedMessages(userId: string): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot clear queued messages');
      return;
    }

    try {
      const queueKey = `message_queue:${userId}`;
      await this.redis.del(queueKey);
      
      logger.info(`Cleared queued messages for user ${userId}`);
    } catch (error) {
      logger.error('Error clearing queued messages:', error);
    }
  }

  async getQueuedMessageCount(userId: string): Promise<number> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot get queued message count');
      return 0;
    }

    try {
      const queueKey = `message_queue:${userId}`;
      const count = await this.redis.lLen(queueKey);
      
      return count;
    } catch (error) {
      logger.error('Error getting queued message count:', error);
      return 0;
    }
  }

  async queueNotification(userId: string, notification: any): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot queue notification');
      return;
    }

    try {
      const notificationKey = `notification_queue:${userId}`;
      const notificationData = JSON.stringify({
        ...notification,
        queuedAt: new Date().toISOString()
      });

      await this.redis.lPush(notificationKey, notificationData);
      
      // Set expiration for the notification queue (3 days)
      await this.redis.expire(notificationKey, 3 * 24 * 60 * 60);

      logger.info(`Notification queued for user ${userId}`);
    } catch (error) {
      logger.error('Error queuing notification:', error);
    }
  }

  async getQueuedNotifications(userId: string): Promise<any[]> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot get queued notifications');
      return [];
    }

    try {
      const notificationKey = `notification_queue:${userId}`;
      const notificationStrings = await this.redis.lRange(notificationKey, 0, -1);
      
      const notifications = notificationStrings.map(notificationString => {
        return JSON.parse(notificationString);
      });

      logger.info(`Retrieved ${notifications.length} queued notifications for user ${userId}`);
      return notifications;
    } catch (error) {
      logger.error('Error getting queued notifications:', error);
      return [];
    }
  }

  async clearQueuedNotifications(userId: string): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot clear queued notifications');
      return;
    }

    try {
      const notificationKey = `notification_queue:${userId}`;
      await this.redis.del(notificationKey);
      
      logger.info(`Cleared queued notifications for user ${userId}`);
    } catch (error) {
      logger.error('Error clearing queued notifications:', error);
    }
  }

  async setUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot set user online status');
      return;
    }

    try {
      const statusKey = `user_status:${userId}`;
      const statusData = {
        isOnline,
        lastSeen: new Date().toISOString()
      };

      await this.redis.setEx(statusKey, 300, JSON.stringify(statusData)); // 5 minutes expiration
      
      logger.info(`User ${userId} status set to ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      logger.error('Error setting user online status:', error);
    }
  }

  async getUserOnlineStatus(userId: string): Promise<{ isOnline: boolean; lastSeen: string } | null> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot get user online status');
      return null;
    }

    try {
      const statusKey = `user_status:${userId}`;
      const statusString = await this.redis.get(statusKey);
      
      if (!statusString) {
        return { isOnline: false, lastSeen: new Date().toISOString() };
      }

      return JSON.parse(statusString);
    } catch (error) {
      logger.error('Error getting user online status:', error);
      return null;
    }
  }

  async cleanup(): Promise<void> {
    if (this.isConnected) {
      await this.redis.quit();
    }
  }
}