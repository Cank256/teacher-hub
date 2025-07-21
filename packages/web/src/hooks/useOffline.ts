import { useState, useEffect } from 'react';
import { offlineQueue } from '../services/offlineQueue';

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedActionsCount, setQueuedActionsCount] = useState(0);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Process queued actions when coming back online
      try {
        await offlineQueue.processQueue();
        updateQueuedActionsCount();
      } catch (error) {
        console.error('Error processing offline queue:', error);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize queue and get count
    initializeQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const initializeQueue = async () => {
    try {
      await offlineQueue.init();
      await updateQueuedActionsCount();
    } catch (error) {
      console.error('Error initializing offline queue:', error);
    }
  };

  const updateQueuedActionsCount = async () => {
    try {
      const actions = await offlineQueue.getActions();
      setQueuedActionsCount(actions.length);
    } catch (error) {
      console.error('Error getting queued actions count:', error);
    }
  };

  const queueAction = async (
    url: string,
    method: string = 'POST',
    body?: any,
    headers?: Record<string, string>
  ) => {
    try {
      await offlineQueue.addAction({
        url,
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      await updateQueuedActionsCount();
    } catch (error) {
      console.error('Error queuing action:', error);
      throw error;
    }
  };

  const clearQueue = async () => {
    try {
      await offlineQueue.clearQueue();
      setQueuedActionsCount(0);
    } catch (error) {
      console.error('Error clearing queue:', error);
    }
  };

  return {
    isOnline,
    queuedActionsCount,
    queueAction,
    clearQueue
  };
};