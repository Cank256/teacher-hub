import { useState, useEffect, useCallback } from 'react';

export interface BandwidthInfo {
  downlink: number; // Mbps
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  rtt: number; // Round trip time in ms
  saveData: boolean;
  isSlowConnection: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

export interface AdaptiveSettings {
  imageQuality: 'high' | 'medium' | 'low';
  enableLazyLoading: boolean;
  prefetchContent: boolean;
  maxConcurrentRequests: number;
  chunkSize: number;
}

export const useBandwidthDetection = () => {
  const [bandwidthInfo, setBandwidthInfo] = useState<BandwidthInfo>({
    downlink: 0,
    effectiveType: 'unknown',
    rtt: 0,
    saveData: false,
    isSlowConnection: false,
    connectionQuality: 'unknown'
  });

  const [adaptiveSettings, setAdaptiveSettings] = useState<AdaptiveSettings>({
    imageQuality: 'medium',
    enableLazyLoading: true,
    prefetchContent: true,
    maxConcurrentRequests: 6,
    chunkSize: 20
  });

  const updateBandwidthInfo = useCallback(() => {
    let info: BandwidthInfo = {
      downlink: 0,
      effectiveType: 'unknown',
      rtt: 0,
      saveData: false,
      isSlowConnection: false,
      connectionQuality: 'unknown'
    };

    // Check for Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        info.downlink = connection.downlink || 0;
        info.effectiveType = connection.effectiveType || 'unknown';
        info.rtt = connection.rtt || 0;
        info.saveData = connection.saveData || false;
      }
    }

    // Check for Save-Data header support
    if ('connection' in navigator && (navigator as any).connection?.saveData) {
      info.saveData = true;
    }

    // Determine if connection is slow
    info.isSlowConnection = 
      info.effectiveType === 'slow-2g' ||
      info.effectiveType === '2g' ||
      info.downlink < 1.5 ||
      info.saveData;

    // Determine connection quality
    if (info.downlink >= 10 && info.rtt < 100) {
      info.connectionQuality = 'excellent';
    } else if (info.downlink >= 5 && info.rtt < 200) {
      info.connectionQuality = 'good';
    } else if (info.downlink >= 1.5 && info.rtt < 500) {
      info.connectionQuality = 'fair';
    } else if (info.downlink > 0) {
      info.connectionQuality = 'poor';
    }

    setBandwidthInfo(info);
  }, []);

  const updateAdaptiveSettings = useCallback((info: BandwidthInfo) => {
    const settings: AdaptiveSettings = {
      imageQuality: 'medium',
      enableLazyLoading: true,
      prefetchContent: true,
      maxConcurrentRequests: 6,
      chunkSize: 20
    };

    switch (info.connectionQuality) {
      case 'excellent':
        settings.imageQuality = 'high';
        settings.prefetchContent = true;
        settings.maxConcurrentRequests = 8;
        settings.chunkSize = 50;
        break;
      
      case 'good':
        settings.imageQuality = 'medium';
        settings.prefetchContent = true;
        settings.maxConcurrentRequests = 6;
        settings.chunkSize = 30;
        break;
      
      case 'fair':
        settings.imageQuality = 'medium';
        settings.prefetchContent = false;
        settings.maxConcurrentRequests = 4;
        settings.chunkSize = 20;
        break;
      
      case 'poor':
        settings.imageQuality = 'low';
        settings.prefetchContent = false;
        settings.maxConcurrentRequests = 2;
        settings.chunkSize = 10;
        break;
      
      default:
        // Conservative defaults for unknown connections
        settings.imageQuality = 'medium';
        settings.prefetchContent = false;
        settings.maxConcurrentRequests = 4;
        settings.chunkSize = 15;
    }

    // Override for save-data preference
    if (info.saveData) {
      settings.imageQuality = 'low';
      settings.prefetchContent = false;
      settings.maxConcurrentRequests = 2;
      settings.chunkSize = 10;
    }

    setAdaptiveSettings(settings);
  }, []);

  useEffect(() => {
    // Initial detection
    updateBandwidthInfo();

    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', updateBandwidthInfo);
        
        return () => {
          connection.removeEventListener('change', updateBandwidthInfo);
        };
      }
    }
  }, [updateBandwidthInfo]);

  useEffect(() => {
    updateAdaptiveSettings(bandwidthInfo);
  }, [bandwidthInfo, updateAdaptiveSettings]);

  // Manual speed test
  const performSpeedTest = useCallback(async (): Promise<number> => {
    try {
      const testUrl = '/api/speed-test'; // Small test endpoint
      const startTime = performance.now();
      
      const response = await fetch(testUrl, {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error('Speed test failed');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const contentLength = parseInt(response.headers.get('content-length') || '0');
      
      // Calculate speed in Mbps
      const speedMbps = (contentLength * 8) / (duration * 1000);
      
      return speedMbps;
    } catch (error) {
      console.warn('Speed test failed:', error);
      return 0;
    }
  }, []);

  return {
    bandwidthInfo,
    adaptiveSettings,
    performSpeedTest,
    updateBandwidthInfo
  };
};

// Hook for adaptive content loading
export const useAdaptiveLoading = () => {
  const { bandwidthInfo, adaptiveSettings } = useBandwidthDetection();

  const getImageQuality = useCallback((originalUrl: string): string => {
    const quality = adaptiveSettings.imageQuality;
    
    // Modify URL based on quality setting
    if (originalUrl.includes('_original')) {
      switch (quality) {
        case 'low':
          return originalUrl.replace('_original', '_small');
        case 'medium':
          return originalUrl.replace('_original', '_medium');
        case 'high':
        default:
          return originalUrl;
      }
    }
    
    return originalUrl;
  }, [adaptiveSettings.imageQuality]);

  const shouldPrefetch = useCallback((): boolean => {
    return adaptiveSettings.prefetchContent && !bandwidthInfo.saveData;
  }, [adaptiveSettings.prefetchContent, bandwidthInfo.saveData]);

  const getChunkSize = useCallback((): number => {
    return adaptiveSettings.chunkSize;
  }, [adaptiveSettings.chunkSize]);

  const getMaxConcurrentRequests = useCallback((): number => {
    return adaptiveSettings.maxConcurrentRequests;
  }, [adaptiveSettings.maxConcurrentRequests]);

  return {
    getImageQuality,
    shouldPrefetch,
    getChunkSize,
    getMaxConcurrentRequests,
    isSlowConnection: bandwidthInfo.isSlowConnection,
    connectionQuality: bandwidthInfo.connectionQuality
  };
};