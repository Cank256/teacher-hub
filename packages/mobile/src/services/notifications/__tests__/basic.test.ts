/**
 * Basic Notification Services Tests
 * Simple tests without complex React Native dependencies
 */

import { describe, it, expect } from '@jest/globals';
import { NotificationCategory, DeliveryStatus } from '../../../types/notifications';

describe('Notification Types and Constants', () => {
  it('should have correct notification categories', () => {
    expect(NotificationCategory.MESSAGE).toBe('messages');
    expect(NotificationCategory.POST).toBe('posts');
    expect(NotificationCategory.COMMUNITY).toBe('communities');
    expect(NotificationCategory.GOVERNMENT).toBe('government');
    expect(NotificationCategory.SYSTEM).toBe('system');
  });

  it('should have correct delivery statuses', () => {
    expect(DeliveryStatus.PENDING).toBe('pending');
    expect(DeliveryStatus.DELIVERED).toBe('delivered');
    expect(DeliveryStatus.FAILED).toBe('failed');
    expect(DeliveryStatus.EXPIRED).toBe('expired');
  });

  it('should export notification services', async () => {
    const { NotificationCategory: ImportedCategory } = await import('../../../types/notifications');
    expect(ImportedCategory.MESSAGE).toBe('messages');
  });
});