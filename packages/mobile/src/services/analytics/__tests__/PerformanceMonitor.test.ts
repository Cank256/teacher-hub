import { jest } from '@jest/globals';
import PerformanceMonitor from '../PerformanceMonitor';
import { PERFORMANCE_THRESHOLDS } from '../types';

// Mock dependencies
jest.mock('react-native-device-info');
jest.mock('../AnalyticsService');

const mockDeviceInfo = {
  getUsedMemory: jest.fn(() => Promise.resolve(100 * 1024 * 1024)),
  getTotalMemory: jest.fn(() => Promise.resolve(1024 * 1024 * 1024)),
  getUniqueId: jest.fn(() => Promise.resolve('test-device-id')),
};

const mockAnalyticsService = {
  trackPerformance: jest.fn(),
  trackEvent: jest.fn(),
};

jest.mock('react-native-device-info', () => mockDeviceInfo);
jest.mock('../AnalyticsService', () => mockAnalyticsService);

// Mock global functions
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16); // Simulate 60fps
  return 1;
});

global.performance = {
  now: jest.fn(() => Date.now()),
} as any;

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    PerformanceMonitor.stopMonitoring();
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring', () => {
      expect(() => PerformanceMonitor.startMonitoring()).not.toThrow();
    });

    it('should stop monitoring', () => {
      PerformanceMonitor.startMonitoring();
      expect(() => PerformanceMonitor.stopMonitoring()).not.toThrow();
    });

    it('should not start monitoring twice', () => {
      PerformanceMonitor.startMonitoring();
      PerformanceMonitor.startMonitoring();
      
      // Should not throw or cause issues
      expect(() => PerformanceMonitor.stopMonitoring()).not.toThrow();
    });
  });

  describe('TTI measurement', () => {
    it('should measure time to interactive', () => {
      const screenName = 'TestScreen';
      const endTTI = PerformanceMonitor.measureTTI(screenName);
      
      // Simulate some time passing
      jest.advanceTimersByTime(500);
      
      endTTI();
      
      expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith({
        metric_name: 'time_to_interactive',
        value: expect.any(Number),
        unit: 'milliseconds',
        screen: screenName,
      });
    });

    it('should report slow TTI', () => {
      const screenName = 'SlowScreen';
      const endTTI = PerformanceMonitor.measureTTI(screenName);
      
      // Simulate slow TTI
      jest.advanceTimersByTime(PERFORMANCE_THRESHOLDS.SCREEN_LOAD_TIME + 500);
      
      endTTI();
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('slow_operation', {
        type: 'slow_tti',
        screen: screenName,
        duration: expect.any(Number),
        threshold: PERFORMANCE_THRESHOLDS.SCREEN_LOAD_TIME,
      });
    });
  });

  describe('cold start measurement', () => {
    it('should measure cold start time', () => {
      PerformanceMonitor.measureColdStart();
      
      // Simulate InteractionManager callback
      jest.advanceTimersByTime(100);
      
      expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith({
        metric_name: 'cold_start_time',
        value: expect.any(Number),
        unit: 'milliseconds',
      });
    });
  });

  describe('API call measurement', () => {
    it('should measure API response time', () => {
      const endpoint = '/api/posts';
      const endMeasurement = PerformanceMonitor.measureAPICall(endpoint);
      
      jest.advanceTimersByTime(200);
      
      endMeasurement();
      
      expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith({
        metric_name: 'api_response_time',
        value: expect.any(Number),
        unit: 'milliseconds',
        context: { endpoint },
      });
    });

    it('should report slow API calls', () => {
      const endpoint = '/api/slow-endpoint';
      const endMeasurement = PerformanceMonitor.measureAPICall(endpoint);
      
      // Simulate slow API call
      jest.advanceTimersByTime(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME + 1000);
      
      endMeasurement();
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('slow_operation', {
        type: 'slow_api_call',
        endpoint,
        duration: expect.any(Number),
        threshold: PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME,
      });
    });
  });

  describe('screen render measurement', () => {
    it('should measure screen render time', () => {
      const screenName = 'TestScreen';
      const endMeasurement = PerformanceMonitor.measureScreenRender(screenName);
      
      jest.advanceTimersByTime(50);
      
      endMeasurement();
      
      expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith({
        metric_name: 'screen_render_time',
        value: expect.any(Number),
        unit: 'milliseconds',
        screen: screenName,
      });
    });
  });

  describe('memory monitoring', () => {
    it('should monitor memory usage', async () => {
      PerformanceMonitor.startMonitoring();
      
      // Advance timers to trigger memory monitoring
      jest.advanceTimersByTime(30000);
      
      // Wait for async operations
      await jest.runAllTimersAsync();
      
      expect(mockDeviceInfo.getUsedMemory).toHaveBeenCalled();
      expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith({
        metric_name: 'memory_usage',
        value: expect.any(Number),
        unit: 'bytes',
        context: expect.objectContaining({
          percentage: expect.any(Number),
          available: expect.any(Number),
          total: expect.any(Number),
        }),
      });
    });

    it('should report memory warnings', async () => {
      // Mock high memory usage
      mockDeviceInfo.getUsedMemory.mockResolvedValue(PERFORMANCE_THRESHOLDS.MEMORY_USAGE + 1000);
      
      PerformanceMonitor.startMonitoring();
      
      jest.advanceTimersByTime(30000);
      await jest.runAllTimersAsync();
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('memory_warning', {
        used_memory: expect.any(Number),
        memory_percentage: expect.any(Number),
        threshold: expect.any(Number),
      });
    });
  });

  describe('frame rate monitoring', () => {
    it('should monitor frame rate', () => {
      PerformanceMonitor.startMonitoring();
      
      // Simulate frame rate monitoring
      jest.advanceTimersByTime(1000);
      
      expect(mockAnalyticsService.trackPerformance).toHaveBeenCalledWith({
        metric_name: 'frame_rate',
        value: expect.any(Number),
        unit: 'fps',
      });
    });

    it('should report low frame rate', () => {
      PerformanceMonitor.startMonitoring();
      
      // Mock low frame rate by advancing time slowly
      for (let i = 0; i < 30; i++) { // Simulate 30 FPS
        jest.advanceTimersByTime(33); // ~30fps timing
      }
      jest.advanceTimersByTime(1000);
      
      expect(mockAnalyticsService.trackEvent).toHaveBeenCalledWith('slow_operation', {
        type: 'low_frame_rate',
        fps: expect.any(Number),
        threshold: PERFORMANCE_THRESHOLDS.FRAME_RATE,
      });
    });
  });

  describe('performance summary', () => {
    it('should provide performance summary', () => {
      const summary = PerformanceMonitor.getPerformanceSummary();
      
      expect(summary).toEqual({
        isMonitoring: expect.any(Boolean),
        activeEntries: expect.any(Number),
        averageFrameRate: expect.any(Number),
        memoryThreshold: expect.any(Number),
        platform: expect.any(String),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('configuration', () => {
    it('should set custom memory warning threshold', () => {
      const customThreshold = 500 * 1024 * 1024; // 500MB
      
      PerformanceMonitor.setMemoryWarningThreshold(customThreshold);
      
      const summary = PerformanceMonitor.getPerformanceSummary();
      expect(summary.memoryThreshold).toBe(customThreshold);
    });

    it('should clear performance data', () => {
      // Create some performance entries
      const endTTI = PerformanceMonitor.measureTTI('TestScreen');
      endTTI();
      
      PerformanceMonitor.clearPerformanceData();
      
      const summary = PerformanceMonitor.getPerformanceSummary();
      expect(summary.activeEntries).toBe(0);
      expect(summary.averageFrameRate).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle memory info errors gracefully', async () => {
      mockDeviceInfo.getUsedMemory.mockRejectedValue(new Error('Memory info unavailable'));
      
      PerformanceMonitor.startMonitoring();
      
      jest.advanceTimersByTime(30000);
      await jest.runAllTimersAsync();
      
      // Should not crash and should continue monitoring
      expect(() => PerformanceMonitor.getPerformanceSummary()).not.toThrow();
    });
  });
});