/**
 * Notification Analytics Service
 * Tracks notification delivery, engagement, and performance metrics
 */

import { Platform } from 'react-native';
import { storageService } from '../storage/storageService';
import { apiClient } from '../api/apiClient';
import { 
  NotificationAnalytics,
  NotificationEvent,
  NotificationMetrics,
  DeliveryStatus,
  NotificationCategory
} from '../../types/notifications';

export interface NotificationEventData {
  notificationId: string;
  category: NotificationCategory;
  eventType: 'received' | 'opened' | 'dismissed' | 'action_taken';
  actionId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface NotificationDeliveryData {
  notificationId: string;
  category: NotificationCategory;
  deliveryStatus: DeliveryStatus;
  deliveryTime: string;
  errorMessage?: string;
  retryCount?: number;
}

export class NotificationAnalyticsService {
  private static instance: NotificationAnalyticsService;
  private eventQueue: NotificationEventData[] = [];
  private deliveryQueue: NotificationDeliveryData[] = [];
  private isUploading = false;
  private uploadInterval: NodeJS.Timeout | null = null;

  static getInstance(): NotificationAnalyticsService {
    if (!NotificationAnalyticsService.instance) {
      NotificationAnalyticsService.instance = new NotificationAnalyticsService();
    }
    return NotificationAnalyticsService.instance;
  }

  /**
   * Initialize analytics service
   */
  async initialize(): Promise<void> {
    try {
      // Load queued events from storage
      await this.loadQueuedEvents();
      
      // Start periodic upload
      this.startPeriodicUpload();
      
      console.log('Notification analytics service initialized');
    } catch (error) {
      console.error('Failed to initialize notification analytics service:', error);
      throw error;
    }
  }

  /**
   * Track notification event
   */
  async trackEvent(eventData: NotificationEventData): Promise<void> {
    try {
      // Add to queue
      this.eventQueue.push(eventData);
      
      // Save to storage
      await this.saveQueuedEvents();
      
      // Try immediate upload if queue is getting large
      if (this.eventQueue.length >= 10) {
        this.uploadEvents().catch(error => {
          console.warn('Failed to upload events immediately:', error);
        });
      }
      
      console.log('Notification event tracked:', eventData.eventType, eventData.notificationId);
    } catch (error) {
      console.error('Failed to track notification event:', error);
    }
  }

  /**
   * Track notification delivery
   */
  async trackDelivery(deliveryData: NotificationDeliveryData): Promise<void> {
    try {
      // Add to queue
      this.deliveryQueue.push(deliveryData);
      
      // Save to storage
      await this.saveQueuedDeliveries();
      
      console.log('Notification delivery tracked:', deliveryData.deliveryStatus, deliveryData.notificationId);
    } catch (error) {
      console.error('Failed to track notification delivery:', error);
    }
  }

  /**
   * Track notification received
   */
  async trackReceived(
    notificationId: string,
    category: NotificationCategory,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      notificationId,
      category,
      eventType: 'received',
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Track notification opened
   */
  async trackOpened(
    notificationId: string,
    category: NotificationCategory,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      notificationId,
      category,
      eventType: 'opened',
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Track notification dismissed
   */
  async trackDismissed(
    notificationId: string,
    category: NotificationCategory,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      notificationId,
      category,
      eventType: 'dismissed',
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Track notification action taken
   */
  async trackActionTaken(
    notificationId: string,
    category: NotificationCategory,
    actionId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      notificationId,
      category,
      eventType: 'action_taken',
      actionId,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  /**
   * Track successful delivery
   */
  async trackDeliverySuccess(
    notificationId: string,
    category: NotificationCategory
  ): Promise<void> {
    await this.trackDelivery({
      notificationId,
      category,
      deliveryStatus: DeliveryStatus.DELIVERED,
      deliveryTime: new Date().toISOString(),
    });
  }

  /**
   * Track delivery failure
   */
  async trackDeliveryFailure(
    notificationId: string,
    category: NotificationCategory,
    errorMessage: string,
    retryCount?: number
  ): Promise<void> {
    await this.trackDelivery({
      notificationId,
      category,
      deliveryStatus: DeliveryStatus.FAILED,
      deliveryTime: new Date().toISOString(),
      errorMessage,
      retryCount,
    });
  }

  /**
   * Load queued events from storage
   */
  private async loadQueuedEvents(): Promise<void> {
    try {
      const events = await storageService.getItem<NotificationEventData[]>('queuedNotificationEvents') || [];
      const deliveries = await storageService.getItem<NotificationDeliveryData[]>('queuedNotificationDeliveries') || [];
      
      this.eventQueue = events;
      this.deliveryQueue = deliveries;
      
      console.log(`Loaded ${events.length} queued events and ${deliveries.length} queued deliveries`);
    } catch (error) {
      console.error('Failed to load queued events:', error);
    }
  }

  /**
   * Save queued events to storage
   */
  private async saveQueuedEvents(): Promise<void> {
    try {
      await storageService.setItem('queuedNotificationEvents', this.eventQueue);
    } catch (error) {
      console.error('Failed to save queued events:', error);
    }
  }

  /**
   * Save queued deliveries to storage
   */
  private async saveQueuedDeliveries(): Promise<void> {
    try {
      await storageService.setItem('queuedNotificationDeliveries', this.deliveryQueue);
    } catch (error) {
      console.error('Failed to save queued deliveries:', error);
    }
  }

  /**
   * Start periodic upload of analytics
   */
  private startPeriodicUpload(): void {
    // Upload every 5 minutes
    this.uploadInterval = setInterval(() => {
      this.uploadEvents().catch(error => {
        console.warn('Periodic upload failed:', error);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Stop periodic upload
   */
  private stopPeriodicUpload(): void {
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
  }

  /**
   * Upload events to backend
   */
  private async uploadEvents(): Promise<void> {
    if (this.isUploading || (this.eventQueue.length === 0 && this.deliveryQueue.length === 0)) {
      return;
    }

    this.isUploading = true;

    try {
      // Prepare batch data
      const batchData = {
        events: [...this.eventQueue],
        deliveries: [...this.deliveryQueue],
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      };

      // Upload to backend
      await apiClient.post('/notifications/analytics/batch', batchData);
      
      // Clear queues on successful upload
      this.eventQueue = [];
      this.deliveryQueue = [];
      
      // Update storage
      await this.saveQueuedEvents();
      await this.saveQueuedDeliveries();
      
      console.log('Notification analytics uploaded successfully');
    } catch (error) {
      console.error('Failed to upload notification analytics:', error);
      // Keep events in queue for retry
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Get local analytics metrics
   */
  async getLocalMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<NotificationMetrics> {
    try {
      // Load historical data from storage
      const historicalEvents = await storageService.getItem<NotificationEventData[]>('historicalNotificationEvents') || [];
      const allEvents = [...historicalEvents, ...this.eventQueue];
      
      // Filter by date range if provided
      const filteredEvents = allEvents.filter(event => {
        const eventDate = new Date(event.timestamp);
        if (startDate && eventDate < startDate) return false;
        if (endDate && eventDate > endDate) return false;
        return true;
      });

      // Calculate metrics
      const totalReceived = filteredEvents.filter(e => e.eventType === 'received').length;
      const totalOpened = filteredEvents.filter(e => e.eventType === 'opened').length;
      const totalDismissed = filteredEvents.filter(e => e.eventType === 'dismissed').length;
      const totalActions = filteredEvents.filter(e => e.eventType === 'action_taken').length;

      const openRate = totalReceived > 0 ? (totalOpened / totalReceived) * 100 : 0;
      const dismissalRate = totalReceived > 0 ? (totalDismissed / totalReceived) * 100 : 0;
      const actionRate = totalReceived > 0 ? (totalActions / totalReceived) * 100 : 0;

      // Category breakdown
      const categoryMetrics: Record<string, any> = {};
      Object.values(NotificationCategory).forEach(category => {
        const categoryEvents = filteredEvents.filter(e => e.category === category);
        const received = categoryEvents.filter(e => e.eventType === 'received').length;
        const opened = categoryEvents.filter(e => e.eventType === 'opened').length;
        
        categoryMetrics[category] = {
          received,
          opened,
          openRate: received > 0 ? (opened / received) * 100 : 0,
        };
      });

      return {
        totalReceived,
        totalOpened,
        totalDismissed,
        totalActions,
        openRate,
        dismissalRate,
        actionRate,
        categoryMetrics,
        dateRange: {
          start: startDate?.toISOString() || null,
          end: endDate?.toISOString() || null,
        },
      };
    } catch (error) {
      console.error('Failed to get local metrics:', error);
      throw error;
    }
  }

  /**
   * Get delivery metrics
   */
  async getDeliveryMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalAttempts: number;
    successful: number;
    failed: number;
    deliveryRate: number;
    averageRetries: number;
    errorBreakdown: Record<string, number>;
  }> {
    try {
      // Load historical delivery data
      const historicalDeliveries = await storageService.getItem<NotificationDeliveryData[]>('historicalNotificationDeliveries') || [];
      const allDeliveries = [...historicalDeliveries, ...this.deliveryQueue];
      
      // Filter by date range
      const filteredDeliveries = allDeliveries.filter(delivery => {
        const deliveryDate = new Date(delivery.deliveryTime);
        if (startDate && deliveryDate < startDate) return false;
        if (endDate && deliveryDate > endDate) return false;
        return true;
      });

      const totalAttempts = filteredDeliveries.length;
      const successful = filteredDeliveries.filter(d => d.deliveryStatus === DeliveryStatus.DELIVERED).length;
      const failed = filteredDeliveries.filter(d => d.deliveryStatus === DeliveryStatus.FAILED).length;
      
      const deliveryRate = totalAttempts > 0 ? (successful / totalAttempts) * 100 : 0;
      
      // Calculate average retries
      const retriesSum = filteredDeliveries.reduce((sum, d) => sum + (d.retryCount || 0), 0);
      const averageRetries = totalAttempts > 0 ? retriesSum / totalAttempts : 0;
      
      // Error breakdown
      const errorBreakdown: Record<string, number> = {};
      filteredDeliveries
        .filter(d => d.deliveryStatus === DeliveryStatus.FAILED && d.errorMessage)
        .forEach(d => {
          const error = d.errorMessage!;
          errorBreakdown[error] = (errorBreakdown[error] || 0) + 1;
        });

      return {
        totalAttempts,
        successful,
        failed,
        deliveryRate,
        averageRetries,
        errorBreakdown,
      };
    } catch (error) {
      console.error('Failed to get delivery metrics:', error);
      throw error;
    }
  }

  /**
   * Get engagement trends
   */
  async getEngagementTrends(days: number = 7): Promise<{
    daily: Array<{
      date: string;
      received: number;
      opened: number;
      openRate: number;
    }>;
    hourly: Array<{
      hour: number;
      received: number;
      opened: number;
      openRate: number;
    }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const metrics = await this.getLocalMetrics(startDate, endDate);
      
      // This would be implemented with more detailed data analysis
      // For now, return placeholder structure
      return {
        daily: [],
        hourly: [],
      };
    } catch (error) {
      console.error('Failed to get engagement trends:', error);
      throw error;
    }
  }

  /**
   * Clear old analytics data
   */
  async clearOldData(olderThanDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
      
      // Filter out old events
      const historicalEvents = await storageService.getItem<NotificationEventData[]>('historicalNotificationEvents') || [];
      const recentEvents = historicalEvents.filter(event => 
        new Date(event.timestamp) > cutoffDate
      );
      
      const historicalDeliveries = await storageService.getItem<NotificationDeliveryData[]>('historicalNotificationDeliveries') || [];
      const recentDeliveries = historicalDeliveries.filter(delivery => 
        new Date(delivery.deliveryTime) > cutoffDate
      );
      
      // Save filtered data
      await storageService.setItem('historicalNotificationEvents', recentEvents);
      await storageService.setItem('historicalNotificationDeliveries', recentDeliveries);
      
      console.log(`Cleared analytics data older than ${olderThanDays} days`);
    } catch (error) {
      console.error('Failed to clear old analytics data:', error);
    }
  }

  /**
   * Force upload of pending analytics
   */
  async forceUpload(): Promise<void> {
    try {
      await this.uploadEvents();
      console.log('Forced upload of notification analytics completed');
    } catch (error) {
      console.error('Failed to force upload analytics:', error);
      throw error;
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    eventQueueSize: number;
    deliveryQueueSize: number;
    isUploading: boolean;
  } {
    return {
      eventQueueSize: this.eventQueue.length,
      deliveryQueueSize: this.deliveryQueue.length,
      isUploading: this.isUploading,
    };
  }

  /**
   * Cleanup service
   */
  async cleanup(): Promise<void> {
    try {
      // Stop periodic upload
      this.stopPeriodicUpload();
      
      // Upload any remaining events
      await this.uploadEvents();
      
      console.log('Notification analytics service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup notification analytics service:', error);
    }
  }
}

export const notificationAnalyticsService = NotificationAnalyticsService.getInstance();